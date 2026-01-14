import { expect } from "chai";
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.connect();

describe("InsuranceHub", function () {
  const GRACE_SECONDS = 24 * 60 * 60; // 24 hours

  // Helper to create flight data
  function createFlightData(
    flightNumber: string,
    arrivalTimestamp: number,
    delayInMinutes: number,
    reasonCode: number,
    status: number,
    updatedAt: number
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
      updatedAt,
    };
  }

  // Fixture for deploying all contracts
  async function deployFixture() {
    const [deployer, oracle, user1, user2] = await ethers.getSigners();

    // Deploy products
    const basic = await ethers.deployContract("Basic");
    const plus = await ethers.deployContract("Plus");
    const max = await ethers.deployContract("Max");

    // Deploy hub
    const hub = await ethers.deployContract("InsuranceHub", [oracle.address]);

    // Register products
    await hub.registerProduct(1, await basic.getAddress());
    await hub.registerProduct(2, await plus.getAddress());
    await hub.registerProduct(3, await max.getAddress());

    // Seed pool with 100 ETH
    await deployer.sendTransaction({
      to: await hub.getAddress(),
      value: ethers.parseEther("100"),
    });

    return { hub, basic, plus, max, deployer, oracle, user1, user2 };
  }

  describe("registerProduct", function () {
    it("should only allow admin to register products", async function () {
      const [deployer, oracle, user1] = await ethers.getSigners();
      const hub = await ethers.deployContract("InsuranceHub", [oracle.address]);
      const basic = await ethers.deployContract("Basic");

      // User1 should not be able to register
      await expect(
        hub.connect(user1).registerProduct(1, await basic.getAddress())
      ).to.be.revert(ethers);

      // Deployer (admin) should be able to register
      await expect(hub.registerProduct(1, await basic.getAddress()))
        .to.emit(hub, "ProductRegistered")
        .withArgs(1, await basic.getAddress());
    });

    it("should emit ProductRegistered event", async function () {
      const [deployer, oracle] = await ethers.getSigners();
      const hub = await ethers.deployContract("InsuranceHub", [oracle.address]);
      const basic = await ethers.deployContract("Basic");

      await expect(hub.registerProduct(1, await basic.getAddress()))
        .to.emit(hub, "ProductRegistered")
        .withArgs(1, await basic.getAddress());
    });
  });

  describe("buyPolicy", function () {
    const flightNumber = "AA123";

    it("should revert with WrongPremium if incorrect premium sent", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const wrongPremium = ethers.parseEther("0.001");
      const expectedPremium = ethers.parseEther("0.003");

      await expect(
        hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, { value: wrongPremium })
      )
        .to.be.revertedWithCustomError(hub, "WrongPremium")
        .withArgs(wrongPremium, expectedPremium);
    });

    it("should revert with ProductNotFound for unknown product", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await expect(
        hub.connect(user1).buyPolicy(99, flightNumber, arrivalTimestamp, {
          value: ethers.parseEther("0.003"),
        })
      )
        .to.be.revertedWithCustomError(hub, "ProductNotFound")
        .withArgs(99);
    });

    it("should revert with InsolventPool if pool cannot cover maxPayout", async function () {
      const [deployer, oracle, user1] = await ethers.getSigners();
      const hub = await ethers.deployContract("InsuranceHub", [oracle.address]);
      const basic = await ethers.deployContract("Basic");
      await hub.registerProduct(1, await basic.getAddress());
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await expect(
        hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
          value: ethers.parseEther("0.003"),
        })
      ).to.be.revertedWithCustomError(hub, "InsolventPool");
    });

    it("should successfully buy a policy", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const premium = ethers.parseEther("0.003");

      await expect(hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, { value: premium }))
        .to.emit(hub, "PolicyPurchased");

      // Check policy was created
      const policy = await hub.getPolicy(1);
      expect(policy.holder).to.equal(user1.address);
      expect(policy.productId).to.equal(1);
      expect(policy.flightNumber).to.equal(flightNumber);
      expect(policy.premiumPaid).to.equal(premium);
      expect(policy.status).to.equal(0); // ACTIVE
    });

    it("should increase reservedWei on purchase", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const reservedBefore = await hub.reservedWei();
      const maxPayout = ethers.parseEther("0.02");

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const reservedAfter = await hub.reservedWei();
      expect(reservedAfter - reservedBefore).to.equal(maxPayout);
    });

    it("should correctly derive flightId", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const expectedFlightId = ethers.keccak256(
        ethers.solidityPacked(["string", "uint64"], [flightNumber, arrivalTimestamp])
      );

      const policy = await hub.getPolicy(1);
      expect(policy.flightId).to.equal(expectedFlightId);
    });
  });

  describe("updateFlightStatus", function () {
    const flightNumber = "AA123";

    it("should only allow oracle to update flight status", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const data = createFlightData(flightNumber, arrivalTimestamp, 180, 50, 2, 1000);
      await expect(hub.connect(user1).updateFlightStatus(data)).to.be.revert(ethers);
    });

    it("should revert with StaleOracleUpdate for stale data", async function () {
      const { hub, oracle, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const flightId = ethers.keccak256(
        ethers.solidityPacked(["string", "uint64"], [flightNumber, arrivalTimestamp])
      );

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const data1 = createFlightData(flightNumber, arrivalTimestamp, 180, 50, 2, 1000);
      await hub.connect(oracle).updateFlightStatus(data1);

      const data2 = createFlightData(flightNumber, arrivalTimestamp, 200, 50, 2, 999);
      await expect(hub.connect(oracle).updateFlightStatus(data2))
        .to.be.revertedWithCustomError(hub, "StaleOracleUpdate")
        .withArgs(flightId, 999, 1000);
    });

    it("should emit FlightStatusUpdated event", async function () {
      const { hub, oracle, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const flightId = ethers.keccak256(
        ethers.solidityPacked(["string", "uint64"], [flightNumber, arrivalTimestamp])
      );

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const data = createFlightData(flightNumber, arrivalTimestamp, 180, 50, 2, 1000);

      await expect(hub.connect(oracle).updateFlightStatus(data))
        .to.emit(hub, "FlightStatusUpdated")
        .withArgs(flightId, 2, 180, 50, 1000);
    });

    it("should settle eligible policy and transfer ETH", async function () {
      const { hub, oracle, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const flightId = ethers.keccak256(
        ethers.solidityPacked(["string", "uint64"], [flightNumber, arrivalTimestamp])
      );

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      // 180 minute delay with covered reason (50 = TECHNICAL)
      const data = createFlightData(flightNumber, arrivalTimestamp, 180, 50, 2, 1000);

      await expect(hub.connect(oracle).updateFlightStatus(data))
        .to.emit(hub, "PolicySettled")
        .withArgs(1, user1.address, ethers.parseEther("0.02"), flightId);

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.02"));

      // Policy should be settled
      const policy = await hub.getPolicy(1);
      expect(policy.status).to.equal(1); // SETTLED
    });

    it("should release reserved funds on settlement", async function () {
      const { hub, oracle, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const reservedBefore = await hub.reservedWei();

      const data = createFlightData(flightNumber, arrivalTimestamp, 180, 50, 2, 1000);
      await hub.connect(oracle).updateFlightStatus(data);

      const reservedAfter = await hub.reservedWei();
      expect(reservedBefore - reservedAfter).to.equal(ethers.parseEther("0.02"));
    });

    it("should not settle if not eligible", async function () {
      const { hub, oracle, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      // 179 minute delay (just under threshold)
      const data = createFlightData(flightNumber, arrivalTimestamp, 179, 50, 2, 1000);

      await hub.connect(oracle).updateFlightStatus(data);

      // Policy should still be active
      const policy = await hub.getPolicy(1);
      expect(policy.status).to.equal(0); // ACTIVE
    });

    it("should not settle policy after coverageEnd", async function () {
      const { hub, oracle, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      // Move time past coverage end
      await networkHelpers.time.increase(GRACE_SECONDS + 86400 + 1);

      const data = createFlightData(flightNumber, arrivalTimestamp, 180, 50, 2, 1000);
      await hub.connect(oracle).updateFlightStatus(data);

      // Policy should still be active (not settled because expired)
      const policy = await hub.getPolicy(1);
      expect(policy.status).to.equal(0); // ACTIVE
    });
  });

  describe("expirePolicy", function () {
    const flightNumber = "AA123";

    it("should revert with PolicyNotExpired before coverageEnd", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      await expect(hub.expirePolicy(1))
        .to.be.revertedWithCustomError(hub, "PolicyNotExpired")
        .withArgs(1);
    });

    it("should successfully expire policy after coverageEnd", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const flightId = ethers.keccak256(
        ethers.solidityPacked(["string", "uint64"], [flightNumber, arrivalTimestamp])
      );

      // Move past coverage end (arrivalTimestamp + 24 hours)
      await networkHelpers.time.increase(86400 + GRACE_SECONDS + 1);

      await expect(hub.expirePolicy(1))
        .to.emit(hub, "PolicyExpired")
        .withArgs(1, flightId);

      const policy = await hub.getPolicy(1);
      expect(policy.status).to.equal(2); // EXPIRED
    });

    it("should release reserved funds on expiration", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      const reservedBefore = await hub.reservedWei();

      await networkHelpers.time.increase(86400 + GRACE_SECONDS + 1);
      await hub.expirePolicy(1);

      const reservedAfter = await hub.reservedWei();
      expect(reservedBefore - reservedAfter).to.equal(ethers.parseEther("0.02"));
    });

    it("should revert with PolicyAlreadyClosed for already expired policy", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, flightNumber, arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });

      await networkHelpers.time.increase(86400 + GRACE_SECONDS + 1);
      await hub.expirePolicy(1);

      await expect(hub.expirePolicy(1))
        .to.be.revertedWithCustomError(hub, "PolicyAlreadyClosed")
        .withArgs(1);
    });
  });

  describe("View functions", function () {
    it("getProduct should return product info", async function () {
      const { hub, basic } = await networkHelpers.loadFixture(deployFixture);

      const [addr, premium, maxPayout] = await hub.getProduct(1);
      expect(addr).to.equal(await basic.getAddress());
      expect(premium).to.equal(ethers.parseEther("0.003"));
      expect(maxPayout).to.equal(ethers.parseEther("0.02"));
    });

    it("getProduct should revert for unknown product", async function () {
      const { hub } = await networkHelpers.loadFixture(deployFixture);

      await expect(hub.getProduct(99))
        .to.be.revertedWithCustomError(hub, "ProductNotFound")
        .withArgs(99);
    });

    it("getPoliciesByHolder should return holder policies", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;

      await hub.connect(user1).buyPolicy(1, "AA123", arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });
      await hub.connect(user1).buyPolicy(2, "BB456", arrivalTimestamp, {
        value: ethers.parseEther("0.006"),
      });

      const policies = await hub.getPoliciesByHolder(user1.address);
      expect(policies.length).to.equal(2);
      expect(policies[0]).to.equal(1n);
      expect(policies[1]).to.equal(2n);
    });

    it("getPoliciesByFlightId should return policies for a flight", async function () {
      const { hub, user1, user2 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const flightId = ethers.keccak256(
        ethers.solidityPacked(["string", "uint64"], ["AA123", arrivalTimestamp])
      );

      await hub.connect(user1).buyPolicy(1, "AA123", arrivalTimestamp, {
        value: ethers.parseEther("0.003"),
      });
      await hub.connect(user2).buyPolicy(2, "AA123", arrivalTimestamp, {
        value: ethers.parseEther("0.006"),
      });

      const policies = await hub.getPoliciesByFlightId(flightId);
      expect(policies.length).to.equal(2);
    });
  });

  describe("Pool funding", function () {
    it("should accept ETH via receive()", async function () {
      const [deployer, oracle] = await ethers.getSigners();
      const hub = await ethers.deployContract("InsuranceHub", [oracle.address]);

      await expect(
        deployer.sendTransaction({
          to: await hub.getAddress(),
          value: ethers.parseEther("10"),
        })
      )
        .to.emit(hub, "PoolFunded")
        .withArgs(deployer.address, ethers.parseEther("10"));
    });

    it("should accept ETH via deposit()", async function () {
      const [deployer, oracle] = await ethers.getSigners();
      const hub = await ethers.deployContract("InsuranceHub", [oracle.address]);

      await expect(hub.deposit({ value: ethers.parseEther("10") }))
        .to.emit(hub, "PoolFunded")
        .withArgs(deployer.address, ethers.parseEther("10"));
    });
  });

  describe("Integration: Full policy lifecycle", function () {
    it("should handle complete policy lifecycle with payout", async function () {
      const { hub, oracle, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const premium = ethers.parseEther("0.008"); // Max product
      const flightNumber = "MAX123";

      // Buy Max policy
      await hub.connect(user1).buyPolicy(3, flightNumber, arrivalTimestamp, { value: premium });

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      // Flight gets cancelled
      const data = createFlightData(flightNumber, arrivalTimestamp, 0, 10, 3, 1000); // STATUS_CANCELLED

      await hub.connect(oracle).updateFlightStatus(data);

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.08"));

      const policy = await hub.getPolicy(1);
      expect(policy.status).to.equal(1); // SETTLED
    });

    it("should handle complete policy lifecycle with expiration", async function () {
      const { hub, user1 } = await networkHelpers.loadFixture(deployFixture);
      const arrivalTimestamp = (await networkHelpers.time.latest()) + 86400;
      const premium = ethers.parseEther("0.003");

      await hub.connect(user1).buyPolicy(1, "EXP123", arrivalTimestamp, { value: premium });

      const reservedBefore = await hub.reservedWei();
      expect(reservedBefore).to.equal(ethers.parseEther("0.02"));

      // Move past coverage end
      await networkHelpers.time.increase(86400 + GRACE_SECONDS + 1);

      await hub.expirePolicy(1);

      const reservedAfter = await hub.reservedWei();
      expect(reservedAfter).to.equal(0n);

      const policy = await hub.getPolicy(1);
      expect(policy.status).to.equal(2); // EXPIRED
    });
  });
});
