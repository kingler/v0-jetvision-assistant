# Test Script Analysis: Price and RFQ Status Retrieval

## Overview

The `test-avinode-rfq.sh` script tests the complete flow for retrieving prices and RFQ status from the Avinode API, following the pattern we implemented in the code.

## Test Flow

### Step 1: Get Trip Details with RFQs
```bash
GET /trips/{tripId}
```
- Returns trip details with embedded `rfqs[]` array
- Each RFQ contains `sellerLift[]` array with quote references

### Step 2: Extract Quote IDs
The script extracts quote IDs from:
```json
data.rfqs[].sellerLift[].links.quotes[].id
```

This matches exactly what our `get_rfq` function does in `mcp-servers/avinode-mcp-server/src/index.ts` (lines 1685-1694).

### Step 3: Fetch Quote Details for Each Quote ID
```bash
GET /quotes/{quoteId}
```

For each quote ID found, the script calls the quotes endpoint to get:
- **Price**: `sellerPrice.price` and `sellerPrice.currency`
- **Status**: Quote status (quoted, declined, pending, etc.)
- **Other details**: Operator info, aircraft details, valid until date, etc.
- **Messages**: `sellerMessage` field contains operator messages associated with the quote

### Step 4: Retrieve Trip Messages from Operators
```bash
GET /tripmsgs/{tripId}
# OR for request-specific messages:
GET /tripmsgs/{requestId}/chat
```

The script retrieves operator chat messages using the [Avinode Trip Messages API](https://developer.avinodegroup.com/reference/readmessage):
- **Trip-level messages**: `GET /tripmsgs/{tripId}` - All messages for the trip
- **Request-specific messages**: `GET /tripmsgs/{requestId}/chat` - Messages for a specific RFQ
- **Message details**: Each message contains sender info, content, timestamp, and associated quote ID (if applicable)

## Expected Results

When the script runs successfully, it should:

1. ✅ Extract quote IDs from `sellerLift[].links.quotes[].id`
2. ✅ Fetch quote details for each quote ID
3. ✅ Display prices from `sellerPrice.price` and `sellerPrice.currency`
4. ✅ Display status from quote response
5. ✅ Retrieve operator chat messages from `/tripmsgs/{tripId}` endpoint
6. ✅ Display message content, sender information, and timestamps
7. ✅ Link messages to quotes when message contains quote information

## Validation Points

### Price Extraction
The script validates that:
- Quote details contain `sellerPrice.price` (the actual quote price)
- Quote details contain `sellerPrice.currency` (currency code)
- Prices are numeric values (not null or 0)

### Status Extraction
The script validates that:
- Quote details contain `status` field
- Status values are: 'quoted', 'declined', 'pending', 'expired', etc.
- Status can be derived from `sourcingDisplayStatus` in RFQ response

### Message Extraction
The script validates that:
- Trip messages are retrieved from `/tripmsgs/{tripId}` endpoint
- Messages contain `content` or `message` field with operator text
- Messages contain `sender` information (operator name/ID)
- Messages contain `sent_at` or `created_at` timestamp
- Messages may contain `quote_id` or `request_id` to link to specific quotes
- `sellerMessage` field in quote details contains operator messages embedded in quotes

## How to Run the Test

### Prerequisites
1. Ensure `.env.local` exists with required credentials:
   ```env
   AVINODE_API_TOKEN=your_token
   AVINODE_API_KEY=your_bearer_token
   # Optional:
   AVINODE_BASE_URL=https://sandbox.avinode.com/api
   AVINODE_EXTERNAL_ID=your_account_id
   ```

2. Make script executable:
   ```bash
   chmod +x test-avinode-rfq.sh
   ```

### Run Test
```bash
# Test with default Trip ID (B22E7Z)
./test-avinode-rfq.sh

# Test with specific Trip ID
./test-avinode-rfq.sh B22E7Z
./test-avinode-rfq.sh atrip-65262339
```

### Expected Output

The script should output:
1. Trip details with RFQs
2. Extracted quote IDs
3. For each quote:
   - Full quote details JSON
   - Price information (if available)
   - Status information
   - Operator messages from `sellerMessage` field
4. Trip messages:
   - All messages from `/tripmsgs/{tripId}` endpoint
   - Message content, sender, and timestamps
   - Messages linked to quotes (if applicable)

## Code Alignment

The test script validates the exact pattern we implemented:

1. **Quote ID Extraction** (line 146):
   ```bash
   .data.rfqs[]?.sellerLift[]?.links.quotes[]?.id
   ```
   Matches: `mcp-servers/avinode-mcp-server/src/index.ts` lines 1685-1694

2. **Quote Details Fetching** (line 183):
   ```bash
   GET /quotes/{quoteId}
   ```
   Matches: `mcp-servers/avinode-mcp-server/src/index.ts` lines 1718-1743

3. **Price Extraction**:
   - Script expects: `sellerPrice.price` and `sellerPrice.currency`
   - Code checks: `quote.sellerPrice?.price` (line 1227 in transformToRFQFlights)

4. **Status Determination**:
   - Script shows quote `status` field
   - Code checks: `sourcingDisplayStatus === 'Accepted'` → 'quoted' (line 1167)

5. **Message Retrieval** (line 210):
   ```bash
   GET /tripmsgs/{tripId}
   ```
   Matches: `mcp-servers/avinode-mcp-server/src/index.ts` lines 2162-2235 (`getTripMessages` function)
   - Supports both trip-level and request-specific messages
   - Uses `GET /tripmsgs/{tripId}` for trip messages
   - Uses `GET /tripmsgs/{requestId}/chat` for RFQ-specific messages
   - Reference: [Avinode API Documentation](https://developer.avinodegroup.com/reference/readmessage)

6. **Message Extraction from Quotes**:
   - Script retrieves messages via `/tripmsgs/{tripId}` endpoint
   - Code also extracts `sellerMessage` from quote details (line 1741, 2028)
   - Messages are stored in `operatorMessages` for UI display

## Success Criteria

✅ **Price Retrieval**: Script successfully extracts `sellerPrice.price` from quote details  
✅ **Status Retrieval**: Script successfully extracts status from quote or RFQ response  
✅ **Quote ID Matching**: Quote IDs from sellerLift match quote detail IDs  
✅ **Data Structure**: Response structure matches expected format  
✅ **Message Retrieval**: Script successfully retrieves operator messages from `/tripmsgs/{tripId}` endpoint  
✅ **Message Content**: Messages contain readable content, sender info, and timestamps  
✅ **Message-Quote Linking**: Messages are linked to quotes when quote information is present

## Troubleshooting

If the test fails:

1. **No Quote IDs Found**:
   - Check if RFQ has quotes yet (operators may not have responded)
   - Verify Trip ID is correct
   - Check if `sellerLift` array exists in response

2. **Price is 0 or Missing**:
   - Verify quote details were fetched successfully
   - Check if `sellerPrice` exists in quote response
   - Verify quote status is 'quoted' (not 'pending' or 'declined')

3. **Status is 'unanswered'**:
   - Check if `sourcingDisplayStatus` is 'Accepted' in RFQ response
   - Verify quote details have status field
   - Check if our code logic correctly updates status when sellerPrice exists

4. **Messages Not Retrieved**:
   - Verify Trip ID is correct and accessible
   - Check if `/tripmsgs/{tripId}` endpoint returns messages
   - Verify API credentials have permission to read messages
   - Check if messages exist for the trip (operators may not have sent messages yet)
   - For RFQ-specific messages, try `/tripmsgs/{requestId}/chat` endpoint

5. **Message Content Missing**:
   - Check if `sellerMessage` field exists in quote details
   - Verify message response structure matches expected format
   - Check if messages are in `content` or `message` field
   - Verify sender information is present in message response

## Message Retrieval Details

### API Endpoints

The test script uses the [Avinode Trip Messages API](https://developer.avinodegroup.com/reference/readmessage) to retrieve operator messages:

1. **Trip-Level Messages**:
   ```bash
   GET /tripmsgs/{tripId}
   ```
   - Returns all messages for the entire trip
   - Includes messages from all operators and buyers
   - Useful for trip-wide conversation threads

2. **Request-Specific Messages**:
   ```bash
   GET /tripmsgs/{requestId}/chat
   ```
   - Returns messages specific to a single RFQ/request
   - More focused conversation thread for a specific quote request
   - Use when you need messages for a particular RFQ

### Message Structure

Messages returned from the API typically contain:
- `message_id` or `id`: Unique message identifier
- `content` or `message`: The message text content
- `sender` or `sender_id`: Information about who sent the message
- `sender_name`: Name of the sender (operator or buyer)
- `sender_type`: Type of sender ('operator', 'buyer', etc.)
- `sent_at` or `created_at`: Timestamp when message was sent
- `trip_id`: Associated trip identifier
- `request_id` or `rfq_id`: Associated RFQ identifier (if applicable)
- `quote_id`: Associated quote identifier (if message is about a specific quote)

### Message Sources

Messages can come from two sources:

1. **Quote Details** (`sellerMessage` field):
   - Embedded in quote responses from `GET /quotes/{quoteId}`
   - Contains operator messages directly associated with the quote
   - Extracted automatically when fetching quote details

2. **Trip Messages API** (`GET /tripmsgs/{tripId}`):
   - Separate API call to retrieve all messages in the conversation
   - More comprehensive message history
   - Includes messages not directly tied to quotes

### Integration with Price and Status

When retrieving complete RFQ information:
1. **Price**: Retrieved from `sellerPrice.price` in quote details
2. **Status**: Determined from `sourcingDisplayStatus` or quote `status` field
3. **Messages**: Retrieved from both:
   - `sellerMessage` in quote details (quote-specific messages)
   - `/tripmsgs/{tripId}` endpoint (full conversation history)

This ensures you have:
- ✅ Latest prices from operators
- ✅ Current RFQ status (quoted, declined, unanswered, etc.)
- ✅ Complete message history from operators

## Next Steps

After running the test:
1. Verify prices are extracted correctly
2. Verify status updates from 'unanswered' to 'quoted' when prices exist
3. Verify operator messages are retrieved from both quote details and trip messages endpoint
4. Confirm messages are properly linked to quotes
5. Confirm the pattern matches our implementation
6. Update code if test reveals any discrepancies
