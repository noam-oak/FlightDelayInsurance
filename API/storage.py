"""JSON file storage for flight data."""

import json
import time
from pathlib import Path
from threading import Lock

from models import Flight


class FlightStorage:
    """Thread-safe JSON file storage for flights."""

    def __init__(self, file_path: Path):
        self.file_path = file_path
        self._lock = Lock()
        self._ensure_file()

    def _ensure_file(self) -> None:
        """Create the JSON file if it doesn't exist."""
        if not self.file_path.exists():
            self.file_path.write_text("[]")

    def _load(self) -> list[dict]:
        """Load all flights from file."""
        with open(self.file_path, "r") as f:
            return json.load(f)

    def _save(self, flights: list[dict]) -> None:
        """Save all flights to file."""
        with open(self.file_path, "w") as f:
            json.dump(flights, f, indent=2)

    @staticmethod
    def _make_key(flight_number: str, arrival_timestamp: int) -> str:
        """Create a unique key for a flight."""
        return f"{flight_number}:{arrival_timestamp}"

    def get_all(self) -> list[Flight]:
        """Get all flights."""
        with self._lock:
            data = self._load()
            return [Flight(**f) for f in data]

    def get(self, flight_number: str, arrival_timestamp: int) -> Flight | None:
        """Get a flight by its unique key."""
        with self._lock:
            data = self._load()
            for f in data:
                if f["flightNumber"] == flight_number and f["arrivalTimestamp"] == arrival_timestamp:
                    return Flight(**f)
            return None

    def create(self, flight: Flight) -> Flight:
        """Create a new flight."""
        with self._lock:
            data = self._load()
            # Check for duplicates
            for f in data:
                if f["flightNumber"] == flight.flightNumber and f["arrivalTimestamp"] == flight.arrivalTimestamp:
                    raise ValueError(f"Flight {flight.flightNumber}:{flight.arrivalTimestamp} already exists")

            flight_dict = flight.model_dump()
            flight_dict["updatedAt"] = int(time.time())
            data.append(flight_dict)
            self._save(data)
            return Flight(**flight_dict)

    def update(
        self,
        flight_number: str,
        arrival_timestamp: int,
        status: int | None = None,
        delay_in_minutes: int | None = None,
        reason_code: int | None = None,
    ) -> Flight | None:
        """Update a flight and increment updatedAt."""
        with self._lock:
            data = self._load()
            for i, f in enumerate(data):
                if f["flightNumber"] == flight_number and f["arrivalTimestamp"] == arrival_timestamp:
                    if status is not None:
                        f["status"] = status
                    if delay_in_minutes is not None:
                        f["delayInMinutes"] = delay_in_minutes
                    if reason_code is not None:
                        f["reasonCode"] = reason_code
                    # Monotonic updatedAt
                    f["updatedAt"] = int(time.time())
                    data[i] = f
                    self._save(data)
                    return Flight(**f)
            return None

    def delete(self, flight_number: str, arrival_timestamp: int) -> bool:
        """Delete a flight."""
        with self._lock:
            data = self._load()
            original_len = len(data)
            data = [
                f for f in data
                if not (f["flightNumber"] == flight_number and f["arrivalTimestamp"] == arrival_timestamp)
            ]
            if len(data) < original_len:
                self._save(data)
                return True
            return False
