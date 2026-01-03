# Quick Test Guide - RFQ Manual Fetch

**5-Minute Test**: Verify the RFQ manual fetch functionality works

## Prerequisites

```bash
# 1. Start the development server
npm run dev

# 2. Open browser to http://localhost:3000
# 3. Open DevTools Console (F12)
```

## Quick Test Steps

### Step 1: Create a Flight Request (1 min)

1. Click "New Chat" in the sidebar
2. Enter a flight request:
   ```
   I need a flight from KTEB to KMIA on January 15, 2026 for 6 passengers
   ```
3. Wait for agent to create a Trip ID
4. Note the Trip ID (e.g., `atrip-12345678`)

### Step 2: Create RFQs in Avinode (2 min)

1. Click "Open in Avinode" button (if available)
2. OR manually go to Avinode Marketplace
3. Find your Trip ID
4. Select 2-3 operators
5. Send RFP to operators

### Step 3: Test Manual Fetch (1 min)

1. **Click "View RFQs" button** in Step 3
2. **Check Step 3** - RFQs should appear
3. **Verify timestamp** - should show "Last updated Just now"

### Step 4: Test Refresh (1 min)

1. **Create another RFQ** in Avinode
2. **Click "View RFQs" button** again
3. **Verify new RFQ appears**
4. **Check timestamp** - should reset to "Just now"

## Visual Checks

### Before Fix ❌
- Shows "No RFQs available"
- Must manually enter Trip ID
- No automatic refresh

### After Fix ✅
- RFQs load automatically on page load
- Shows "Last updated X minutes ago"
- Button says "Refresh RFQs" (not "View RFQs")
- Polls every 30 seconds for new quotes

## Troubleshooting

### RFQs Not Loading?

1. **Check console for errors**
   ```
   [Chat] Auto-fetch RFQs failed: <error>
   ```

2. **Verify Trip ID exists**
   ```javascript
   // In console:
   console.log(activeChat.tripId)
   ```

3. **Check network tab**
   - Should see POST to `/api/chat` with Trip ID
   - Should see SSE connection

4. **Manually refresh**
   - Click "Refresh RFQs" button
   - Check if manual refresh works

### Polling Not Working?

1. **Check console**
   ```
   [Chat] Starting RFQ polling for Trip ID: <trip-id>
   ```

2. **Verify tripIdSubmitted flag**
   - Should be `true` after initial load

3. **Check interval is running**
   - Should see polling message every 30 seconds

4. **Verify cleanup**
   ```
   [Chat] Stopping RFQ polling
   ```
   - Should appear when navigating away

## Test with Reference Script

```bash
# Use the test script with a Trip ID
./test-avinode-rfq.sh atrip-12345678

# Expected output:
# ✅ Trip ID: atrip-12345678
# ✅ RFQs found: 3
# ✅ Quotes found: 5
```

## Success Criteria

- [x] ✅ TypeScript compilation passes
- [x] ✅ Linting passes (warnings are pre-existing)
- [ ] ✅ Auto-fetch triggers on page load
- [ ] ✅ Polling runs every 30 seconds
- [ ] ✅ Manual refresh button works
- [ ] ✅ Timestamp displays correctly
- [ ] ✅ No duplicate API calls
- [ ] ✅ No console errors

## Next Steps

If all tests pass:
1. ✅ Commit changes
2. ✅ Create pull request
3. ✅ Deploy to staging
4. ✅ Run full test suite
5. ✅ Deploy to production

## Support

- **Documentation**: `docs/fixes/STEP_3_RFQ_AUTO_FETCH_FIX.md`
- **Full Test Plan**: `docs/testing/STEP_3_RFQ_AUTO_FETCH_TEST_PLAN.md`
- **Reference Script**: `test-avinode-rfq.sh`

