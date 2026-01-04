# Price & Status Update Debugging Guide

## Issue
After clicking "Update RFQs" button, prices show "$0" and status shows "Unanswered" instead of updating with correct information.

## Debugging Steps

### Step 1: Check Console Logs After Clicking "Update RFQs"

When you click the "Update RFQs" button, you should see a series of console logs. Check them in this order:

#### 1.1 Button Click Log
```
[FlightSearchProgress] Button clicked: { tripId, hasOnTripIdSubmit, isTripIdLoading, rfqsLastFetchedAt, rfqFlightsCount, buttonLabel }
```
**What to check:**
- ✅ `hasOnTripIdSubmit` should be `true`
- ✅ `tripId` should be a valid Trip ID (e.g., "ACEXPD")
- ✅ `isTripIdLoading` should be `false` (or `true` during loading)

#### 1.2 Tool Result Processing
```
[TripID] ✅ Using pre-transformed flights array: X flights
[TripID] Flight 1 details: { id, quoteId, totalPrice, currency, rfqStatus, ... }
```
**What to check:**
- ✅ `totalPrice` should be > 0 (e.g., 76700, not 0)
- ✅ `currency` should be "USD" (or other valid currency)
- ✅ `rfqStatus` should be "quoted" (not "unanswered")
- ✅ `priceIsZero` should be `false`
- ✅ `statusIsUnanswered` should be `false`

**If prices are 0 or status is "unanswered" here**, the problem is in the MCP tool (`get_rfq` or `transformToRFQFlights`).

#### 1.3 Price Extraction Logs (MCP Server)
```
[transformToRFQFlights] 💰 Price extraction result: { quoteId, totalPrice, currency, hasQuote, priceIsZero, sellerPrice, ... }
[transformToRFQFlights] 🎯 FINAL RFQFlight object: { id, quoteId, totalPrice, currency, rfqStatus, priceIsZero, statusIsUnanswered, ... }
```
**What to check:**
- ✅ `totalPrice` should be > 0
- ✅ `sellerPrice.price` should exist and be > 0
- ✅ `rfqStatus` should be "quoted" (not "unanswered")
- ✅ `priceIsZero` should be `false`
- ✅ `statusIsUnanswered` should be `false`

**If prices are 0 here**, check:
- Is `quote.sellerPrice?.price` present in the quote object?
- Was the quote detail fetched correctly from `/quotes/{id}` endpoint?
- Check the `[getRFQ] Merged quote details` log to see if `sellerPrice` was merged correctly

#### 1.4 Status Extraction Logs (MCP Server)
```
[transformToRFQFlights] 📊 Status determination for quote {quoteId}: { finalStatus, sourcingDisplayStatus, sourcingStatus, statusIsUnanswered, statusIsQuoted }
```
**What to check:**
- ✅ `finalStatus` should be "quoted" (not "unanswered")
- ✅ `sourcingDisplayStatus` should be "Accepted" (from Avinode API)
- ✅ `sourcingStatus` should be 2 (numeric code for "Accepted")
- ✅ `statusIsQuoted` should be `true`
- ✅ `statusIsUnanswered` should be `false`

**If status is "unanswered" here**, check:
- Is `quote.sourcingDisplayStatus === 'Accepted'` in the API response?
- Is `quote.sourcingStatus === 2` in the API response?
- Check the `[getRFQ] sellerLift sample` log to see the actual API response structure

#### 1.5 State Update Logs
```
[TripID] 🔄 FINAL rfqFlightsForChatSession BEFORE onUpdateChat: { count, source, flights: [{ id, quoteId, totalPrice, currency, rfqStatus, priceIsZero, statusIsUnanswered }] }
[TripID] 📝 Calling onUpdateChat with: { chatId, rfqFlightsCount, rfqFlights: [{ id, quoteId, totalPrice, currency, rfqStatus, priceIsZero, statusIsUnanswered }], previousRfqFlightsCount, previousPrices }
[TripID] ✅ onUpdateChat called - state should update now
```
**What to check:**
- ✅ `rfqFlights` array should have flights with `totalPrice > 0`
- ✅ `rfqFlights` array should have flights with `rfqStatus === 'quoted'`
- ✅ `priceIsZero` should be `false` for all flights
- ✅ `statusIsUnanswered` should be `false` for all flights
- ✅ `previousPrices` should show old prices (for comparison)

**If prices are 0 or status is "unanswered" here**, the problem is in the data transformation or state update.

#### 1.6 Component Re-Render Logs
```
[ChatInterface] 🔍 rfqFlights useMemo - retrieving from activeChat: { count, sample: { id, quoteId, totalPrice, currency, rfqStatus, priceIsZero, statusIsUnanswered }, allFlights: [...] }
```
**What to check:**
- ✅ `totalPrice` in `sample` should be > 0
- ✅ `rfqStatus` in `sample` should be "quoted"
- ✅ `priceIsZero` should be `false`
- ✅ `statusIsUnanswered` should be `false`
- ✅ `allFlights` array should show all flights with correct prices and statuses

**If prices are 0 or status is "unanswered" here**, check:
- Is `activeChat.rfqFlights` being updated correctly?
- Is the `onUpdateChat` function working correctly?
- Check if there are any warnings about flights with $0 price or "unanswered" status

### Step 2: Check for Warnings

Look for these warning messages in the console:

```
[ChatInterface] ⚠️ WARNING: Found flights with $0 price: [...]
[ChatInterface] ⚠️ WARNING: Found flights with "unanswered" status: [...]
```

If you see these warnings, it means:
- The data is reaching the component, but prices/status are incorrect
- The problem is likely in the MCP tool or API response

### Step 3: Verify API Response

If prices are 0 or status is "unanswered" in the logs, check the actual API response:

1. **Check MCP Tool Logs:**
   ```
   [getRFQ] Merged quote details for {quoteId} - Price: {price} {currency}
   [getRFQ] sellerLift sample after fetching quote details: { sellerPrice: { price, currency }, sourcingDisplayStatus, ... }
   ```

2. **Verify API Response Structure:**
   - `sellerPrice.price` should exist and be > 0
   - `sourcingDisplayStatus` should be "Accepted" (not "Unanswered" or null)
   - `sourcingStatus` should be 2 (numeric code for "Accepted")

### Step 4: Common Issues & Solutions

#### Issue 1: Prices are 0 in `transformToRFQFlights`
**Symptoms:**
- `[transformToRFQFlights] 💰 Price extraction result` shows `totalPrice: 0`
- `sellerPrice.price` is `undefined` or `null`

**Solution:**
- Check if quote details were fetched correctly from `/quotes/{id}` endpoint
- Verify that `sellerPrice` was merged into the `sellerLift` object
- Check the `[getRFQ] Merged quote details` log to see if merging worked

#### Issue 2: Status is "unanswered" in `transformToRFQFlights`
**Symptoms:**
- `[transformToRFQFlights] 📊 Status determination` shows `finalStatus: 'unanswered'`
- `sourcingDisplayStatus` is not "Accepted"

**Solution:**
- Check the actual API response from `/rfqs/{tripId}` endpoint
- Verify that `sellerLift[].sourcingDisplayStatus === 'Accepted'`
- Check if the status determination logic is checking the correct fields

#### Issue 3: Prices/Status are correct in logs but wrong in UI
**Symptoms:**
- Logs show correct prices and status
- UI still shows "$0" and "Unanswered"

**Solution:**
- Check if `activeChat.rfqFlights` is being updated correctly
- Verify that the `rfqFlights` useMemo is retrieving the updated data
- Check if there's a React rendering issue (component not re-rendering)

#### Issue 4: Button click doesn't trigger update
**Symptoms:**
- No logs appear after clicking "Update RFQs"
- Button shows as disabled

**Solution:**
- Check `[FlightSearchProgress] Button clicked` log
- Verify `hasOnTripIdSubmit` is `true`
- Check if `onTripIdSubmit` prop is being passed correctly from parent component

## Summary

The logging has been added at every critical point in the data flow:

1. **Button Click** → Logs button state
2. **Tool Result Processing** → Logs extracted flights with prices/status
3. **Price Extraction (MCP)** → Logs price extraction result
4. **Status Extraction (MCP)** → Logs status determination
5. **Final RFQFlight Object (MCP)** → Logs complete flight object
6. **State Update** → Logs what's being saved to chat state
7. **Component Re-Render** → Logs what's being retrieved from chat state

**Next Steps:**
1. Click "Update RFQs" button
2. Open browser console (F12)
3. Check the logs in the order listed above
4. Identify where prices become 0 or status becomes "unanswered"
5. Report the specific log message that shows the problem

This will help pinpoint exactly where in the data flow the issue occurs.
