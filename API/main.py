"""FastAPI Flight Simulator - provides flight status data for the oracle."""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from config import FLIGHTS_FILE
from models import Flight, FlightCreate, FlightUpdate, FlightStatus
from storage import FlightStorage


storage = FlightStorage(FLIGHTS_FILE)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize sample flights on startup."""
    # Create sample flights if none exist
    if not storage.get_all():
        now = int(time.time())
        sample_flights = [
            Flight(
                flightNumber="AF123",
                arrivalTimestamp=now + 3600,  # 1 hour from now
                status=FlightStatus.SCHEDULED,
                delayInMinutes=0,
                reasonCode=0,
            ),
            Flight(
                flightNumber="LH456",
                arrivalTimestamp=now + 7200,  # 2 hours from now
                status=FlightStatus.SCHEDULED,
                delayInMinutes=0,
                reasonCode=0,
            ),
            Flight(
                flightNumber="BA789",
                arrivalTimestamp=now + 10800,  # 3 hours from now
                status=FlightStatus.SCHEDULED,
                delayInMinutes=0,
                reasonCode=0,
            ),
        ]
        for flight in sample_flights:
            try:
                storage.create(flight)
            except ValueError:
                pass
    yield


app = FastAPI(
    title="Flight Simulator API",
    description="Simulates flight status data for the Flight Delay Insurance dApp",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": int(time.time())}


@app.get("/flights", response_model=list[Flight])
async def list_flights():
    """List all flights."""
    return storage.get_all()


@app.get("/flights/{flight_number}/{arrival_timestamp}", response_model=Flight)
async def get_flight(flight_number: str, arrival_timestamp: int):
    """Get a specific flight by flightNumber and arrivalTimestamp."""
    flight = storage.get(flight_number, arrival_timestamp)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight {flight_number}:{arrival_timestamp} not found",
        )
    return flight


@app.post("/flights", response_model=Flight, status_code=status.HTTP_201_CREATED)
async def create_flight(flight_data: FlightCreate):
    """Create a new flight."""
    flight = Flight(
        flightNumber=flight_data.flightNumber,
        arrivalTimestamp=flight_data.arrivalTimestamp,
        status=flight_data.status,
        delayInMinutes=flight_data.delayInMinutes,
        reasonCode=flight_data.reasonCode,
    )
    try:
        return storage.create(flight)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@app.post("/simulate/update", response_model=Flight)
async def simulate_update(update: FlightUpdate):
    """
    Simulate a flight status update.

    This is the main endpoint for simulating flight delays/cancellations.
    The watcher will detect the change via updatedAt and push to the blockchain.
    """
    flight = storage.update(
        flight_number=update.flightNumber,
        arrival_timestamp=update.arrivalTimestamp,
        status=update.status,
        delay_in_minutes=update.delayInMinutes,
        reason_code=update.reasonCode,
    )
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight {update.flightNumber}:{update.arrivalTimestamp} not found",
        )
    return flight


@app.delete("/flights/{flight_number}/{arrival_timestamp}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flight(flight_number: str, arrival_timestamp: int):
    """Delete a flight."""
    deleted = storage.delete(flight_number, arrival_timestamp)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight {flight_number}:{arrival_timestamp} not found",
        )


if __name__ == "__main__":
    import uvicorn
    from config import API_HOST, API_PORT

    uvicorn.run(app, host=API_HOST, port=API_PORT)
