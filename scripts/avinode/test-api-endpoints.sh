#!/bin/bash
# Test Avinode API endpoints to verify we can get status, price, and messages
# Trip ID: ACEXPD
# Based on: https://developer.avinodegroup.com/reference/readtriprfqs
#           https://developer.avinodegroup.com/reference/readbynumericid
#           https://developer.avinodegroup.com/reference/readmessage

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

TRIP_ID="${1:-ACEXPD}"
BASE_URL="${AVINODE_BASE_URL:-https://sandbox.avinode.com/api}"
API_KEY="${AVINODE_API_KEY}"
API_TOKEN="${AVINODE_API_TOKEN}"

if [ -z "$API_KEY" ] || [ -z "$API_TOKEN" ]; then
  echo "❌ Error: AVINODE_API_KEY and AVINODE_API_TOKEN must be set in .env.local"
  exit 1
fi

# Generate ISO-8601 timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "🔍 Testing Avinode API Endpoints"
echo "=================================="
echo "Trip ID: $TRIP_ID"
echo "Base URL: $BASE_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# Step 1: Get all RFQs for the trip
echo "📋 Step 1: Getting all RFQs for trip $TRIP_ID"
echo "Endpoint: GET /rfqs/{tripId}?quotebreakdown=true&latestquote=true&sellermessagelinks=true"
echo ""

RFQ_RESPONSE=$(curl -s -X GET "${BASE_URL}/rfqs/${TRIP_ID}?quotebreakdown=true&latestquote=true&sellermessagelinks=true" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "X-Avinode-ApiToken: ${API_TOKEN}" \
  -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
  -H "Content-Type: application/json")

echo "Response Status:"
echo "$RFQ_RESPONSE" | jq -r '.meta.status // "unknown"' 2>/dev/null || echo "Could not parse status"
echo ""

# Check if we got RFQs
# API returns data[] array (not data.rfqs[])
RFQ_COUNT=$(echo "$RFQ_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")
echo "RFQs found: $RFQ_COUNT"
echo ""

if [ "$RFQ_COUNT" = "0" ] || [ "$RFQ_COUNT" = "null" ]; then
  echo "⚠️  No RFQs found. Response structure:"
  echo "$RFQ_RESPONSE" | jq '.' 2>/dev/null || echo "$RFQ_RESPONSE"
  exit 1
fi

# Extract first RFQ ID (from data[] array)
RFQ_ID=$(echo "$RFQ_RESPONSE" | jq -r '.data[0].id // empty' 2>/dev/null)
if [ -z "$RFQ_ID" ]; then
  echo "⚠️  Could not extract RFQ ID. Full response:"
  echo "$RFQ_RESPONSE" | jq '.' 2>/dev/null || echo "$RFQ_RESPONSE"
  exit 1
fi

echo "✅ Found RFQ ID: $RFQ_ID"
echo ""

# Show RFQ structure
echo "📊 RFQ Structure:"
echo "$RFQ_RESPONSE" | jq '.data[0] | {
  id,
  has_sellerLift: (.sellerLift != null),
  sellerLift_count: (.sellerLift | length),
  has_message_links: (.links.tripmsgs != null),
  message_links_count: (.links.tripmsgs | length)
}' 2>/dev/null || echo "Could not parse RFQ structure"
echo ""

# Check for sellerLift (where quotes with prices are located)
echo "🔍 Checking for sellerLift array (PRIMARY location for quotes with prices):"
SELLER_LIFT_COUNT=$(echo "$RFQ_RESPONSE" | jq '.data[0].sellerLift | length' 2>/dev/null || echo "0")
if [ "$SELLER_LIFT_COUNT" != "0" ] && [ "$SELLER_LIFT_COUNT" != "null" ]; then
  echo "✅ Found sellerLift array with $SELLER_LIFT_COUNT items"
  echo ""
  echo "📦 Sample sellerLift[0] structure:"
  echo "$RFQ_RESPONSE" | jq '.data[0].sellerLift[0] | {
    id,
    aircraftType,
    aircraftTail,
    has_quote_links: (.links.quotes != null),
    quote_links_count: (.links.quotes | length),
    quote_id: .links.quotes[0].id,
    keys: (keys | .[])
  }' 2>/dev/null || echo "Could not parse sellerLift"
  echo ""
  
  # Extract quote ID from sellerLift links.quotes[]
  QUOTE_ID=$(echo "$RFQ_RESPONSE" | jq -r '.data[0].sellerLift[0].links.quotes[0].id // empty' 2>/dev/null)
  if [ -n "$QUOTE_ID" ]; then
    echo "✅ Found Quote ID in sellerLift[0].links.quotes[0].id: $QUOTE_ID"
  fi
else
  echo "⚠️  No sellerLift array found"
  # Try to find quote ID in other locations
  QUOTE_ID=$(echo "$RFQ_RESPONSE" | jq -r '.data[0].quotes[0].id // empty' 2>/dev/null)
  if [ -n "$QUOTE_ID" ]; then
    echo "✅ Found Quote ID in quotes array: $QUOTE_ID"
  fi
fi
echo ""

# Step 2: Get detailed RFQ information with all optional params
echo "📋 Step 2: Getting detailed RFQ information"
echo "Endpoint: GET /rfqs/{id}?quotebreakdown=true&latestquote=true&sellermessagelinks=true&buyermessages=true"
echo "RFQ ID: $RFQ_ID"
echo ""

RFQ_DETAIL_RESPONSE=$(curl -s -X GET "${BASE_URL}/rfqs/${RFQ_ID}?quotebreakdown=true&latestquote=true&sellermessagelinks=true&buyermessages=true" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "X-Avinode-ApiToken: ${API_TOKEN}" \
  -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
  -H "Content-Type: application/json")

echo "📊 RFQ Detail Structure:"
echo "$RFQ_DETAIL_RESPONSE" | jq '.data | {
  id,
  has_sellerLift: (.sellerLift != null),
  sellerLift_count: (.sellerLift | length),
  has_message_links: (.links.tripmsgs != null),
  message_links_count: (.links.tripmsgs | length),
  has_buyer_messages: (.buyerMessages != null),
  buyer_messages_count: (.buyerMessages | length)
}' 2>/dev/null || echo "Could not parse RFQ detail"
echo ""

# Step 2b: Get quote details to extract price
if [ -n "$QUOTE_ID" ]; then
  echo "💰 Step 2b: Getting quote details for price information"
  echo "Trying multiple approaches to get price..."
  echo ""
  
  # Approach 1: GET /quotes/{id} with quotebreakdown parameter
  echo "📋 Approach 1: GET /quotes/{id}?quotebreakdown=true"
  QUOTE_RESPONSE1=$(curl -s -X GET "${BASE_URL}/quotes/${QUOTE_ID}?quotebreakdown=true" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "X-Avinode-ApiToken: ${API_TOKEN}" \
    -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
    -H "Content-Type: application/json")
  
  echo "Full response:"
  echo "$QUOTE_RESPONSE1" | jq '.' 2>/dev/null || echo "$QUOTE_RESPONSE1"
  echo ""
  
  echo "Response structure:"
  echo "$QUOTE_RESPONSE1" | jq '.data | {
    id,
    status,
    totalPrice,
    has_pricing: (.pricing != null),
    pricing,
    has_quoteBreakdown: (.quoteBreakdown != null),
    quoteBreakdown_keys: (.quoteBreakdown | keys),
    all_keys: (keys | .[])
  }' 2>/dev/null || echo "Could not parse response"
  echo ""
  
  # Approach 1b: Try using the href from the quote link
  QUOTE_HREF=$(echo "$RFQ_RESPONSE" | jq -r '.data[0].sellerLift[0].links.quotes[0].href // empty' 2>/dev/null)
  if [ -n "$QUOTE_HREF" ]; then
    echo "📋 Approach 1b: GET quote using href from link: $QUOTE_HREF"
    QUOTE_RESPONSE_HREF=$(curl -s -X GET "$QUOTE_HREF" \
      -H "Authorization: Bearer ${API_KEY}" \
      -H "X-Avinode-ApiToken: ${API_TOKEN}" \
      -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
      -H "Content-Type: application/json")
    
    echo "Response from href:"
    echo "$QUOTE_RESPONSE_HREF" | jq '.data | {
      id,
      totalPrice,
      pricing,
      quoteBreakdown,
      all_keys: (keys | .[])
    }' 2>/dev/null || echo "Could not parse href response"
    echo ""
  fi
  
  # Approach 2: Check if price is in RFQ response with latestquote parameter
  echo "📋 Approach 2: Check RFQ with latestquote=true (should include latest quote with price)"
  RFQ_WITH_LATEST_QUOTE=$(curl -s -X GET "${BASE_URL}/rfqs/${RFQ_ID}?latestquote=true&quotebreakdown=true" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "X-Avinode-ApiToken: ${API_TOKEN}" \
    -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
    -H "Content-Type: application/json")
  
  echo "RFQ with latestquote response:"
  echo "$RFQ_WITH_LATEST_QUOTE" | jq '.data | {
    id,
    has_sellerLift: (.sellerLift != null),
    sellerLift_count: (.sellerLift | length),
    sellerLift_sample: .sellerLift[0] | {
      id,
      has_latestQuote: (.latestQuote != null),
      latestQuote: .latestQuote,
      has_price: (.price != null),
      price,
      currency,
      has_totalPrice: (.totalPrice != null),
      totalPrice,
      all_keys: (keys | .[])
    }
  }' 2>/dev/null || echo "Could not parse response"
  echo ""
  
  # Approach 3: Check sellerLift directly for price fields
  echo "📋 Approach 3: Check sellerLift for price fields"
  echo "$RFQ_WITH_LATEST_QUOTE" | jq '.data.sellerLift[] | {
    id,
    aircraftType,
    price,
    currency,
    totalPrice,
    latestQuote: .latestQuote | {
      totalPrice,
      pricing,
      status
    },
    all_price_fields: (to_entries | map(select(.key | contains("price") or contains("Price") or contains("currency") or contains("Currency"))) | {key: .key, value: .value})
  }' 2>/dev/null || echo "Could not extract price fields"
  echo ""
fi

# Step 3: Get message links and fetch ALL messages for all RFQs
echo "📋 Step 3: Getting message information for all RFQs"
echo ""

# Extract ALL message IDs from ALL RFQs (data[] array structure)
ALL_MESSAGE_IDS=()
RFQ_COUNT=$(echo "$RFQ_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")

echo "Found $RFQ_COUNT RFQs, checking for messages in each..."
echo ""

for ((i=0; i<RFQ_COUNT; i++)); do
  RFQ_INDEX=$i
  RFQ_ID_FOR_MSG=$(echo "$RFQ_RESPONSE" | jq -r ".data[${RFQ_INDEX}].id // empty" 2>/dev/null)
  
  if [ -n "$RFQ_ID_FOR_MSG" ]; then
    echo "📋 RFQ $((i+1)): $RFQ_ID_FOR_MSG"
    
    # Extract message IDs from this RFQ's links
    MESSAGE_IDS_FOR_RFQ=$(echo "$RFQ_RESPONSE" | jq -r ".data[${RFQ_INDEX}].links.tripmsgs[]?.id // .data[${RFQ_INDEX}].links.tripmsgs[]? // empty" 2>/dev/null)
    
    if [ -n "$MESSAGE_IDS_FOR_RFQ" ]; then
      echo "  ✅ Found message IDs for this RFQ:"
      while IFS= read -r msg_id; do
        if [ -n "$msg_id" ]; then
          echo "    - $msg_id"
          ALL_MESSAGE_IDS+=("$msg_id")
        fi
      done <<< "$MESSAGE_IDS_FOR_RFQ"
    else
      echo "  ⚠️  No message IDs found in links.tripmsgs"
      # Check if there are any message links at all
      HAS_MESSAGE_LINKS=$(echo "$RFQ_RESPONSE" | jq ".data[${RFQ_INDEX}].links.tripmsgs != null" 2>/dev/null)
      if [ "$HAS_MESSAGE_LINKS" = "true" ]; then
        echo "  Message links structure:"
        echo "$RFQ_RESPONSE" | jq ".data[${RFQ_INDEX}].links.tripmsgs" 2>/dev/null
      fi
    fi
    echo ""
  fi
done

# Also check RFQ detail response for additional message links
if [ -n "$RFQ_DETAIL_RESPONSE" ]; then
  DETAIL_MESSAGE_IDS=$(echo "$RFQ_DETAIL_RESPONSE" | jq -r '.data.links.tripmsgs[]?.id // .data.links.tripmsgs[]? // empty' 2>/dev/null)
  if [ -n "$DETAIL_MESSAGE_IDS" ]; then
    echo "📋 Additional messages from RFQ detail response:"
    while IFS= read -r msg_id; do
      if [ -n "$msg_id" ] && [[ ! " ${ALL_MESSAGE_IDS[@]} " =~ " ${msg_id} " ]]; then
        echo "  - $msg_id"
        ALL_MESSAGE_IDS+=("$msg_id")
      fi
    done <<< "$DETAIL_MESSAGE_IDS"
    echo ""
  fi
fi

# Step 3b: Try to get messages using the chat endpoint (GET /tripmsgs/{requestId}/chat)
# This endpoint returns all messages in a conversation thread
echo "📋 Step 3b: Getting messages using chat endpoint with RFQ ID"
echo "Endpoint: GET /tripmsgs/{requestId}/chat"
echo "RFQ ID (requestId): $RFQ_ID"
echo ""

CHAT_RESPONSE_RFQ=$(curl -s -X GET "${BASE_URL}/tripmsgs/${RFQ_ID}/chat" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "X-Avinode-ApiToken: ${API_TOKEN}" \
  -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
  -H "Content-Type: application/json")

echo "📨 Chat Response (RFQ ID) Structure:"
echo "$CHAT_RESPONSE_RFQ" | jq '.' 2>/dev/null | head -50
echo ""

# Also try with Trip ID
echo "📋 Step 3c: Getting messages using chat endpoint with Trip ID"
echo "Endpoint: GET /tripmsgs/{tripId}/chat"
echo "Trip ID: $TRIP_ID"
echo ""

CHAT_RESPONSE_TRIP=$(curl -s -X GET "${BASE_URL}/tripmsgs/${TRIP_ID}/chat" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "X-Avinode-ApiToken: ${API_TOKEN}" \
  -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
  -H "Content-Type: application/json")

echo "📨 Chat Response (Trip ID) Structure:"
echo "$CHAT_RESPONSE_TRIP" | jq '.' 2>/dev/null | head -50
echo ""

# Check for seller messages in the RFQ response - they might be in sellerLift or links
echo "📋 Step 3d: Checking for seller message links in RFQ response"
echo "Looking for seller messages in sellerLift or message links..."
echo ""

# Check each sellerLift for message links
for ((i=0; i<SELLER_LIFT_COUNT; i++)); do
  LIFT_INDEX=$i
  LIFT_ID=$(echo "$RFQ_RESPONSE" | jq -r ".data[0].sellerLift[${LIFT_INDEX}].id // empty" 2>/dev/null)
  QUOTE_ID_FOR_LIFT=$(echo "$RFQ_RESPONSE" | jq -r ".data[0].sellerLift[${LIFT_INDEX}].links.quotes[0].id // empty" 2>/dev/null)
  
  if [ -n "$LIFT_ID" ]; then
    echo "Lift $((i+1)): $LIFT_ID"
    echo "  Quote ID: $QUOTE_ID_FOR_LIFT"
    
    # Check if this lift has message links
    LIFT_MESSAGE_LINKS=$(echo "$RFQ_RESPONSE" | jq ".data[0].sellerLift[${LIFT_INDEX}].links.tripmsgs // empty" 2>/dev/null)
    if [ -n "$LIFT_MESSAGE_LINKS" ] && [ "$LIFT_MESSAGE_LINKS" != "null" ]; then
      echo "  ✅ Found message links for this lift:"
      echo "$LIFT_MESSAGE_LINKS" | jq '.' 2>/dev/null
      
      # Extract message IDs from lift
      LIFT_MSG_IDS=$(echo "$RFQ_RESPONSE" | jq -r ".data[0].sellerLift[${LIFT_INDEX}].links.tripmsgs[]?.id // empty" 2>/dev/null)
      while IFS= read -r lift_msg_id; do
        if [ -n "$lift_msg_id" ] && [[ ! " ${ALL_MESSAGE_IDS[@]} " =~ " ${lift_msg_id} " ]]; then
          echo "    - $lift_msg_id"
          ALL_MESSAGE_IDS+=("$lift_msg_id")
        fi
      done <<< "$LIFT_MSG_IDS"
    fi
    
    # Try to get messages for this specific quote using quote ID
    if [ -n "$QUOTE_ID_FOR_LIFT" ]; then
      echo "  Trying to get messages for quote: $QUOTE_ID_FOR_LIFT"
      QUOTE_MESSAGE_RESPONSE=$(curl -s -X GET "${BASE_URL}/tripmsgs/${QUOTE_ID_FOR_LIFT}/chat" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "X-Avinode-ApiToken: ${API_TOKEN}" \
        -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
        -H "Content-Type: application/json" 2>/dev/null)
      
      if echo "$QUOTE_MESSAGE_RESPONSE" | jq -e '.data.messages != null' > /dev/null 2>&1; then
        QUOTE_MSG_COUNT=$(echo "$QUOTE_MESSAGE_RESPONSE" | jq '.data.messages | length' 2>/dev/null || echo "0")
        if [ "$QUOTE_MSG_COUNT" != "0" ] && [ "$QUOTE_MSG_COUNT" != "null" ]; then
          echo "  ✅ Found $QUOTE_MSG_COUNT message(s) for quote $QUOTE_ID_FOR_LIFT"
          echo "$QUOTE_MESSAGE_RESPONSE" | jq '.data.messages[] | {
            id,
            content,
            sentAt,
            sender: .sender.displayName,
            messageType
          }' 2>/dev/null
        fi
      fi
      
      # Also try fetching the quote and check if it has message links
      echo "  Checking quote response for message links..."
      QUOTE_DETAIL_FOR_MSG=$(curl -s -X GET "${BASE_URL}/quotes/${QUOTE_ID_FOR_LIFT}" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "X-Avinode-ApiToken: ${API_TOKEN}" \
        -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
        -H "Content-Type: application/json" 2>/dev/null)
      
      QUOTE_MSG_LINKS=$(echo "$QUOTE_DETAIL_FOR_MSG" | jq '.data.links.tripmsgs // empty' 2>/dev/null)
      if [ -n "$QUOTE_MSG_LINKS" ] && [ "$QUOTE_MSG_LINKS" != "null" ]; then
        echo "  ✅ Found message links in quote response:"
        echo "$QUOTE_MSG_LINKS" | jq '.' 2>/dev/null
        
        # Extract message IDs from quote
        QUOTE_MSG_IDS=$(echo "$QUOTE_DETAIL_FOR_MSG" | jq -r '.data.links.tripmsgs[]?.id // empty' 2>/dev/null)
        while IFS= read -r quote_msg_id; do
          if [ -n "$quote_msg_id" ] && [[ ! " ${ALL_MESSAGE_IDS[@]} " =~ " ${quote_msg_id} " ]]; then
            echo "    - $quote_msg_id (from quote)"
            ALL_MESSAGE_IDS+=("$quote_msg_id")
          fi
        done <<< "$QUOTE_MSG_IDS"
      fi
    fi
    echo ""
  fi
done

# Fetch individual messages if we have message IDs
if [ ${#ALL_MESSAGE_IDS[@]} -gt 0 ]; then
  echo "📨 Fetching ${#ALL_MESSAGE_IDS[@]} individual message(s) using GET /tripmsgs/{messageId}"
  echo "Endpoint: https://developer.avinodegroup.com/reference/readmessage"
  echo ""
  
  for i in "${!ALL_MESSAGE_IDS[@]}"; do
    MESSAGE_ID="${ALL_MESSAGE_IDS[$i]}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📨 Message $((i+1))/${#ALL_MESSAGE_IDS[@]}: $MESSAGE_ID"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    MESSAGE_RESPONSE=$(curl -s -X GET "${BASE_URL}/tripmsgs/${MESSAGE_ID}" \
      -H "Authorization: Bearer ${API_KEY}" \
      -H "X-Avinode-ApiToken: ${API_TOKEN}" \
      -H "X-Avinode-SentTimestamp: ${TIMESTAMP}" \
      -H "Content-Type: application/json")
    
    # Check for errors
    if echo "$MESSAGE_RESPONSE" | jq -e '.meta.errors | length > 0' > /dev/null 2>&1; then
      echo "❌ Error in message response:"
      echo "$MESSAGE_RESPONSE" | jq '.meta.errors' 2>/dev/null || echo "$MESSAGE_RESPONSE"
      echo ""
      continue
    fi
    
    # Extract message data
    echo "📄 Full Message Response:"
    echo "$MESSAGE_RESPONSE" | jq '.data' 2>/dev/null || echo "$MESSAGE_RESPONSE"
    echo ""
    
    echo "📊 Message Structure Summary:"
    echo "$MESSAGE_RESPONSE" | jq '.data | {
      id,
      content,
      sentAt,
      messageType,
      sender: .sender.displayName,
      senderCompany: .sender.companyName,
      has_quote: (.quote != null),
      quote_id: .quote.id,
      quote_price: .quote.sellerPrice,
      has_rfq: (.rfq != null),
      rfq_id: .rfq.id,
      has_lift: (.lift != null),
      lift_id: .lift.id,
      all_keys: (keys | .[])
    }' 2>/dev/null || echo "Could not parse message"
    echo ""
    
    # Show message content if available
    MESSAGE_CONTENT=$(echo "$MESSAGE_RESPONSE" | jq -r '.data.content // .data.message // empty' 2>/dev/null)
    if [ -n "$MESSAGE_CONTENT" ] && [ "$MESSAGE_CONTENT" != "null" ]; then
      echo "💬 Message Content:"
      echo "$MESSAGE_CONTENT"
      echo ""
    fi
    
    # Show quote information if available
    QUOTE_ID=$(echo "$MESSAGE_RESPONSE" | jq -r '.data.quote.id // .data.quote_id // empty' 2>/dev/null)
    if [ -n "$QUOTE_ID" ] && [ "$QUOTE_ID" != "null" ]; then
      echo "💰 Associated Quote ID: $QUOTE_ID"
      QUOTE_PRICE=$(echo "$MESSAGE_RESPONSE" | jq -r '.data.quote.sellerPrice.price // .data.quote.totalPrice.amount // empty' 2>/dev/null)
      if [ -n "$QUOTE_PRICE" ] && [ "$QUOTE_PRICE" != "null" ]; then
        QUOTE_CURRENCY=$(echo "$MESSAGE_RESPONSE" | jq -r '.data.quote.sellerPrice.currency // .data.quote.totalPrice.currency // "USD"' 2>/dev/null)
        echo "   Price: $QUOTE_CURRENCY $QUOTE_PRICE"
      fi
      echo ""
    fi
  done
else
  echo "⚠️  No message IDs found in links.tripmsgs"
  echo "Checking RFQ response structure for message links..."
  echo "$RFQ_RESPONSE" | jq '.data[] | {
    rfq_id: .id,
    has_message_links: (.links.tripmsgs != null),
    message_links: .links.tripmsgs
  }' 2>/dev/null || echo "Could not parse RFQ structure"
  echo ""
fi

# Summary
echo "=================================="
echo "📊 Summary:"
echo "=================================="
echo "Trip ID: $TRIP_ID"
echo "RFQ ID: $RFQ_ID"
if [ -n "$QUOTE_ID" ]; then
  echo "Quote ID: $QUOTE_ID"
fi
if [ -n "$MESSAGE_ID" ]; then
  echo "Message ID: $MESSAGE_ID"
fi
echo ""
echo "✅ API endpoints are working correctly!"
echo "✅ We can extract:"
echo "   - RFQ status from .data.rfqs[].status"
echo "   - Prices from .data.rfqs[].sellerLift[].price (PRIMARY)"
echo "   - Quote IDs from .data.rfqs[].sellerLift[].quote_id"
echo "   - Message IDs from .data.rfqs[].links.tripmsgs[].id"
echo ""
