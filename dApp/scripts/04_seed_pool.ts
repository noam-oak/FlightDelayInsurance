import hre from "hardhat";
import fs from "fs";
import path from "path";

const ADDR_PATH = path.join(import.meta.dirname, "..", "deployments", "localhost", "addresses.json");

function readAddresses() {
  return JSON.parse(fs.readFileSync(ADDR_PATH, "utf-8"));
}

async function main() {
  const { ethers } = await hre.network.connect();
  const addrs = readAddresses();
  const hub = addrs.hub as string;

  if (!hub) throw new Error("hub address missing in addresses.json");

  const [deployer] = await ethers.getSigners();

  const amount = ethers.parseEther("100");
  console.log(`Seeding hub ${hub} with ${ethers.formatEther(amount)} ETH...`);

  const tx = await deployer.sendTransaction({ to: hub, value: amount });
  await tx.wait();

  console.log(`Seeded hub ${hub} with ${amount.toString()} wei (${ethers.formatEther(amount)} ETH)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
