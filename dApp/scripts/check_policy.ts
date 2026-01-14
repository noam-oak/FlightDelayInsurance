import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();
  const hub = await ethers.getContractAt("InsuranceHub", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");

  const policy = await hub.getPolicy(1);
  console.log("Policy #1:");
  console.log("  Holder:", policy.holder);
  console.log("  Status:", ["ACTIVE", "SETTLED", "EXPIRED"][Number(policy.status)]);
  console.log("  Premium paid:", ethers.formatEther(policy.premiumPaid), "ETH");
  console.log("  Max payout:", ethers.formatEther(policy.maxPayout), "ETH");
  console.log("  Flight:", policy.flightNumber);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
