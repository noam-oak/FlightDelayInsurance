#!/bin/bash
# Run the Oracle Watcher

cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -q -r requirements.txt

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check for required environment variable
if [ -z "$ORACLE_PRIVATE_KEY" ]; then
    echo "Error: ORACLE_PRIVATE_KEY environment variable is required"
    echo "Copy .env.example to .env and set your oracle private key"
    exit 1
fi

# Run the watcher
echo "Starting Oracle Watcher..."
python watcher.py
