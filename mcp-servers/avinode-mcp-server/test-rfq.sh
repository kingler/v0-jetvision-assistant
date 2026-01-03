#!/bin/bash

# Test script to retrieve RFQs for a Trip ID using curl
# Usage: ./test-rfq.sh <TRIP_ID>
# Example: ./test-rfq.sh LS3MY2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get trip ID from command line argument
TRIP_ID="${1:-LS3MY2}"

echo -e "${YELLOW}Testing Avinode API: Get RFQs for Trip ID: ${TRIP_ID}${NC}"
echo ""

# Load environment variables from .env.local
ENV_FILE="$(dirname "$0")/.env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env.local file not found at: $ENV_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Loading credentials from: $ENV_FILE${NC}"

# Source the .env.local file
# This will load API_TOKEN, AUTHENTICATION_TOKEN, BASE_URI, etc.
set -a
source "$ENV_FILE"
set +a

# Get required environment variables
API_TOKEN="${API_TOKEN:-${AVINODE_API_TOKEN}}"
AUTH_TOKEN="${AUTHENTICATION_TOKEN:-${AVINODE_BEARER_TOKEN}}"
BASE_URL="${BASE_URI:-${AVINODE_BASE_URL:-https://sandbox.avinode.com/api}}"

# Validate required credentials
if [ -z "$API_TOKEN" ]; then
    echo -e "${RED}Error: API_TOKEN or AVINODE_API_TOKEN not found in .env.local${NC}"
    exit 1
fi

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}Error: AUTHENTICATION_TOKEN or AVINODE_BEARER_TOKEN not found in .env.local${NC}"
    exit 1
fi

# Remove "Bearer " prefix if present
AUTH_TOKEN="${AUTH_TOKEN#Bearer }"

echo -e "${GREEN}✓ Credentials loaded${NC}"
echo -e "  Base URL: ${BASE_URL}"
echo -e "  API Token: ${API_TOKEN:0:20}... (truncated)"
echo -e "  Auth Token: ${AUTH_TOKEN:0:20}... (truncated)"
echo ""

# Construct API endpoint
ENDPOINT="${BASE_URL}/rfqs/${TRIP_ID}"

# Generate ISO-8601 UTC timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

echo -e "${YELLOW}Making API request...${NC}"
echo -e "  Endpoint: ${ENDPOINT}"
echo -e "  Method: GET"
echo -e "  Timestamp: ${TIMESTAMP}"
echo ""

# Make the API call with curl
# Include all required headers per Avinode API documentation
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET \
    -H "Content-Type: application/json" \
    -H "X-Avinode-ApiToken: ${API_TOKEN}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
    -H "X-Avinode-ApiVersion: v1.0" \
    -H "X-Avinode-Product: Jetvision/1.0.0" \
    -H "Accept-Encoding: gzip" \
    "${ENDPOINT}?taildetails=true&typedetails=true&timestamps=true&quotebreakdown=true&latestquote=true&tailphotos=true&typephotos=true")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${YELLOW}Response:${NC}"
echo -e "  HTTP Status: ${HTTP_CODE}"
echo ""

# Check HTTP status code
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Request successful${NC}"
    echo ""
    echo -e "${YELLOW}Response Body:${NC}"
    
    # Pretty print JSON if jq is available, otherwise just print
    if command -v jq &> /dev/null; then
        echo "$BODY" | jq '.'
    else
        echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    fi
    
    echo ""
    
    # Check if response is an array
    if echo "$BODY" | grep -q '^\['; then
        ARRAY_LENGTH=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "unknown")
        echo -e "${GREEN}Response is an array with ${ARRAY_LENGTH} RFQ(s)${NC}"
        
        if [ "$ARRAY_LENGTH" = "0" ]; then
            echo -e "${YELLOW}⚠ Warning: Array is empty - no RFQs found for Trip ID ${TRIP_ID}${NC}"
        fi
    elif echo "$BODY" | grep -q '^{'; then
        echo -e "${YELLOW}Response is an object (single RFQ or wrapped response)${NC}"
        
        # Check for nested arrays
        if echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print('data' in data and isinstance(data['data'], list))" 2>/dev/null | grep -q True; then
            echo -e "${GREEN}Found nested array in response.data${NC}"
        fi
        if echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print('rfqs' in data and isinstance(data['rfqs'], list))" 2>/dev/null | grep -q True; then
            echo -e "${GREEN}Found nested array in response.rfqs${NC}"
        fi
    fi
    
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${RED}✗ Authentication failed (401 Unauthorized)${NC}"
    echo -e "${YELLOW}Check your API_TOKEN and AUTHENTICATION_TOKEN${NC}"
    echo ""
    echo "$BODY"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${RED}✗ Trip ID not found (404 Not Found)${NC}"
    echo -e "${YELLOW}Trip ID: ${TRIP_ID}${NC}"
    echo ""
    echo "$BODY"
elif [ "$HTTP_CODE" -eq 429 ]; then
    echo -e "${RED}✗ Rate limited (429 Too Many Requests)${NC}"
    echo -e "${YELLOW}Wait a moment and try again${NC}"
    echo ""
    echo "$BODY"
else
    echo -e "${RED}✗ Request failed with status ${HTTP_CODE}${NC}"
    echo ""
    echo "$BODY"
fi

echo ""
echo -e "${YELLOW}Test completed${NC}"
