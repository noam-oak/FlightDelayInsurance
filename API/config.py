"""Configuration for the Flight Simulator API and Oracle Watcher."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = Path(__file__).parent
FLIGHTS_FILE = BASE_DIR / "flights.json"
DEPLOYMENTS_FILE = BASE_DIR.parent / "dApp" / "deployments" / "localhost" / "addresses.json"

# API Settings
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Blockchain Settings
RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
ORACLE_PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", "")

# Watcher Settings
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "5"))
API_BASE_URL = os.getenv("API_BASE_URL", f"http://{API_HOST}:{API_PORT}")
