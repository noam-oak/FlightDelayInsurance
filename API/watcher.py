"""
Oracle Watcher - monitors PolicyPurchased events and pushes flight updates to the blockchain.

This long-lived process:
1. Discovers new policies on-chain (PolicyPurchased events)
2. Fetches the corresponding flight from the API
3. Pushes updateFlightStatus(FlightData) to the Hub when updatedAt changes
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from eth_abi import encode
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from config import (
    API_BASE_URL,
    DEPLOYMENTS_FILE,
    ORACLE_PRIVATE_KEY,
    POLL_INTERVAL_SECONDS,
    RPC_URL,
)

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("oracle-watcher")


# InsuranceHub ABI (only the parts we need)
HUB_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "policyId", "type": "uint256"},
            {"indexed": True, "name": "holder", "type": "address"},
            {"indexed": True, "name": "productId", "type": "uint32"},
            {"indexed": False, "name": "flightId", "type": "bytes32"},
            {"indexed": False, "name": "flightNumber", "type": "string"},
            {"indexed": False, "name": "arrivalTimestamp", "type": "uint64"},
            {"indexed": False, "name": "premiumWei", "type": "uint256"},
            {"indexed": False, "name": "maxPayoutWei", "type": "uint256"},
            {"indexed": False, "name": "coverageEnd", "type": "uint64"},
        ],
        "name": "PolicyPurchased",
        "type": "event",
    },
    {
        "inputs": [
            {
                "components": [
                    {"name": "flightId", "type": "bytes32"},
                    {"name": "flightNumber", "type": "string"},
                    {"name": "arrivalTimestamp", "type": "uint64"},
                    {"name": "delayInMinutes", "type": "uint32"},
                    {"name": "reasonCode", "type": "uint16"},
                    {"name": "status", "type": "uint8"},
                    {"name": "updatedAt", "type": "uint64"},
                ],
                "name": "data",
                "type": "tuple",
            }
        ],
        "name": "updateFlightStatus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "flightId", "type": "bytes32"}],
        "name": "lastUpdatedAtByFlightId",
        "outputs": [{"name": "", "type": "uint64"}],
        "stateMutability": "view",
        "type": "function",
    },
]


@dataclass
class TrackedFlight:
    """A flight being tracked for policy settlement."""

    flight_id: bytes
    flight_number: str
    arrival_timestamp: int
    coverage_end: int
    last_seen_updated_at: int = 0


class OracleWatcher:
    """Watches for PolicyPurchased events and pushes flight updates to the Hub."""

    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        # Add POA middleware for local chains
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        # Load deployment addresses
        with open(DEPLOYMENTS_FILE) as f:
            addresses = json.load(f)

        self.hub_address = Web3.to_checksum_address(addresses["hub"])
        self.hub = self.w3.eth.contract(address=self.hub_address, abi=HUB_ABI)

        # Setup oracle account
        if not ORACLE_PRIVATE_KEY:
            raise ValueError("ORACLE_PRIVATE_KEY environment variable is required")
        self.oracle_account = self.w3.eth.account.from_key(ORACLE_PRIVATE_KEY)
        logger.info(f"Oracle address: {self.oracle_account.address}")

        # Track flights with active policies
        # Key: (flightNumber, arrivalTimestamp) -> TrackedFlight
        self.tracked_flights: dict[tuple[str, int], TrackedFlight] = {}

        # Track the last processed block
        self.last_processed_block = 0

        # HTTP client for API calls
        self.http_client = httpx.AsyncClient(base_url=API_BASE_URL, timeout=10.0)

    def _compute_flight_id(self, flight_number: str, arrival_timestamp: int) -> bytes:
        """Compute flightId the same way the contract does."""
        return Web3.keccak(encode(["string", "uint64"], [flight_number, arrival_timestamp]))

    async def _fetch_flight_from_api(
        self, flight_number: str, arrival_timestamp: int
    ) -> dict | None:
        """Fetch flight data from the simulator API."""
        try:
            response = await self.http_client.get(
                f"/flights/{flight_number}/{arrival_timestamp}"
            )
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                logger.warning(f"Flight {flight_number}:{arrival_timestamp} not found in API")
                return None
            else:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Failed to fetch flight from API: {e}")
            return None

    def _discover_new_policies(self) -> None:
        """Scan for new PolicyPurchased events and track flights."""
        current_block = self.w3.eth.block_number

        if self.last_processed_block == 0:
            # On first run, look back some blocks
            self.last_processed_block = max(0, current_block - 1000)
            logger.info(f"First run - scanning from block {self.last_processed_block}")

        if current_block <= self.last_processed_block:
            logger.debug(f"No new blocks (current: {current_block}, last: {self.last_processed_block})")
            return

        logger.debug(
            f"Scanning blocks {self.last_processed_block + 1} to {current_block}"
        )

        # Get PolicyPurchased events
        try:
            events = self.hub.events.PolicyPurchased.get_logs(
                from_block=self.last_processed_block + 1, to_block=current_block
            )
            logger.debug(f"Found {len(events)} PolicyPurchased events")
        except Exception as e:
            logger.error(f"Failed to get PolicyPurchased events: {e}")
            return

        for event in events:
            flight_number = event.args.flightNumber
            arrival_timestamp = event.args.arrivalTimestamp
            flight_id = event.args.flightId
            coverage_end = event.args.coverageEnd
            policy_id = event.args.policyId
            holder = event.args.holder

            key = (flight_number, arrival_timestamp)
            if key not in self.tracked_flights:
                self.tracked_flights[key] = TrackedFlight(
                    flight_id=flight_id,
                    flight_number=flight_number,
                    arrival_timestamp=arrival_timestamp,
                    coverage_end=coverage_end,
                )
                logger.info(
                    f"✅ New policy #{policy_id} discovered!\n"
                    f"   Flight: {flight_number}\n"
                    f"   Holder: {holder}\n"
                    f"   Arrival: {arrival_timestamp}\n"
                    f"   Coverage end: {coverage_end}\n"
                    f"   FlightId: {flight_id.hex()}"
                )
            else:
                logger.debug(f"Policy #{policy_id} for already tracked flight {flight_number}")

        self.last_processed_block = current_block
        logger.debug(f"Now tracking {len(self.tracked_flights)} flights")

    async def _push_flight_update(self, flight: TrackedFlight, api_data: dict) -> bool:
        """Push a flight status update to the Hub contract."""
        try:
            flight_data = (
                flight.flight_id,
                api_data["flightNumber"],
                api_data["arrivalTimestamp"],
                api_data["delayInMinutes"],
                api_data["reasonCode"],
                api_data["status"],
                api_data["updatedAt"],
            )

            logger.debug(f"Building transaction for updateFlightStatus...")
            logger.debug(f"  FlightData: {flight_data}")

            # Build transaction
            nonce = self.w3.eth.get_transaction_count(self.oracle_account.address)
            gas_price = self.w3.eth.gas_price

            logger.debug(f"  Nonce: {nonce}, Gas price: {gas_price}")

            tx = self.hub.functions.updateFlightStatus(flight_data).build_transaction(
                {
                    "from": self.oracle_account.address,
                    "nonce": nonce,
                    "gas": 500000,
                    "gasPrice": gas_price,
                }
            )

            logger.debug(f"  Transaction built, signing...")

            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(
                tx, private_key=ORACLE_PRIVATE_KEY
            )

            logger.debug(f"  Sending transaction...")
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            logger.info(f"📤 Transaction sent: {tx_hash.hex()}")

            # Wait for receipt
            logger.debug(f"  Waiting for receipt...")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

            if receipt.status == 1:
                logger.info(
                    f"✅ Transaction successful!\n"
                    f"   TX: {tx_hash.hex()}\n"
                    f"   Gas used: {receipt.gasUsed}\n"
                    f"   Block: {receipt.blockNumber}"
                )

                # Check for PolicySettled events in the receipt
                for log in receipt.logs:
                    try:
                        # PolicySettled event topic
                        if len(log.topics) > 0:
                            topic = log.topics[0].hex()
                            # Check if this is a PolicySettled event (keccak256 of event signature)
                            if topic == "0x" + self.w3.keccak(text="PolicySettled(uint256,address,uint256,bytes32)").hex():
                                logger.info(f"💰 PAYOUT TRIGGERED! Check holder wallet for incoming ETH")
                    except Exception:
                        pass

                return True
            else:
                logger.error(
                    f"❌ Transaction FAILED!\n"
                    f"   TX: {tx_hash.hex()}\n"
                    f"   This could mean the policy was already settled or expired"
                )
                return False

        except Exception as e:
            logger.error(f"❌ Failed to push flight update: {e}", exc_info=True)
            return False

    async def _process_tracked_flights(self) -> None:
        """Check API for updates on tracked flights and push to blockchain."""
        now = int(time.time())
        expired_keys = []

        logger.debug(f"Processing {len(self.tracked_flights)} tracked flights (current time: {now})")

        for key, flight in self.tracked_flights.items():
            # Skip expired flights (coverage already ended)
            if now > flight.coverage_end:
                logger.info(
                    f"⏰ Flight {flight.flight_number} coverage expired "
                    f"(now={now} > coverage_end={flight.coverage_end})"
                )
                expired_keys.append(key)
                continue

            # Fetch from API
            logger.debug(f"Fetching API data for {flight.flight_number}:{flight.arrival_timestamp}")
            api_data = await self._fetch_flight_from_api(
                flight.flight_number, flight.arrival_timestamp
            )
            if not api_data:
                logger.warning(
                    f"❌ Flight {flight.flight_number}:{flight.arrival_timestamp} not found in API!"
                )
                continue

            api_updated_at = api_data.get("updatedAt", 0)
            api_status = api_data.get("status", 0)
            api_delay = api_data.get("delayInMinutes", 0)
            api_reason = api_data.get("reasonCode", 0)

            logger.debug(
                f"API data for {flight.flight_number}: "
                f"status={api_status}, delay={api_delay}min, reason={api_reason}, updatedAt={api_updated_at}"
            )

            # Check if API has newer data
            if api_updated_at > flight.last_seen_updated_at:
                # Check if blockchain has this update already
                chain_updated_at = self.hub.functions.lastUpdatedAtByFlightId(
                    flight.flight_id
                ).call()

                logger.debug(
                    f"Timestamp comparison for {flight.flight_number}: "
                    f"API={api_updated_at}, chain={chain_updated_at}, last_seen={flight.last_seen_updated_at}"
                )

                if api_updated_at > chain_updated_at:
                    logger.info(
                        f"🔄 Pushing update for {flight.flight_number}:\n"
                        f"   Status: {api_status} (0=Scheduled, 1=OnTime, 2=Delayed, 3=Cancelled, 4=Diverted)\n"
                        f"   Delay: {api_delay} minutes\n"
                        f"   Reason code: {api_reason}\n"
                        f"   API updatedAt: {api_updated_at}\n"
                        f"   Chain updatedAt: {chain_updated_at}"
                    )
                    success = await self._push_flight_update(flight, api_data)
                    if success:
                        flight.last_seen_updated_at = api_updated_at
                        logger.info(f"✅ Update pushed successfully for {flight.flight_number}")
                    else:
                        logger.error(f"❌ Failed to push update for {flight.flight_number}")
                else:
                    # Chain already has this update
                    logger.debug(f"Chain already has latest update for {flight.flight_number}")
                    flight.last_seen_updated_at = api_updated_at
            else:
                logger.debug(
                    f"No new updates for {flight.flight_number} "
                    f"(api={api_updated_at} <= last_seen={flight.last_seen_updated_at})"
                )

        # Remove expired flights
        for key in expired_keys:
            del self.tracked_flights[key]
            logger.info(f"🗑️ Stopped tracking expired flight: {key[0]}:{key[1]}")

    async def run(self) -> None:
        """Main loop - discover policies and push updates."""
        logger.info("=" * 60)
        logger.info("🚀 Oracle watcher starting...")
        logger.info("=" * 60)
        logger.info(f"Configuration:")
        logger.info(f"  Hub address: {self.hub_address}")
        logger.info(f"  Oracle address: {self.oracle_account.address}")
        logger.info(f"  RPC URL: {RPC_URL}")
        logger.info(f"  API base URL: {API_BASE_URL}")
        logger.info(f"  Poll interval: {POLL_INTERVAL_SECONDS}s")

        # Verify connection to blockchain
        try:
            block = self.w3.eth.block_number
            logger.info(f"  Current block: {block}")
            balance = self.w3.eth.get_balance(self.oracle_account.address)
            logger.info(f"  Oracle balance: {self.w3.from_wei(balance, 'ether')} ETH")
        except Exception as e:
            logger.error(f"❌ Failed to connect to blockchain: {e}")
            return

        # Verify connection to API
        try:
            response = await self.http_client.get("/health")
            if response.status_code == 200:
                logger.info(f"  API health: OK")
            else:
                logger.warning(f"  API health check failed: {response.status_code}")
        except Exception as e:
            logger.warning(f"  API not reachable: {e}")

        logger.info("=" * 60)
        logger.info("Watching for policies and flight updates...")
        logger.info("=" * 60)

        while True:
            try:
                # Discover new policies
                self._discover_new_policies()

                # Process tracked flights
                if self.tracked_flights:
                    await self._process_tracked_flights()
                else:
                    logger.debug("No flights to track yet")

                await asyncio.sleep(POLL_INTERVAL_SECONDS)

            except KeyboardInterrupt:
                logger.info("Shutting down...")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}", exc_info=True)
                await asyncio.sleep(POLL_INTERVAL_SECONDS)


async def main():
    watcher = OracleWatcher()
    await watcher.run()


if __name__ == "__main__":
    asyncio.run(main())
