// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInsuranceProduct {
    enum FlightStatus { SCHEDULED, ON_TIME, DELAYED, CANCELLED, DIVERTED }

    struct FlightData {
        bytes32 flightId;
        string flightNumber;
        uint64 arrivalTimestamp;
        uint32 delayInMinutes;
        uint16 reasonCode;
        FlightStatus status;
        uint64 updatedAt;
    }

    function productId() external view returns (uint32);
    function premiumWei() external view returns (uint256);
    function maxPayoutWei() external view returns (uint256);

    /// @notice Evaluates if a payout is due based on flight data
    /// @param data The flight data to evaluate
    /// @return eligible Whether the policy holder is eligible for a payout
    /// @return payoutWei The amount of the payout in wei
    function evaluatePayout(FlightData calldata data) external view returns (bool eligible, uint256 payoutWei);
}
