"""Pydantic models for the Flight Simulator API."""

from enum import IntEnum
from pydantic import BaseModel, Field


class FlightStatus(IntEnum):
    """Flight status enum - must match Solidity."""
    SCHEDULED = 0
    ON_TIME = 1
    DELAYED = 2
    CANCELLED = 3
    DIVERTED = 4


class Flight(BaseModel):
    """Flight record model."""
    flightNumber: str = Field(..., description="Flight number (e.g., 'AF123')")
    arrivalTimestamp: int = Field(..., description="Expected arrival time in epoch seconds")
    status: int = Field(default=FlightStatus.SCHEDULED, ge=0, le=4, description="Flight status (0-4)")
    delayInMinutes: int = Field(default=0, ge=0, description="Delay in minutes")
    reasonCode: int = Field(default=0, ge=0, le=65535, description="Reason code for delay/cancellation")
    updatedAt: int = Field(default=0, description="Last update timestamp")


class FlightUpdate(BaseModel):
    """Model for updating a flight."""
    flightNumber: str = Field(..., description="Flight number")
    arrivalTimestamp: int = Field(..., description="Arrival timestamp to identify the flight")
    status: int | None = Field(default=None, ge=0, le=4, description="New flight status")
    delayInMinutes: int | None = Field(default=None, ge=0, description="New delay in minutes")
    reasonCode: int | None = Field(default=None, ge=0, le=65535, description="New reason code")


class FlightCreate(BaseModel):
    """Model for creating a new flight."""
    flightNumber: str = Field(..., description="Flight number (e.g., 'AF123')")
    arrivalTimestamp: int = Field(..., description="Expected arrival time in epoch seconds")
    status: int = Field(default=FlightStatus.SCHEDULED, ge=0, le=4, description="Initial status")
    delayInMinutes: int = Field(default=0, ge=0, description="Initial delay")
    reasonCode: int = Field(default=0, ge=0, le=65535, description="Initial reason code")


class FlightKey(BaseModel):
    """Model for flight identification."""
    flightNumber: str
    arrivalTimestamp: int
