#!/bin/bash
# Run the Flight Simulator API

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

# Run the API
echo "Starting Flight Simulator API on ${API_HOST:-127.0.0.1}:${API_PORT:-8000}..."
python -m uvicorn main:app --host "${API_HOST:-127.0.0.1}" --port "${API_PORT:-8000}" --reload
