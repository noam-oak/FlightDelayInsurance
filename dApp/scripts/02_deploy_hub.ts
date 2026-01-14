import hre from "hardhat";
import fs from "fs";
import path from "path";

const OUT_PATH = path.join(import.meta.dirname, "..", "deployments", "localhost", "addresses.json");

function readAddresses() {
  return JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
}

function writeAddresses(obj: any) {
  fs.writeFileSync(OUT_PATH, JSON.stringify(obj, null, 2));
}

async function main() {
  const { ethers } = await hre.network.connect();
  const addrs = readAddresses();
  const oracle = addrs.oracle as string;
  if (!oracle) throw new Error("oracle address missing in addresses.json");

  console.log("Deploying Hub with oracle:", oracle);

  const hub = await ethers.deployContract("InsuranceHub", [oracle]);
  await hub.waitForDeployment();

  addrs.hub = await hub.getAddress();
  writeAddresses(addrs);

  console.log("Hub deployed:", addrs.hub);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
