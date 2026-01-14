// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IInsuranceProduct.sol";

/// @title InsuranceHub
/// @notice Main hub contract for parametric flight insurance
/// @dev Manages policies, products, liquidity pool, and oracle updates
contract InsuranceHub is AccessControl, ReentrancyGuard {
    // ============ Roles ============
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ============ Constants ============
    uint64 public constant GRACE_SECONDS = 24 hours;

    // ============ Enums ============
    enum PolicyStatus { ACTIVE, SETTLED, EXPIRED }

    // ============ Structs ============
    struct Policy {
        uint256 policyId;
        address holder;
        uint32 productId;
        bytes32 flightId;
        string flightNumber;
        uint64 arrivalTimestamp;
        uint256 premiumPaid;
        uint256 maxPayout;
        uint64 purchasedAt;
        uint64 coverageEnd;
        PolicyStatus status;
    }

    // ============ State Variables ============
    /// @notice Sum of maxPayout for all ACTIVE policies
    uint256 public reservedWei;

    /// @notice Counter for policy IDs
    uint256 private _nextPolicyId;

    /// @notice Registered products by productId
    mapping(uint32 => address) private _products;

    /// @notice All policies by policyId
    mapping(uint256 => Policy) private _policies;

    /// @notice Policy IDs by holder address
    mapping(address => uint256[]) private _policyIdsByHolder;

    /// @notice Policy IDs by flightId for fast settlement
    mapping(bytes32 => uint256[]) public policyIdsByFlightId;

    /// @notice Last oracle update timestamp by flightId (anti-replay)
    mapping(bytes32 => uint64) public lastUpdatedAtByFlightId;

    // ============ Events ============
    event ProductRegistered(uint32 indexed productId, address indexed product);
    event PoolFunded(address indexed from, uint256 amountWei);

    event PolicyPurchased(
        uint256 indexed policyId,
        address indexed holder,
        uint32 indexed productId,
        bytes32 flightId,
        string flightNumber,
        uint64 arrivalTimestamp,
        uint256 premiumWei,
        uint256 maxPayoutWei,
        uint64 coverageEnd
    );

    event FlightStatusUpdated(
        bytes32 indexed flightId,
        uint8 status,
        uint32 delayInMinutes,
        uint16 reasonCode,
        uint64 updatedAt
    );

    event PolicySettled(
        uint256 indexed policyId,
        address indexed holder,
        uint256 payoutWei,
        bytes32 flightId
    );

    event PolicyExpired(uint256 indexed policyId, bytes32 flightId);

    // ============ Errors ============
    error ProductNotFound(uint32 productId);
    error WrongPremium(uint256 sent, uint256 expected);
    error InsolventPool(uint256 available, uint256 required);
    error PolicyNotActive(uint256 policyId);
    error PolicyAlreadyClosed(uint256 policyId);
    error PolicyNotExpired(uint256 policyId);
    error StaleOracleUpdate(bytes32 flightId, uint64 updatedAt, uint64 lastUpdatedAt);

    // ============ Constructor ============
    /// @notice Initializes the hub with an oracle address
    /// @param oracle The address that will have ORACLE_ROLE
    constructor(address oracle) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, oracle);
        _nextPolicyId = 1;
    }

    // ============ Admin Functions ============
    /// @notice Registers a product contract
    /// @param productId_ The product ID (must match contract's productId())
    /// @param product The product contract address
    function registerProduct(uint32 productId_, address product) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _products[productId_] = product;
        emit ProductRegistered(productId_, product);
    }

    // ============ Public Functions ============
    /// @notice Buys a policy for a specific flight
    /// @param productId_ The product ID to buy
    /// @param flightNumber The flight number (e.g., "AA123")
    /// @param arrivalTimestamp The expected arrival time in epoch seconds
    function buyPolicy(
        uint32 productId_,
        string calldata flightNumber,
        uint64 arrivalTimestamp
    ) external payable nonReentrant {
        address productAddr = _products[productId_];
        if (productAddr == address(0)) {
            revert ProductNotFound(productId_);
        }

        IInsuranceProduct product = IInsuranceProduct(productAddr);
        uint256 premium = product.premiumWei();
        uint256 maxPayout = product.maxPayoutWei();

        if (msg.value != premium) {
            revert WrongPremium(msg.value, premium);
        }

        // Check solvency
        uint256 available = address(this).balance - reservedWei;
        if (available < maxPayout) {
            revert InsolventPool(available, maxPayout);
        }

        // Derive flightId
        bytes32 flightId = keccak256(abi.encodePacked(flightNumber, arrivalTimestamp));

        // Create policy
        uint256 policyId = _nextPolicyId++;
        uint64 coverageEnd = arrivalTimestamp + GRACE_SECONDS;

        Policy storage policy = _policies[policyId];
        policy.policyId = policyId;
        policy.holder = msg.sender;
        policy.productId = productId_;
        policy.flightId = flightId;
        policy.flightNumber = flightNumber;
        policy.arrivalTimestamp = arrivalTimestamp;
        policy.premiumPaid = premium;
        policy.maxPayout = maxPayout;
        policy.purchasedAt = uint64(block.timestamp);
        policy.coverageEnd = coverageEnd;
        policy.status = PolicyStatus.ACTIVE;

        // Update indexes
        _policyIdsByHolder[msg.sender].push(policyId);
        policyIdsByFlightId[flightId].push(policyId);

        // Reserve funds
        reservedWei += maxPayout;

        emit PolicyPurchased(
            policyId,
            msg.sender,
            productId_,
            flightId,
            flightNumber,
            arrivalTimestamp,
            premium,
            maxPayout,
            coverageEnd
        );
    }

    /// @notice Oracle updates flight status and settles eligible policies
    /// @param data The flight data from the oracle
    function updateFlightStatus(IInsuranceProduct.FlightData calldata data) external onlyRole(ORACLE_ROLE) nonReentrant {
        // Anti-replay check
        uint64 lastUpdated = lastUpdatedAtByFlightId[data.flightId];
        if (data.updatedAt <= lastUpdated) {
            revert StaleOracleUpdate(data.flightId, data.updatedAt, lastUpdated);
        }
        lastUpdatedAtByFlightId[data.flightId] = data.updatedAt;

        emit FlightStatusUpdated(
            data.flightId,
            uint8(data.status),
            data.delayInMinutes,
            data.reasonCode,
            data.updatedAt
        );

        // Settle eligible policies
        uint256[] storage policyIds = policyIdsByFlightId[data.flightId];
        uint256 len = policyIds.length;

        for (uint256 i = 0; i < len; i++) {
            uint256 policyId = policyIds[i];
            Policy storage policy = _policies[policyId];

            // Skip if not active or expired
            if (policy.status != PolicyStatus.ACTIVE) {
                continue;
            }
            if (block.timestamp > policy.coverageEnd) {
                continue;
            }

            // Evaluate payout
            IInsuranceProduct product = IInsuranceProduct(_products[policy.productId]);
            (bool eligible, uint256 payoutWei) = product.evaluatePayout(data);

            if (eligible && payoutWei > 0) {
                // Effects first
                policy.status = PolicyStatus.SETTLED;
                reservedWei -= policy.maxPayout;

                // Interactions last
                (bool success, ) = policy.holder.call{value: payoutWei}("");
                require(success, "Transfer failed");

                emit PolicySettled(policyId, policy.holder, payoutWei, data.flightId);
            }
        }
    }

    /// @notice Expires a policy after coverage ends (permissionless)
    /// @param policyId The policy ID to expire
    function expirePolicy(uint256 policyId) external {
        Policy storage policy = _policies[policyId];

        if (policy.status != PolicyStatus.ACTIVE) {
            revert PolicyAlreadyClosed(policyId);
        }

        if (block.timestamp <= policy.coverageEnd) {
            revert PolicyNotExpired(policyId);
        }

        policy.status = PolicyStatus.EXPIRED;
        reservedWei -= policy.maxPayout;

        emit PolicyExpired(policyId, policy.flightId);
    }

    /// @notice Deposits ETH into the liquidity pool
    function deposit() external payable {
        emit PoolFunded(msg.sender, msg.value);
    }

    /// @notice Accepts ETH transfers directly
    receive() external payable {
        emit PoolFunded(msg.sender, msg.value);
    }

    // ============ View Functions ============
    /// @notice Gets a policy by ID
    /// @param policyId The policy ID
    /// @return The policy struct
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return _policies[policyId];
    }

    /// @notice Gets all policy IDs for a holder
    /// @param holder The holder address
    /// @return Array of policy IDs
    function getPoliciesByHolder(address holder) external view returns (uint256[] memory) {
        return _policyIdsByHolder[holder];
    }

    /// @notice Gets product info
    /// @param productId_ The product ID
    /// @return product The product address
    /// @return premiumWei The premium in wei
    /// @return maxPayoutWei The max payout in wei
    function getProduct(uint32 productId_) external view returns (
        address product,
        uint256 premiumWei,
        uint256 maxPayoutWei
    ) {
        address productAddr = _products[productId_];
        if (productAddr == address(0)) {
            revert ProductNotFound(productId_);
        }
        IInsuranceProduct p = IInsuranceProduct(productAddr);
        return (productAddr, p.premiumWei(), p.maxPayoutWei());
    }

    /// @notice Gets all policy IDs for a flight
    /// @param flightId The flight ID
    /// @return Array of policy IDs
    function getPoliciesByFlightId(bytes32 flightId) external view returns (uint256[] memory) {
        return policyIdsByFlightId[flightId];
    }
}
