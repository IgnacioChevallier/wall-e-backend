#!/bin/bash

# Wall-E Stress Test Execution Script
# This script runs stress tests to find system breaking points

set -e

# Default configuration
USERS=${STRESS_TEST_USERS:-1000}
SPAWN_RATE=${STRESS_TEST_SPAWN_RATE:-50}
DURATION=${STRESS_TEST_DURATION:-15m}
HOST=${API_HOST:-http://localhost:3000}
REPORT_DIR=${REPORT_OUTPUT_DIR:-./reports}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}=== Wall-E Stress Test Execution ===${NC}"
echo -e "${RED}WARNING: This test is designed to stress the system to its limits!${NC}"
echo -e "${RED}Monitor system resources closely during execution.${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Users: ${USERS}"
echo -e "  Spawn Rate: ${SPAWN_RATE}"
echo -e "  Duration: ${DURATION}"
echo -e "  Host: ${HOST}"
echo -e "  Report Directory: ${REPORT_DIR}"
echo ""

# Create reports directory
mkdir -p "${REPORT_DIR}"

# Generate timestamp for reports
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_PREFIX="${REPORT_DIR}/stress_test_${TIMESTAMP}"

echo -e "${YELLOW}Starting stress test...${NC}"

# Check if system is ready
echo -e "${BLUE}Checking if API is available...${NC}"
if ! curl -s "${HOST}/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: API health check failed. Cannot proceed with stress test.${NC}"
    exit 1
fi

# System resource monitoring setup
echo -e "${BLUE}Setting up system monitoring...${NC}"
MONITOR_PID=""
if command -v top >/dev/null 2>&1; then
    # Start background monitoring
    (while true; do
        echo "$(date): $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)% CPU, $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')% Memory" >> "${REPORT_PREFIX}_system.log"
        sleep 5
    done) &
    MONITOR_PID=$!
    echo -e "${GREEN}System monitoring started (PID: $MONITOR_PID)${NC}"
fi

# Function to cleanup monitoring
cleanup() {
    if [ ! -z "$MONITOR_PID" ]; then
        echo -e "${YELLOW}Stopping system monitoring...${NC}"
        kill $MONITOR_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Run stress test with stepped user increase
echo -e "${PURPLE}Running stress test with stepped increase...${NC}"

# Start with base load
STEP_USERS=$((USERS / 4))
STEP_DURATION="3m"

echo -e "${BLUE}Step 1: ${STEP_USERS} users for ${STEP_DURATION}${NC}"
locust \
    -f stress_test.py \
    --host="${HOST}" \
    --users="${STEP_USERS}" \
    --spawn-rate="${SPAWN_RATE}" \
    --run-time="${STEP_DURATION}" \
    --headless \
    --html="${REPORT_PREFIX}_step1.html" \
    --csv="${REPORT_PREFIX}_step1" \
    --loglevel=INFO \
    --logfile="${REPORT_PREFIX}_step1.log"

echo -e "${BLUE}Step 2: $((STEP_USERS * 2)) users for ${STEP_DURATION}${NC}"
locust \
    -f stress_test.py \
    --host="${HOST}" \
    --users="$((STEP_USERS * 2))" \
    --spawn-rate="${SPAWN_RATE}" \
    --run-time="${STEP_DURATION}" \
    --headless \
    --html="${REPORT_PREFIX}_step2.html" \
    --csv="${REPORT_PREFIX}_step2" \
    --loglevel=INFO \
    --logfile="${REPORT_PREFIX}_step2.log"

echo -e "${BLUE}Step 3: $((STEP_USERS * 3)) users for ${STEP_DURATION}${NC}"
locust \
    -f stress_test.py \
    --host="${HOST}" \
    --users="$((STEP_USERS * 3))" \
    --spawn-rate="${SPAWN_RATE}" \
    --run-time="${STEP_DURATION}" \
    --headless \
    --html="${REPORT_PREFIX}_step3.html" \
    --csv="${REPORT_PREFIX}_step3" \
    --loglevel=INFO \
    --logfile="${REPORT_PREFIX}_step3.log"

echo -e "${PURPLE}Final Step: ${USERS} users for ${DURATION}${NC}"
locust \
    -f stress_test.py \
    --host="${HOST}" \
    --users="${USERS}" \
    --spawn-rate="${SPAWN_RATE}" \
    --run-time="${DURATION}" \
    --headless \
    --html="${REPORT_PREFIX}_final.html" \
    --csv="${REPORT_PREFIX}_final" \
    --loglevel=INFO \
    --logfile="${REPORT_PREFIX}_final.log"

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Stress test completed!${NC}"
    
    # Display summary
    echo -e "${BLUE}Report files generated:${NC}"
    echo -e "  Step 1 HTML: ${REPORT_PREFIX}_step1.html"
    echo -e "  Step 2 HTML: ${REPORT_PREFIX}_step2.html"
    echo -e "  Step 3 HTML: ${REPORT_PREFIX}_step3.html"
    echo -e "  Final HTML: ${REPORT_PREFIX}_final.html"
    echo -e "  System Log: ${REPORT_PREFIX}_system.log"
    
    # Run breaking point analysis
    echo -e "${YELLOW}Running breaking point analysis...${NC}"
    python3 -c "
import sys
sys.path.append('.')
from stress_test import detect_breaking_point, stress_test_analysis
from locust.env import Environment

print('Breaking point analysis would be implemented here')
print('Check the HTML reports for detailed metrics')
print('System monitoring log: ${REPORT_PREFIX}_system.log')
"
    
else
    echo -e "${RED}Stress test failed or was interrupted!${NC}"
    echo -e "${YELLOW}This might indicate the system reached its breaking point.${NC}"
    exit 1
fi

echo -e "${PURPLE}Stress test execution completed.${NC}"
echo -e "${YELLOW}Review all generated reports to understand system behavior under stress.${NC}" 