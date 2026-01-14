#!/bin/bash
# =============================================================================
# Flight Delay Insurance dApp - Full Project Launcher
# =============================================================================
# This script launches all components of the Flight Delay Insurance project:
# - Hardhat local blockchain node (port 8545)
# - API server (port 8000)
# - Oracle watcher service
# - Web frontend (port 3000)
#
# All services are accessible from: localhost
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Network configuration
HOST_IP="127.0.0.1"

# Ports
BLOCKCHAIN_PORT=8545
API_PORT=8000
WEB_PORT=3000

# PID files for cleanup
PID_DIR="$PROJECT_ROOT/.pids"
mkdir -p "$PID_DIR"

echo -e "${BLUE}"
cat << 'EOF'
 ███████████ ████   ███           █████       █████    ██████████            ████                      
░░███░░░░░░█░░███  ░░░           ░░███       ░░███    ░░███░░░░███          ░░███                      
 ░███   █ ░  ░███  ████   ███████ ░███████   ███████   ░███   ░░███  ██████  ░███   ██████   █████ ████
 ░███████    ░███ ░░███  ███░░███ ░███░░███ ░░░███░    ░███    ░███ ███░░███ ░███  ░░░░░███ ░░███ ░███ 
 ░███░░░█    ░███  ░███ ░███ ░███ ░███ ░███   ░███     ░███    ░███░███████  ░███   ███████  ░███ ░███ 
 ░███  ░     ░███  ░███ ░███ ░███ ░███ ░███   ░███ ███ ░███    ███ ░███░░░   ░███  ███░░███  ░███ ░███ 
 █████       █████ █████░░███████ ████ █████  ░░█████  ██████████  ░░██████  █████░░████████ ░░███████ 
░░░░░       ░░░░░ ░░░░░  ░░░░░███░░░░ ░░░░░    ░░░░░  ░░░░░░░░░░    ░░░░░░  ░░░░░  ░░░░░░░░   ░░░░░███ 
                         ███ ░███                                                             ███ ░███ 
                        ░░██████                                                             ░░██████  
                         ░░░░░░                                                               ░░░░░░   
 █████                                                                                                 
░░███                                                                                                  
 ░███  ████████    █████  █████ ████ ████████   ██████   ████████    ██████   ██████                   
 ░███ ░░███░░███  ███░░  ░░███ ░███ ░░███░░███ ░░░░░███ ░░███░░███  ███░░███ ███░░███                  
 ░███  ░███ ░███ ░░█████  ░███ ░███  ░███ ░░░   ███████  ░███ ░███ ░███ ░░░ ░███████                   
 ░███  ░███ ░███  ░░░░███ ░███ ░███  ░███      ███░░███  ░███ ░███ ░███  ███░███░░░                    
 █████ ████ █████ ██████  ░░████████ █████    ░░████████ ████ █████░░██████ ░░██████                   
░░░░░ ░░░░ ░░░░░ ░░░░░░    ░░░░░░░░ ░░░░░      ░░░░░░░░ ░░░░ ░░░░░  ░░░░░░   ░░░░░░                    
EOF
echo -e "${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down all services...${NC}"
    
    for pidfile in "$PID_DIR"/*.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "  Stopping $(basename "$pidfile" .pid) (PID: $pid)..."
                kill "$pid" 2>/dev/null || true
            fi
            rm -f "$pidfile"
        fi
    done
    
    # Also kill any child processes
    pkill -P $$ 2>/dev/null || true
    
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM EXIT

# Kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "  ${YELLOW}Killing existing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Free up all required ports
free_ports() {
    echo -e "${YELLOW}Checking for processes on required ports...${NC}"
    kill_port $BLOCKCHAIN_PORT
    kill_port $API_PORT
    kill_port $WEB_PORT
    echo -e "${GREEN}  ✓ Ports are available${NC}"
    echo ""
}

# Check dependencies
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Error: Python 3 is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}  ✓ All dependencies found${NC}"
    echo ""
}

# Start Hardhat node
start_blockchain() {
    echo -e "${YELLOW}[1/4] Starting Hardhat blockchain node...${NC}"
    cd "$PROJECT_ROOT/dApp"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "  Installing dApp dependencies..."
        npm install --silent
    fi
    
    # Start Hardhat node bound to the specified IP
    npx hardhat node --hostname "$HOST_IP" --port "$BLOCKCHAIN_PORT" &
    echo $! > "$PID_DIR/blockchain.pid"
    
    # Wait for blockchain to be ready
    echo -e "  Waiting for blockchain to start..."
    sleep 5
    
    echo -e "${GREEN}  ✓ Blockchain running at http://${HOST_IP}:${BLOCKCHAIN_PORT}${NC}"
    echo ""
}

# Deploy contracts
deploy_contracts() {
    echo -e "${YELLOW}[2/4] Deploying smart contracts...${NC}"
    cd "$PROJECT_ROOT/dApp"
    
    # Deploy contracts to localhost network
    npx hardhat run scripts/01_deploy_products.ts --network localhost
    npx hardhat run scripts/02_deploy_hub.ts --network localhost
    npx hardhat run scripts/03_register_products.ts --network localhost
    npx hardhat run scripts/04_seed_pool.ts --network localhost
    
    # Wait for contracts to be deployed
    sleep 5
    
    echo -e "${GREEN}  ✓ Contracts deployed${NC}"
    echo ""
}

# Start API server
start_api() {
    echo -e "${YELLOW}[3/4] Starting API server...${NC}"
    cd "$PROJECT_ROOT/API"
    
    # Check if uv is installed, install if not
    if ! command -v uv &> /dev/null; then
        echo -e "  Installing uv package manager..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    # Create venv and install dependencies using uv
    echo -e "  Setting up Python environment..."
    uv venv .venv
    uv pip install -r requirements.txt
    
    # Load env vars from .env first (will be overridden below)
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Override with script's environment variables
    export API_HOST="$HOST_IP"
    export API_PORT="$API_PORT"
    export RPC_URL="http://${HOST_IP}:${BLOCKCHAIN_PORT}"
    export API_BASE_URL="http://${HOST_IP}:${API_PORT}"
    
    # Start API server using the venv created by uv
    .venv/bin/python -m uvicorn main:app --host "$HOST_IP" --port "$API_PORT" &
    echo $! > "$PID_DIR/api.pid"
    
    sleep 2
    echo -e "${GREEN}  ✓ API running at http://${HOST_IP}:${API_PORT}${NC}"
    echo ""
}

# Start Oracle Watcher
start_watcher() {
    echo -e "${YELLOW}[3b/4] Starting Oracle watcher...${NC}"
    cd "$PROJECT_ROOT/API"
    
    # Load env vars from .env first (will be overridden below)
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Override with script's environment variables
    export API_HOST="$HOST_IP"
    export API_PORT="$API_PORT"
    export RPC_URL="http://${HOST_IP}:${BLOCKCHAIN_PORT}"
    export API_BASE_URL="http://${HOST_IP}:${API_PORT}"
    
    # Check for oracle key
    if [ -z "$ORACLE_PRIVATE_KEY" ]; then
        echo -e "${YELLOW}  Warning: ORACLE_PRIVATE_KEY not set. Oracle watcher may not work.${NC}"
        echo -e "${YELLOW}  Set it in API/.env file${NC}"
    fi
    
    # Start watcher using the venv created by uv
    .venv/bin/python watcher.py &
    echo $! > "$PID_DIR/watcher.pid"
    
    sleep 1
    echo -e "${GREEN}  ✓ Oracle watcher started${NC}"
    echo ""
}

# Start Web frontend
start_web() {
    echo -e "${YELLOW}[4/4] Starting Web frontend...${NC}"
    cd "$PROJECT_ROOT/Web"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "  Installing Web dependencies..."
        npm install --silent
    fi
    
    # Export environment variables for Next.js
    export NEXT_PUBLIC_FLIGHT_API_URL="http://${HOST_IP}:${API_PORT}"
    export NEXT_PUBLIC_RPC_URL="http://${HOST_IP}:${BLOCKCHAIN_PORT}"
    export NEXT_PUBLIC_CHAIN_ID="31337"
    
    # Start Next.js dev server
    npm run dev -- --port "$WEB_PORT" &
    echo $! > "$PID_DIR/web.pid"
    
    sleep 3
    echo -e "${GREEN}  ✓ Web frontend running at http://${HOST_IP}:${WEB_PORT}${NC}"
    echo ""
}

# Main execution
main() {
    check_dependencies
    free_ports
    start_blockchain
    deploy_contracts
    start_api
    start_watcher
    start_web
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}All services are running!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${YELLOW}Blockchain:${NC}  http://${HOST_IP}:${BLOCKCHAIN_PORT}"
    echo -e "  ${YELLOW}API:${NC}         http://${HOST_IP}:${API_PORT}"
    echo -e "  ${YELLOW}Website:${NC}     http://${HOST_IP}:${WEB_PORT}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    
    # Keep script running
    wait
}

main
