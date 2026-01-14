import fs from "fs";
import hre from "hardhat";
import path from "path";

const ADDR_PATH = path.join(import.meta.dirname, "..", "deployments", "localhost", "addresses.json");

async function main() {
  const { ethers } = await hre.network.connect();
  const addrs = JSON.parse(fs.readFileSync(ADDR_PATH, "utf-8"));

  const hub = await ethers.getContractAt("InsuranceHub", addrs.hub);

  // Compute flightId for AF123 / 1769018400
  const flightId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint64"],
      ["AF123", 1769018400]
    )
  );
  console.log("FlightId:", flightId);

  // Get policies for this flight
  const policyIds = await hub.getPoliciesByFlightId(flightId);
  console.log("Policies for this flight:", policyIds.map((p: bigint) => p.toString()));

  // Get all policies via holder (account 0)
  const [deployer] = await ethers.getSigners();
  const allPolicyIds = await hub.getPoliciesByHolder(deployer.address);
  console.log("\nAll policies for deployer:", allPolicyIds.map((p: bigint) => p.toString()));

  for (const policyId of allPolicyIds) {
    const policy = await hub.getPolicy(policyId);
    console.log("Policy", policyId.toString(), ":", {
      holder: policy.holder,
      status: ["ACTIVE", "SETTLED", "EXPIRED"][Number(policy.status)],
      flightNumber: policy.flightNumber,
      arrivalTimestamp: policy.arrivalTimestamp.toString(),
    });
  }
}

main().catch(console.error);
