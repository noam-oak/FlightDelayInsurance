// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IInsuranceProduct.sol";

/// @title Max Flight Insurance Product
/// @notice Covers all causes with tiered delay payouts and max payout for cancellation/diversion
contract Max is IInsuranceProduct {
    uint32 public constant override productId = 3;
    uint256 public constant override premiumWei = 0.008 ether;
    uint256 public constant override maxPayoutWei = 0.08 ether;

    // Delay thresholds
    uint32 private constant DELAY_TIER1_MINUTES = 120;
    uint32 private constant DELAY_TIER2_MINUTES = 240;

    // Payouts
    uint256 private constant TIER1_PAYOUT = 0.01 ether;  // delay >= 120
    uint256 private constant TIER2_PAYOUT = 0.03 ether;  // delay >= 240
    uint256 private constant MAX_PAYOUT = 0.08 ether;    // cancelled or diverted

    /// @inheritdoc IInsuranceProduct
    function evaluatePayout(FlightData calldata data) external pure override returns (bool eligible, uint256 payoutWei) {
        uint256 highestPayout = 0;

        // Trigger C: status == CANCELLED -> 0.08 ETH
        if (data.status == FlightStatus.CANCELLED) {
            highestPayout = MAX_PAYOUT;
        }

        // Trigger D: status == DIVERTED -> 0.08 ETH
        if (data.status == FlightStatus.DIVERTED && MAX_PAYOUT > highestPayout) {
            highestPayout = MAX_PAYOUT;
        }

        // Trigger B: delay >= 240 -> 0.03 ETH
        if (data.delayInMinutes >= DELAY_TIER2_MINUTES && TIER2_PAYOUT > highestPayout) {
            highestPayout = TIER2_PAYOUT;
        }

        // Trigger A: delay >= 120 -> 0.01 ETH
        if (data.delayInMinutes >= DELAY_TIER1_MINUTES && TIER1_PAYOUT > highestPayout) {
            highestPayout = TIER1_PAYOUT;
        }

        if (highestPayout > 0) {
            return (true, highestPayout);
        }

        return (false, 0);
    }
}
