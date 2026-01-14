import hre from "hardhat";
import fs from "fs";
import path from "path";

const OUT_PATH = path.join(import.meta.dirname, "..", "deployments", "localhost", "addresses.json");

function readAddresses() {
  return JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
}

async function main() {
  const { ethers } = await hre.network.connect();
  const addrs = readAddresses();
  const hubAddr = addrs.hub as string;
  const products = addrs.products as Record<string, string>;

  if (!hubAddr) throw new Error("hub address missing in addresses.json");

  console.log("Registering products in Hub:", hubAddr);

  const hub = await ethers.getContractAt("InsuranceHub", hubAddr);

  for (const [id, addr] of Object.entries(products)) {
    const tx = await hub.registerProduct(Number(id), addr);
    await tx.wait();
    console.log(`Registered product ${id} => ${addr}`);
  }

  console.log("All products registered successfully");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
