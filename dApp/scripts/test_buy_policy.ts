import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();
  const hub = await ethers.getContractAt("InsuranceHub", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");

  // Get product info (Basic = productId 1)
  const [addr, premium, maxPayout] = await hub.getProduct(1);
  console.log("Basic product - Premium:", ethers.formatEther(premium), "ETH, Max payout:", ethers.formatEther(maxPayout), "ETH");

  // Buy a policy for flight AF123 with arrivalTimestamp from the API
  const [buyer] = await ethers.getSigners();
  console.log("Buyer:", buyer.address);

  const arrivalTimestamp = 1768262332;
  console.log("Buying policy for AF123 at", arrivalTimestamp);

  const tx = await hub.buyPolicy(1, "AF123", arrivalTimestamp, { value: premium });
  const receipt = await tx.wait();
  console.log("Policy purchased! Tx:", receipt?.hash);

  // Check event
  for (const log of receipt?.logs || []) {
    if ('eventName' in log && log.eventName === "PolicyPurchased") {
      console.log("PolicyPurchased event - policyId:", (log as any).args[0].toString());
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
