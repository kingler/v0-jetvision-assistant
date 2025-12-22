#!/bin/bash
# Simple test of chat API with curl

echo "=== Testing Chat API ==="
echo ""

# Make POST request and capture response
response=$(curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I need a flight from KTEB to KVNY for 4 passengers on 2025-01-20", "conversationHistory": []}' \
  --max-time 30)

echo "Response:"
echo "$response" | head -c 3000

echo ""
echo "=== Checking for deep_link ==="
if echo "$response" | grep -q "deep_link"; then
  echo "✅ deep_link found in response"
else
  echo "❌ deep_link NOT found in response"
fi

if echo "$response" | grep -q "trip_data"; then
  echo "✅ trip_data found in response"
else
  echo "❌ trip_data NOT found in response"
fi

if echo "$response" | grep -q "create_trip"; then
  echo "✅ create_trip tool was called"
else
  echo "❌ create_trip tool was NOT called"
fi
