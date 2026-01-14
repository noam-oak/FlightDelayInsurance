// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IInsuranceProduct.sol";

/// @title Basic Flight Insurance Product
/// @notice Covers delays >= 180 minutes for covered reasons only
contract Basic is IInsuranceProduct {
    uint32 public constant override productId = 1;
    uint256 public constant override premiumWei = 0.003 ether;
    uint256 public constant override maxPayoutWei = 0.02 ether;

    uint32 private constant MIN_DELAY_MINUTES = 180;
    uint256 private constant PAYOUT = 0.02 ether;

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
        // Basic: delay >= 180 minutes AND covered reason
        if (data.delayInMinutes >= MIN_DELAY_MINUTES && _isCoveredReason(data.reasonCode)) {
            return (true, PAYOUT);
        }
        return (false, 0);
    }
}
