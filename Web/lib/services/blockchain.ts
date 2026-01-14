// Service for interacting with the InsuranceHub smart contract

import { ethers, BrowserProvider, JsonRpcProvider, Contract, Signer } from "ethers"
import { config, PolicyStatus, ProductInfo } from "../config"

// InsuranceHub ABI (only the functions we need)
const HUB_ABI = [
  // Read functions
  "function getProduct(uint32 productId_) external view returns (address product, uint256 premiumWei, uint256 maxPayoutWei)",
  "function getPolicy(uint256 policyId) external view returns (tuple(uint256 policyId, address holder, uint32 productId, bytes32 flightId, string flightNumber, uint64 arrivalTimestamp, uint256 premiumPaid, uint256 maxPayout, uint64 purchasedAt, uint64 coverageEnd, uint8 status))",
  "function getPoliciesByHolder(address holder) external view returns (uint256[])",
  "function getPoliciesByFlightId(bytes32 flightId) external view returns (uint256[])",
  "function reservedWei() external view returns (uint256)",
  "function lastUpdatedAtByFlightId(bytes32 flightId) external view returns (uint64)",

  // Write functions
  "function buyPolicy(uint32 productId_, string calldata flightNumber, uint64 arrivalTimestamp) external payable",
  "function expirePolicy(uint256 policyId) external",
  "function deposit() external payable",

  // Events
  "event PolicyPurchased(uint256 indexed policyId, address indexed holder, uint32 indexed productId, bytes32 flightId, string flightNumber, uint64 arrivalTimestamp, uint256 premiumWei, uint256 maxPayoutWei, uint64 coverageEnd)",
  "event PolicySettled(uint256 indexed policyId, address indexed holder, uint256 payoutWei, bytes32 flightId)",
  "event PolicyExpired(uint256 indexed policyId, bytes32 flightId)",
  "event FlightStatusUpdated(bytes32 indexed flightId, uint8 status, uint32 delayInMinutes, uint16 reasonCode, uint64 updatedAt)",
  "event PoolFunded(address indexed from, uint256 amountWei)",
]

export interface Policy {
  policyId: bigint
  holder: string
  productId: number
  flightId: string
  flightNumber: string
  arrivalTimestamp: number
  premiumPaid: bigint
  maxPayout: bigint
  purchasedAt: number
  coverageEnd: number
  status: PolicyStatus
}

export interface PolicyPurchasedEvent {
  policyId: bigint
  holder: string
  productId: number
  flightId: string
  flightNumber: string
  arrivalTimestamp: number
  premiumWei: bigint
  maxPayoutWei: bigint
  coverageEnd: number
  txHash: string
  blockNumber: number
  timestamp?: number
}

export interface PolicySettledEvent {
  policyId: bigint
  holder: string
  payoutWei: bigint
  flightId: string
  txHash: string
  blockNumber: number
  timestamp?: number
}

export interface FlightStatusUpdatedEvent {
  flightId: string
  status: number
  delayInMinutes: number
  reasonCode: number
  updatedAt: number
  txHash: string
  blockNumber: number
  timestamp?: number
}

export interface PoolFundedEvent {
  from: string
  amountWei: bigint
  txHash: string
  blockNumber: number
  timestamp?: number
}

export type BlockchainEvent =
  | { type: "PolicyPurchased"; data: PolicyPurchasedEvent }
  | { type: "PolicySettled"; data: PolicySettledEvent }
  | { type: "FlightStatusUpdated"; data: FlightStatusUpdatedEvent }
  | { type: "PoolFunded"; data: PoolFundedEvent }

class BlockchainService {
  private provider: JsonRpcProvider | BrowserProvider | null = null
  private hubContract: Contract | null = null
  private signer: Signer | null = null

  /**
   * Initialize with JSON-RPC provider (server-side)
   */
  async initWithRpc(): Promise<void> {
    this.provider = new JsonRpcProvider(config.blockchain.rpcUrl)
    this.hubContract = new Contract(config.blockchain.contracts.hub, HUB_ABI, this.provider)
  }

  /**
   * Initialize with browser wallet (client-side)
   */
  async initWithWallet(): Promise<string> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask ou un autre wallet Web3 est requis")
    }

    this.provider = new BrowserProvider(window.ethereum)
    await window.ethereum.request({ method: "eth_requestAccounts" })

    this.signer = await this.provider.getSigner()
    this.hubContract = new Contract(config.blockchain.contracts.hub, HUB_ABI, this.signer)

    return await this.signer.getAddress()
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.signer !== null
  }

  /**
   * Get connected wallet address
   */
  async getAddress(): Promise<string | null> {
    if (!this.signer) return null
    return this.signer.getAddress()
  }

  /**
   * Ensure provider is initialized
   */
  private ensureProvider(): Contract {
    if (!this.hubContract) {
      throw new Error("Blockchain service not initialized")
    }
    return this.hubContract
  }

  /**
   * Compute flightId (same as Solidity)
   */
  computeFlightId(flightNumber: string, arrivalTimestamp: number): string {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint64"],
      [flightNumber, arrivalTimestamp]
    )
    return ethers.keccak256(encoded)
  }

  /**
   * Get product info
   */
  async getProduct(productId: number): Promise<{ address: string; premiumWei: bigint; maxPayoutWei: bigint }> {
    const hub = this.ensureProvider()
    const [address, premiumWei, maxPayoutWei] = await hub.getProduct(productId)
    return { address, premiumWei, maxPayoutWei }
  }

  /**
   * Get policy by ID
   */
  async getPolicy(policyId: number | bigint): Promise<Policy> {
    const hub = this.ensureProvider()
    const policy = await hub.getPolicy(policyId)
    return {
      policyId: policy.policyId,
      holder: policy.holder,
      productId: Number(policy.productId),
      flightId: policy.flightId,
      flightNumber: policy.flightNumber,
      arrivalTimestamp: Number(policy.arrivalTimestamp),
      premiumPaid: policy.premiumPaid,
      maxPayout: policy.maxPayout,
      purchasedAt: Number(policy.purchasedAt),
      coverageEnd: Number(policy.coverageEnd),
      status: Number(policy.status) as PolicyStatus,
    }
  }

  /**
   * Get all policies for a holder
   */
  async getPoliciesByHolder(holder: string): Promise<Policy[]> {
    const hub = this.ensureProvider()
    const policyIds: bigint[] = await hub.getPoliciesByHolder(holder)

    const policies: Policy[] = []
    for (const id of policyIds) {
      policies.push(await this.getPolicy(id))
    }
    return policies
  }

  /**
   * Buy a policy
   */
  async buyPolicy(
    productId: number,
    flightNumber: string,
    arrivalTimestamp: number
  ): Promise<{ txHash: string; policyId: bigint }> {
    if (!this.signer || !this.hubContract) {
      throw new Error("Wallet non connecté")
    }

    // Get premium for this product
    const { premiumWei } = await this.getProduct(productId)

    // Send transaction
    const tx = await this.hubContract.buyPolicy(productId, flightNumber, arrivalTimestamp, {
      value: premiumWei,
    })

    const receipt = await tx.wait()

    // Extract policyId from event
    let policyId: bigint = 0n
    for (const log of receipt.logs) {
      try {
        const parsed = this.hubContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        })
        if (parsed?.name === "PolicyPurchased") {
          policyId = parsed.args[0]
          break
        }
      } catch {
        // Not our event
      }
    }

    return { txHash: receipt.hash, policyId }
  }

  /**
   * Get hub contract balance
   */
  async getHubBalance(): Promise<bigint> {
    if (!this.provider) {
      throw new Error("Provider not initialized")
    }
    return this.provider.getBalance(config.blockchain.contracts.hub)
  }

  /**
   * Get reserved wei in the hub
   */
  async getReservedWei(): Promise<bigint> {
    const hub = this.ensureProvider()
    return hub.reservedWei()
  }

  /**
   * Get available liquidity
   */
  async getAvailableLiquidity(): Promise<bigint> {
    const balance = await this.getHubBalance()
    const reserved = await this.getReservedWei()
    return balance - reserved
  }

  /**
   * Get recent PolicyPurchased events
   */
  async getRecentPolicies(fromBlock: number = 0): Promise<PolicyPurchasedEvent[]> {
    const hub = this.ensureProvider()
    const filter = hub.filters.PolicyPurchased()
    const events = await hub.queryFilter(filter, fromBlock)

    const results: PolicyPurchasedEvent[] = []
    for (const event of events) {
      const args = (event as ethers.EventLog).args
      const block = await event.getBlock()
      results.push({
        policyId: args[0],
        holder: args[1],
        productId: Number(args[2]),
        flightId: args[3],
        flightNumber: args[4],
        arrivalTimestamp: Number(args[5]),
        premiumWei: args[6],
        maxPayoutWei: args[7],
        coverageEnd: Number(args[8]),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block?.timestamp,
      })
    }
    return results
  }

  /**
   * Get recent PolicySettled events (indemnisations)
   */
  async getPolicySettledEvents(fromBlock: number = 0): Promise<PolicySettledEvent[]> {
    const hub = this.ensureProvider()
    const filter = hub.filters.PolicySettled()
    const events = await hub.queryFilter(filter, fromBlock)

    const results: PolicySettledEvent[] = []
    for (const event of events) {
      const args = (event as ethers.EventLog).args
      const block = await event.getBlock()
      results.push({
        policyId: args[0],
        holder: args[1],
        payoutWei: args[2],
        flightId: args[3],
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block?.timestamp,
      })
    }
    return results
  }

  /**
   * Get recent FlightStatusUpdated events
   */
  async getFlightStatusUpdatedEvents(fromBlock: number = 0): Promise<FlightStatusUpdatedEvent[]> {
    const hub = this.ensureProvider()
    const filter = hub.filters.FlightStatusUpdated()
    const events = await hub.queryFilter(filter, fromBlock)

    const results: FlightStatusUpdatedEvent[] = []
    for (const event of events) {
      const args = (event as ethers.EventLog).args
      const block = await event.getBlock()
      results.push({
        flightId: args[0],
        status: Number(args[1]),
        delayInMinutes: Number(args[2]),
        reasonCode: Number(args[3]),
        updatedAt: Number(args[4]),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block?.timestamp,
      })
    }
    return results
  }

  /**
   * Get recent PoolFunded events
   */
  async getPoolFundedEvents(fromBlock: number = 0): Promise<PoolFundedEvent[]> {
    const hub = this.ensureProvider()
    const filter = hub.filters.PoolFunded()
    const events = await hub.queryFilter(filter, fromBlock)

    const results: PoolFundedEvent[] = []
    for (const event of events) {
      const args = (event as ethers.EventLog).args
      const block = await event.getBlock()
      results.push({
        from: args[0],
        amountWei: args[1],
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block?.timestamp,
      })
    }
    return results
  }

  /**
   * Get all blockchain events sorted by block number (most recent first)
   */
  async getAllEvents(fromBlock: number = 0): Promise<BlockchainEvent[]> {
    const [purchases, settlements, statusUpdates, poolFunds] = await Promise.all([
      this.getRecentPolicies(fromBlock),
      this.getPolicySettledEvents(fromBlock),
      this.getFlightStatusUpdatedEvents(fromBlock),
      this.getPoolFundedEvents(fromBlock),
    ])

    const allEvents: BlockchainEvent[] = [
      ...purchases.map((data) => ({ type: "PolicyPurchased" as const, data })),
      ...settlements.map((data) => ({ type: "PolicySettled" as const, data })),
      ...statusUpdates.map((data) => ({ type: "FlightStatusUpdated" as const, data })),
      ...poolFunds.map((data) => ({ type: "PoolFunded" as const, data })),
    ]

    // Sort by block number descending (most recent first)
    allEvents.sort((a, b) => b.data.blockNumber - a.data.blockNumber)

    return allEvents
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not initialized")
    }
    return this.provider.getBlockNumber()
  }

  /**
   * Format wei to ETH string
   */
  formatEth(wei: bigint): string {
    return ethers.formatEther(wei)
  }

  /**
   * Parse ETH string to wei
   */
  parseEth(eth: string): bigint {
    return ethers.parseEther(eth)
  }
}

// Export singleton instance
export const blockchain = new BlockchainService()

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
