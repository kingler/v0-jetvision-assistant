#!/bin/bash
#
# Avinode RFQ API Test Script
# Tests RFQ retrieval patterns for Trip ID
# Loads credentials from .env.local file
#
# Required Environment Variables (in .env.local):
#   - API_TOKEN or AVINODE_API_TOKEN: Avinode API token
#   - AUTHENTICATION_TOKEN or AVINODE_BEARER_TOKEN or AVINODE_API_KEY: Bearer token for Authorization header
#
# Optional Environment Variables:
#   - BASE_URI or AVINODE_BASE_URL: API base URL (defaults to sandbox)
#   - AVINODE_EXTERNAL_ID or EXTERNAL_ID: Account ID for X-Avinode-ActAsAccount header
#
# Usage:
#   ./test-avinode-rfq.sh [TRIP_ID]
#
# Example:
#   ./test-avinode-rfq.sh B22E7Z
#   ./test-avinode-rfq.sh atrip-65262339
#

# Load environment variables from .env.local if it exists
if [[ -f .env.local ]]; then
  # Export all variables from .env.local
  # set -a automatically exports all variables that are set
  set -a
  # Source the file (bash will handle comments, empty lines, and quoted values)
  source .env.local
  set +a
  echo "✓ Loaded credentials from .env.local"
else
  echo "⚠️  Warning: .env.local not found. Using environment variables or defaults."
fi

# Avinode API Credentials
# Supports multiple environment variable names for flexibility
API_TOKEN="${API_TOKEN:-${AVINODE_API_TOKEN:-}}"
# AVINODE_API_KEY is also used as bearer token in some configurations
AUTH_TOKEN="${AUTHENTICATION_TOKEN:-${AVINODE_BEARER_TOKEN:-${AVINODE_API_KEY:-}}}"
EXTERNAL_ID="${AVINODE_EXTERNAL_ID:-${EXTERNAL_ID:-}}"
BASE_URL="${BASE_URI:-${AVINODE_BASE_URL:-https://sandbox.avinode.com/api}}"

# Validate required credentials
if [[ -z "$API_TOKEN" ]]; then
  echo "❌ Error: API_TOKEN or AVINODE_API_TOKEN is required"
  echo "   Please set it in .env.local or export it in your environment"
  exit 1
fi

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "❌ Error: AUTHENTICATION_TOKEN, AVINODE_BEARER_TOKEN, or AVINODE_API_KEY is required"
  echo "   Please set it in .env.local or export it in your environment"
  exit 1
fi

# Remove "Bearer " prefix from AUTH_TOKEN if present (script will add it)
AUTH_TOKEN="${AUTH_TOKEN#Bearer }"

# Default Trip ID to test (can be overridden via command line)
TRIP_ID="${1:-B22E7Z}"

# Generate timestamp
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

echo "============================================"
echo "  AVINODE RFQ API TEST"
echo "============================================"
echo "Trip ID: $TRIP_ID"
echo "Timestamp: $TIMESTAMP"
echo "Base URL: $BASE_URL"
echo "API Token: ${API_TOKEN:0:8}...${API_TOKEN: -4} (masked)"
echo "Auth Token: ${AUTH_TOKEN:0:20}...${AUTH_TOKEN: -10} (masked)"
if [[ -n "$EXTERNAL_ID" ]]; then
  echo "External ID: ${EXTERNAL_ID:0:8}...${EXTERNAL_ID: -4} (masked)"
else
  echo "External ID: (not set - optional)"
fi
echo ""

# Function to make API call and return raw JSON response (for processing)
# Returns JSON via stdout, HTTP status via stderr
api_call_raw() {
  local method="$1"
  local endpoint="$2"
  
  # Build curl command with base headers
  local curl_args=(
    -s
    -w "\nHTTP Status: %{http_code}\n"
    -X "$method"
    "${BASE_URL}${endpoint}"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
    -H "X-Avinode-ApiToken: $API_TOKEN"
    -H "Authorization: Bearer $AUTH_TOKEN"
    -H "X-Avinode-SentTimestamp: $TIMESTAMP"
    -H "X-Avinode-ApiVersion: v1.0"
    -H "X-Avinode-Product: Jetvision/1.0.0"
  )

  # Add ActAsAccount header only if EXTERNAL_ID is set
  if [[ -n "$EXTERNAL_ID" ]]; then
    curl_args+=(-H "X-Avinode-ActAsAccount: $EXTERNAL_ID")
  fi

  # Get full response including HTTP status
  local full_response=$(/usr/bin/curl "${curl_args[@]}")
  
  # Extract HTTP status (last line) and send to stderr
  local http_status=$(echo "$full_response" | tail -n 1)
  echo "$http_status" >&2
  
  # Return JSON response (everything except last line) via stdout
  echo "$full_response" | sed '$d'
}

# Function to make API call and display formatted response
api_call() {
  local method="$1"
  local endpoint="$2"
  local description="$3"

  echo "=== $description ==="
  echo "Endpoint: $method $endpoint"
  echo ""

  # Get raw JSON response (stdout) and HTTP status (stderr)
  local json_response=$(api_call_raw "$method" "$endpoint" 2> /tmp/http_status_$$)
  local http_status=$(cat /tmp/http_status_$$)
  rm -f /tmp/http_status_$$
  
  # Display formatted response
  echo "$json_response" | jq . 2>/dev/null || echo "$json_response"
  echo "$http_status"
  echo ""
  echo ""
}

# Function to extract quote IDs from RFQ response JSON
extract_quote_ids() {
  local json_response="$1"
  
  # Extract all quote IDs from the nested structure:
  # data.rfqs[].sellerLift[].links.quotes[].id
  echo "$json_response" | jq -r '.data.rfqs[]?.sellerLift[]?.links.quotes[]?.id // empty' 2>/dev/null | grep -v '^$' | sort -u
}

# Test 1: Get Trip Details (includes embedded RFQs)
echo "=== Test 1: GET /trips/{tripId} (Trip Details with embedded RFQs) ==="
echo "Endpoint: GET /trips/$TRIP_ID"
echo ""

# Capture the response to extract quote IDs
TRIP_RESPONSE=$(api_call_raw "GET" "/trips/$TRIP_ID" 2> /tmp/http_status_$$)
HTTP_STATUS=$(cat /tmp/http_status_$$)
rm -f /tmp/http_status_$$

# Display formatted response
echo "$TRIP_RESPONSE" | jq . 2>/dev/null || echo "$TRIP_RESPONSE"
echo "$HTTP_STATUS"
echo ""
echo ""

# Extract quote IDs from the RFQ response
QUOTE_IDS=$(extract_quote_ids "$TRIP_RESPONSE")

# Test 1.5: Get Full Quote Details for each quote found
if [[ -n "$QUOTE_IDS" ]]; then
  # Count non-empty quote IDs
  QUOTE_COUNT_TOTAL=$(echo "$QUOTE_IDS" | grep -v '^$' | wc -l | tr -d ' ')
  
  echo "============================================"
  echo "  QUOTE DETAILS EXTRACTION"
  echo "============================================"
  echo "Found $QUOTE_COUNT_TOTAL quote(s) in RFQ response"
  echo ""
  
  QUOTE_COUNT=0
  while IFS= read -r quote_id; do
    [[ -z "$quote_id" ]] && continue
    QUOTE_COUNT=$((QUOTE_COUNT + 1))
    api_call "GET" "/quotes/$quote_id" "Test 1.$QUOTE_COUNT: GET /quotes/$quote_id (Full Quote Details)"
  done <<< "$QUOTE_IDS"
  
  echo "============================================"
  echo "  Completed fetching $QUOTE_COUNT quote detail(s)"
  echo "============================================"
  echo ""
else
  echo "============================================"
  echo "  QUOTE DETAILS EXTRACTION"
  echo "============================================"
  echo "⚠️  No quotes found in RFQ response"
  echo "   This may indicate:"
  echo "   - RFQ has no quotes yet"
  echo "   - RFQ structure is different than expected"
  echo "   - Trip ID may not exist or have no RFQs"
  echo "============================================"
  echo ""
fi

# Test 2: Try to get RFQs directly (expected to fail)
api_call "GET" "/trips/$TRIP_ID/rfqs" "Test 2: GET /trips/{tripId}/rfqs (Direct RFQ endpoint - may 404)"

# Test 3: List all RFQs
api_call "GET" "/rfqs" "Test 3: GET /rfqs (List all RFQs)"

# Test 4: Get Trip Messages
api_call "GET" "/tripmsgs/$TRIP_ID" "Test 4: GET /tripmsgs/{tripId} (Trip Messages)"

# If internal trip ID is provided, test that too
if [[ "$TRIP_ID" != atrip-* ]]; then
  echo "============================================"
  echo "  Testing with internal ID format"
  echo "============================================"
  echo ""
  echo "Note: If you have the internal ID (atrip-XXXXXXXX),"
  echo "re-run this script with that ID as an argument:"
  echo "  ./test-avinode-rfq.sh atrip-65262339"
  echo ""
fi

echo "============================================"
echo "  SUMMARY"
echo "============================================"
echo ""
echo "Key findings from API testing:"
echo "1. /trips/{tripId} returns trip details WITH embedded rfqs array"
echo "2. Quote IDs are found in: data.rfqs[].sellerLift[].links.quotes[].id"
echo "3. /quotes/{quoteId} returns full quote details with pricing"
echo "4. /trips/{tripId}/rfqs may return 404 - RFQs are in trip response"
echo ""
echo "Correct pattern:"
echo "  GET /trips/{tripId} -> extract quote IDs -> GET /quotes/{quoteId}"
echo ""
