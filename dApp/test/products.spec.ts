import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.connect();

describe("Product Contracts", function () {
  // Helper to create flight data
  function createFlightData(
    flightNumber: string,
    arrivalTimestamp: number,
    delayInMinutes: number,
    reasonCode: number,
    status: number
  ) {
    const flightId = ethers.keccak256(
      ethers.solidityPacked(["string", "uint64"], [flightNumber, arrivalTimestamp])
    );
    return {
      flightId,
      flightNumber,
      arrivalTimestamp,
      delayInMinutes,
      reasonCode,
      status,
      updatedAt: Math.floor(Date.now() / 1000),
    };
  }

  // Reason codes
  const REASON_TECHNICAL = 50;
  const REASON_OPERATIONAL = 60;
  const REASON_CREW = 61;
  const REASON_WEATHER = 10; // excluded

  // Flight statuses
  const STATUS_DELAYED = 2;
  const STATUS_CANCELLED = 3;
  const STATUS_DIVERTED = 4;

  describe("Basic Product", function () {
    it("should have correct product parameters", async function () {
      const basic = await ethers.deployContract("Basic");
      expect(await basic.productId()).to.equal(1);
      expect(await basic.premiumWei()).to.equal(ethers.parseEther("0.003"));
      expect(await basic.maxPayoutWei()).to.equal(ethers.parseEther("0.02"));
    });

    it("should NOT pay for delay = 179 minutes with covered reason", async function () {
      const basic = await ethers.deployContract("Basic");
      const data = createFlightData("AA123", 1700000000, 179, REASON_TECHNICAL, STATUS_DELAYED);
      const [eligible, payout] = await basic.evaluatePayout(data);
      expect(eligible).to.be.false;
      expect(payout).to.equal(0);
    });

    it("should pay for delay = 180 minutes with covered reason (TECHNICAL)", async function () {
      const basic = await ethers.deployContract("Basic");
      const data = createFlightData("AA123", 1700000000, 180, REASON_TECHNICAL, STATUS_DELAYED);
      const [eligible, payout] = await basic.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.02"));
    });

    it("should pay for delay = 180 minutes with OPERATIONAL reason", async function () {
      const basic = await ethers.deployContract("Basic");
      const data = createFlightData("AA123", 1700000000, 180, REASON_OPERATIONAL, STATUS_DELAYED);
      const [eligible, payout] = await basic.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.02"));
    });

    it("should pay for delay = 180 minutes with CREW reason", async function () {
      const basic = await ethers.deployContract("Basic");
      const data = createFlightData("AA123", 1700000000, 180, REASON_CREW, STATUS_DELAYED);
      const [eligible, payout] = await basic.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.02"));
    });

    it("should NOT pay for delay = 180 minutes with WEATHER reason (excluded)", async function () {
      const basic = await ethers.deployContract("Basic");
      const data = createFlightData("AA123", 1700000000, 180, REASON_WEATHER, STATUS_DELAYED);
      const [eligible, payout] = await basic.evaluatePayout(data);
      expect(eligible).to.be.false;
      expect(payout).to.equal(0);
    });

    it("should pay for delay > 180 minutes with covered reason", async function () {
      const basic = await ethers.deployContract("Basic");
      const data = createFlightData("AA123", 1700000000, 300, REASON_TECHNICAL, STATUS_DELAYED);
      const [eligible, payout] = await basic.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.02"));
    });
  });

  describe("Plus Product", function () {
    it("should have correct product parameters", async function () {
      const plus = await ethers.deployContract("Plus");
      expect(await plus.productId()).to.equal(2);
      expect(await plus.premiumWei()).to.equal(ethers.parseEther("0.006"));
      expect(await plus.maxPayoutWei()).to.equal(ethers.parseEther("0.06"));
    });

    it("should NOT pay for delay = 359 minutes with covered reason", async function () {
      const plus = await ethers.deployContract("Plus");
      const data = createFlightData("AA123", 1700000000, 359, REASON_TECHNICAL, STATUS_DELAYED);
      const [eligible, payout] = await plus.evaluatePayout(data);
      expect(eligible).to.be.false;
      expect(payout).to.equal(0);
    });

    it("should pay 0.04 ETH for delay = 360 minutes with covered reason", async function () {
      const plus = await ethers.deployContract("Plus");
      const data = createFlightData("AA123", 1700000000, 360, REASON_TECHNICAL, STATUS_DELAYED);
      const [eligible, payout] = await plus.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.04"));
    });

    it("should NOT pay for delay = 360 minutes with excluded reason", async function () {
      const plus = await ethers.deployContract("Plus");
      const data = createFlightData("AA123", 1700000000, 360, REASON_WEATHER, STATUS_DELAYED);
      const [eligible, payout] = await plus.evaluatePayout(data);
      expect(eligible).to.be.false;
      expect(payout).to.equal(0);
    });

    it("should pay 0.06 ETH for CANCELLED status", async function () {
      const plus = await ethers.deployContract("Plus");
      const data = createFlightData("AA123", 1700000000, 0, REASON_WEATHER, STATUS_CANCELLED);
      const [eligible, payout] = await plus.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.06"));
    });

    it("should pay 0.06 ETH for CANCELLED even with large delay (higher payout wins)", async function () {
      const plus = await ethers.deployContract("Plus");
      const data = createFlightData("AA123", 1700000000, 400, REASON_TECHNICAL, STATUS_CANCELLED);
      const [eligible, payout] = await plus.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.06"));
    });
  });

  describe("Max Product", function () {
    it("should have correct product parameters", async function () {
      const max = await ethers.deployContract("Max");
      expect(await max.productId()).to.equal(3);
      expect(await max.premiumWei()).to.equal(ethers.parseEther("0.008"));
      expect(await max.maxPayoutWei()).to.equal(ethers.parseEther("0.08"));
    });

    it("should NOT pay for delay = 119 minutes", async function () {
      const max = await ethers.deployContract("Max");
      const data = createFlightData("AA123", 1700000000, 119, REASON_WEATHER, STATUS_DELAYED);
      const [eligible, payout] = await max.evaluatePayout(data);
      expect(eligible).to.be.false;
      expect(payout).to.equal(0);
    });

    it("should pay 0.01 ETH for delay = 120 minutes (any reason)", async function () {
      const max = await ethers.deployContract("Max");
      const data = createFlightData("AA123", 1700000000, 120, REASON_WEATHER, STATUS_DELAYED);
      const [eligible, payout] = await max.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.01"));
    });

    it("should pay 0.01 ETH for delay = 239 minutes (tier 1)", async function () {
      const max = await ethers.deployContract("Max");
      const data = createFlightData("AA123", 1700000000, 239, REASON_WEATHER, STATUS_DELAYED);
      const [eligible, payout] = await max.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.01"));
    });

    it("should pay 0.03 ETH for delay = 240 minutes", async function () {
      const max = await ethers.deployContract("Max");
      const data = createFlightData("AA123", 1700000000, 240, REASON_WEATHER, STATUS_DELAYED);
      const [eligible, payout] = await max.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.03"));
    });

    it("should pay 0.08 ETH for CANCELLED status", async function () {
      const max = await ethers.deployContract("Max");
      const data = createFlightData("AA123", 1700000000, 0, REASON_WEATHER, STATUS_CANCELLED);
      const [eligible, payout] = await max.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.08"));
    });

    it("should pay 0.08 ETH for DIVERTED status", async function () {
      const max = await ethers.deployContract("Max");
      const data = createFlightData("AA123", 1700000000, 0, REASON_WEATHER, STATUS_DIVERTED);
      const [eligible, payout] = await max.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.08"));
    });

    it("should choose highest payout when multiple triggers match (cancelled + delay)", async function () {
      const max = await ethers.deployContract("Max");
      const data = createFlightData("AA123", 1700000000, 300, REASON_WEATHER, STATUS_CANCELLED);
      const [eligible, payout] = await max.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.08"));
    });

    it("should pay for any reason code (all causes covered)", async function () {
      const max = await ethers.deployContract("Max");
      const data = createFlightData("AA123", 1700000000, 120, REASON_WEATHER, STATUS_DELAYED);
      const [eligible, payout] = await max.evaluatePayout(data);
      expect(eligible).to.be.true;
      expect(payout).to.equal(ethers.parseEther("0.01"));
    });
  });
});
