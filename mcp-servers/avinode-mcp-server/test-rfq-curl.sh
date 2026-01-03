#!/bin/bash
# Test RFQ retrieval for Trip ID using curl
# 
# Usage:
#   1. Set your credentials in this script (see below)
#   2. Run: ./test-rfq-curl.sh LS3MY2
#
# Or set environment variables:
#   export API_TOKEN="your-token"
#   export AUTH_TOKEN="your-bearer-token"
#   ./test-rfq-curl.sh LS3MY2

TRIP_ID="${1:-LS3MY2}"

# Load from .env.local if it exists
if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Get credentials (try multiple env var names)
API_TOKEN="${API_TOKEN:-${AVINODE_API_TOKEN}}"
AUTH_TOKEN="${AUTHENTICATION_TOKEN:-${AVINODE_BEARER_TOKEN}}"
BASE_URL="${BASE_URI:-${AVINODE_BASE_URL:-https://sandbox.avinode.com/api}}"

# Remove Bearer prefix if present
AUTH_TOKEN="${AUTH_TOKEN#Bearer }"

# Validate
if [ -z "$API_TOKEN" ] || [ -z "$AUTH_TOKEN" ]; then
    echo "Error: Missing credentials"
    echo "Set API_TOKEN and AUTHENTICATION_TOKEN environment variables"
    exit 1
fi

# Generate timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

# Make request
echo "Testing: GET ${BASE_URL}/rfqs/${TRIP_ID}"
echo ""

curl -v \
  -X GET \
  -H "Content-Type: application/json" \
  -H "X-Avinode-ApiToken: ${API_TOKEN}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
  -H "X-Avinode-ApiVersion: v1.0" \
  -H "X-Avinode-Product: Jetvision/1.0.0" \
  -H "Accept-Encoding: gzip" \
  "${BASE_URL}/rfqs/${TRIP_ID}?taildetails=true&typedetails=true&timestamps=true&quotebreakdown=true&latestquote=true&tailphotos=true&typephotos=true" \
  2>&1 | tee /tmp/avinode-rfq-response.json

echo ""
echo "Response saved to: /tmp/avinode-rfq-response.json"
