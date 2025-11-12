#!/bin/bash

echo "Testing Jetvision Routes..."
echo "=============================="
echo ""

echo "1. Testing root page (/)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
echo "   Status: $STATUS"
[ "$STATUS" = "200" ] && echo "   ✓ Root page accessible" || echo "   ✗ Root page failed"
echo ""

echo "2. Testing sign-in page (/sign-in)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/sign-in)
echo "   Status: $STATUS"
[ "$STATUS" = "200" ] && echo "   ✓ Sign-in page accessible" || echo "   ✗ Sign-in failed"
echo ""

echo "3. Testing sign-up page (/sign-up)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/sign-up)
echo "   Status: $STATUS"
[ "$STATUS" = "200" ] && echo "   ✓ Sign-up page accessible" || echo "   ✗ Sign-up failed"
echo ""

echo "4. Verifying dashboard removed (/dashboard)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/dashboard)
echo "   Status: $STATUS"
[ "$STATUS" = "404" ] && echo "   ✓ Dashboard correctly returns 404" || echo "   ✗ Dashboard still accessible"
echo ""

echo "=============================="
echo "Test complete!"
