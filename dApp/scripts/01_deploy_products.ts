import hre from "hardhat";
import fs from "fs";
import path from "path";

const OUT_DIR = path.join(import.meta.dirname, "..", "deployments", "localhost");
const OUT_PATH = path.join(OUT_DIR, "addresses.json");

function writeAddresses(obj: any) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(obj, null, 2));
}

async function main() {
  const { ethers } = await hre.network.connect();
  const [deployer, oracle] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log("Deploying products with deployer:", deployer.address);
  console.log("Oracle address:", oracle.address);

  const basic = await ethers.deployContract("Basic");
  await basic.waitForDeployment();
  console.log("Basic deployed to:", await basic.getAddress());

  const plus = await ethers.deployContract("Plus");
  await plus.waitForDeployment();
  console.log("Plus deployed to:", await plus.getAddress());

  const max = await ethers.deployContract("Max");
  await max.waitForDeployment();
  console.log("Max deployed to:", await max.getAddress());

  const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")) : {};
  writeAddresses({
    ...existing,
    chainId: Number(chainId),
    deployer: deployer.address,
    oracle: oracle.address,
    products: {
      ...(existing.products || {}),
      "1": await basic.getAddress(),
      "2": await plus.getAddress(),
      "3": await max.getAddress()
    }
  });

  console.log("Products deployed:", {
    basic: await basic.getAddress(),
    plus: await plus.getAddress(),
    max: await max.getAddress()
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
