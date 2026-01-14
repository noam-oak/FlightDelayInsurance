// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IInsuranceProduct.sol";

/// @title Plus Flight Insurance Product
/// @notice Covers delays >= 360 minutes for covered reasons, or cancellations
contract Plus is IInsuranceProduct {
    uint32 public constant override productId = 2;
    uint256 public constant override premiumWei = 0.006 ether;
    uint256 public constant override maxPayoutWei = 0.06 ether;

    uint32 private constant MIN_DELAY_MINUTES = 360;
    uint256 private constant DELAY_PAYOUT = 0.04 ether;
    uint256 private constant CANCEL_PAYOUT = 0.06 ether;

    // Covered reason codes
    uint16 private constant REASON_TECHNICAL = 50;
    uint16 private constant REASON_OPERATIONAL = 60;
    uint16 private constant REASON_CREW = 61;

    /// @notice Checks if a reason code is covered by this product
    /// @param reasonCode The reason code to check
    /// @return True if the reason is covered
    function _isCoveredReason(uint16 reasonCode) internal pure returns (bool) {
        return reasonCode == REASON_TECHNICAL ||
               reasonCode == REASON_OPERATIONAL ||
               reasonCode == REASON_CREW;
    }

    /// @inheritdoc IInsuranceProduct
    function evaluatePayout(FlightData calldata data) external pure override returns (bool eligible, uint256 payoutWei) {
        // Trigger B: status == CANCELLED -> 0.06 ETH (higher payout, check first)
        if (data.status == FlightStatus.CANCELLED) {
            return (true, CANCEL_PAYOUT);
        }

        // Trigger A: delay >= 360 AND covered reason -> 0.04 ETH
        if (data.delayInMinutes >= MIN_DELAY_MINUTES && _isCoveredReason(data.reasonCode)) {
            return (true, DELAY_PAYOUT);
        }

        return (false, 0);
    }
}
