#!/bin/bash

# Wall-E Load Test Execution Script
# This script runs load tests with predefined parameters

set -e

# Default configuration
USERS=${LOAD_TEST_USERS:-100}
SPAWN_RATE=${LOAD_TEST_SPAWN_RATE:-10}
DURATION=${LOAD_TEST_DURATION:-10m}
HOST=${API_HOST:-http://localhost:3000}
REPORT_DIR=${REPORT_OUTPUT_DIR:-./reports}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Wall-E Load Test Execution ===${NC}"
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
REPORT_PREFIX="${REPORT_DIR}/load_test_${TIMESTAMP}"

echo -e "${YELLOW}Starting load test...${NC}"

# Check if system is ready
echo -e "${BLUE}Checking if API is available...${NC}"
if ! curl -s "${HOST}/health" > /dev/null 2>&1; then
    echo -e "${RED}Warning: API health check failed. Continuing anyway...${NC}"
fi

# Run load test
locust \
    -f load_test.py \
    --host="${HOST}" \
    --users="${USERS}" \
    --spawn-rate="${SPAWN_RATE}" \
    --run-time="${DURATION}" \
    --headless \
    --html="${REPORT_PREFIX}.html" \
    --csv="${REPORT_PREFIX}" \
    --loglevel=INFO \
    --logfile="${REPORT_PREFIX}.log"

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Load test completed successfully!${NC}"
    
    # Display summary
    echo -e "${BLUE}Report files generated:${NC}"
    echo -e "  HTML Report: ${REPORT_PREFIX}.html"
    echo -e "  CSV Stats: ${REPORT_PREFIX}_stats.csv"
    echo -e "  CSV History: ${REPORT_PREFIX}_stats_history.csv"
    echo -e "  CSV Failures: ${REPORT_PREFIX}_failures.csv"
    echo -e "  Log File: ${REPORT_PREFIX}.log"
    
    # Run performance validation
    echo -e "${YELLOW}Running performance validation...${NC}"
    python3 -c "
import sys
sys.path.append('.')
from load_test import validate_performance_thresholds
from locust.env import Environment

# This is a simplified validation - in real scenario you'd parse the CSV results
print('Performance validation would be implemented here')
print('Check the HTML report for detailed metrics')
"
    
else
    echo -e "${RED}Load test failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Load test execution completed.${NC}" 