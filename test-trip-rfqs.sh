#!/bin/bash

# Test script to retrieve RFQs for a Trip ID
# Using Avinode API: GET /api/rfqs/{tripId}
# Reference: https://developer.avinodegroup.com/reference/readtriprfqs

# Usage: ./test-trip-rfqs.sh [TRIP_ID]
# Example: ./test-trip-rfqs.sh QQ263P

TRIP_ID="${1:-QQ263P}"
BASE_URL="https://sandbox.avinode.com/api"

# Check if API key is set
if [ -z "$AVINODE_API_KEY" ]; then
  echo "Error: AVINODE_API_KEY environment variable is not set"
  echo "Please set it with: export AVINODE_API_KEY=your-api-key"
  exit 1
fi

echo "=========================================="
echo "Testing Avinode API: Get RFQs for Trip ID"
echo "=========================================="
echo "Trip ID: $TRIP_ID"
echo "Endpoint: $BASE_URL/rfqs/$TRIP_ID"
echo "API Reference: https://developer.avinodegroup.com/reference/readtriprfqs"
echo ""

# Make the API request with pretty JSON output
curl --request GET \
  --url "$BASE_URL/rfqs/$TRIP_ID" \
  --header "accept: application/json" \
  --header "Authorization: Bearer $AVINODE_API_KEY" \
  --header "Content-Type: application/json" \
  -s \
  -w "\n\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || curl --request GET \
  --url "$BASE_URL/rfqs/$TRIP_ID" \
  --header "accept: application/json" \
  --header "Authorization: Bearer $AVINODE_API_KEY" \
  --header "Content-Type: application/json" \
  -s \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "Done."
