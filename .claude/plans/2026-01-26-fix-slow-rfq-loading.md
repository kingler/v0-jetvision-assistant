# Implementation Plan: Fix "0 RFQs" Display Issue

**Date**: 2026-01-28
**Branch**: `kingler/fix-chat-memory-sync`
**Issue**: FlightRequestCard displays "0 RFQs" despite quotes being in database
**Priority**: Critical (UX Issue)
**Estimated Effort**: 30-45 minutes

---

## Problem Statement

### Symptoms Observed
1. FlightRequestCard in sidebar displays "0 RFQs" or "0/0 RFQs"
2. Clicking a card doesn't immediately show quote data
3. After switching chats, previously-loaded RFQ data disappears

### Root Cause Analysis (Deep Investigation Complete)

**The API fix from the previous plan IS correctly implemented**, but there's a **downstream transformation issue** that discards the data.

#### Data Flow Trace

```
1. API /api/chat-sessions ✅ Returns rfqFlights from quotes JOIN
       ↓
2. chatSessionToUIFormat() ❌ DISCARDS rfqFlights, returns []
       ↓
3. ChatSession state has rfqFlights: []
       ↓
4. Sidebar shows "0 RFQs"
```

#### Evidence

**File**: `lib/utils/chat-session-to-ui.ts`
**Line 283**:
```typescript
// Initialize rfqFlights as empty array (will be lazy-loaded when card is clicked)
rfqFlights: [],
```

**Problem**:
- The API returns `rfqFlights` array with quotes data (lines 233-250 in `chat-sessions/route.ts`)
- But `chatSessionToUIFormat()` ignores this data and hardcodes `rfqFlights: []`
- The `ChatSessionRow` type (lines 27-75) doesn't include an `rfqFlights` field
- Comment says "will be lazy-loaded" but **no lazy-loading mechanism exists**

---

## Solution

### Fix 1: Update `ChatSessionRow` Type (Required)

**File**: `lib/utils/chat-session-to-ui.ts`
**Lines**: 27-75

Add `rfqFlights` to the type definition:

```typescript
type ChatSessionRow = {
  // ... existing fields (id, conversation_id, etc.)
} & {
  conversation?: { /* ... */ } | null;
  request?: { /* ... */ } | null;
  // ADD THIS:
  rfqFlights?: Array<{
    id: string;
    quoteId: string;
    operatorId: string;
    operatorName: string;
    aircraftType: string;
    aircraftTailNumber: string | null;
    totalPrice: number;
    basePrice: number;
    rfqStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired';
    schedule: any;
    availability: any;
    validUntil: string | null;
    declineReason: string | null;
    createdAt: string;
  }>;
};
```

### Fix 2: Pass Through `rfqFlights` in Transformation (Required)

**File**: `lib/utils/chat-session-to-ui.ts`
**Line**: 283

Change from:
```typescript
// Initialize rfqFlights as empty array (will be lazy-loaded when card is clicked)
rfqFlights: [],
```

To:
```typescript
// Use rfqFlights from API if available (quotes JOIN), otherwise empty array
rfqFlights: chatSessionRow.rfqFlights || [],
```

### Fix 3: Update Quote Counts (Required)

**File**: `lib/utils/chat-session-to-ui.ts`
**Lines**: 245-246

Change from:
```typescript
// Quote statistics from chat_session
quotesReceived: chatSessionRow.quotes_received_count || undefined,
quotesTotal: chatSessionRow.quotes_expected_count || undefined,
```

To:
```typescript
// Quote statistics - prefer rfqFlights count if available, fallback to metadata
quotesReceived: chatSessionRow.rfqFlights?.filter(
  (f) => f.rfqStatus === 'quoted'
).length || chatSessionRow.quotes_received_count || 0,
quotesTotal: chatSessionRow.rfqFlights?.length || chatSessionRow.quotes_expected_count || 0,
```

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `lib/utils/chat-session-to-ui.ts` | 27-75 | Add `rfqFlights` to `ChatSessionRow` type |
| `lib/utils/chat-session-to-ui.ts` | 245-246 | Update `quotesReceived`/`quotesTotal` calculation |
| `lib/utils/chat-session-to-ui.ts` | 283 | Pass through `rfqFlights` instead of empty array |

---

## Verification Plan

### Manual Testing

1. **Fresh Page Load**
   - Open the app in browser
   - Check sidebar shows accurate RFQ counts immediately
   - Expected: Cards show "N RFQs" where N matches database quotes

2. **Chat Selection**
   - Click a flight request card with quotes
   - Verify instant display of quote data
   - Expected: No "0 RFQs", proper count shown

3. **Session Switching**
   - Switch between multiple chat sessions
   - Return to previously-viewed session
   - Expected: RFQ data persists (no reload needed)

4. **Database Verification**
   - Query Supabase: `SELECT * FROM quotes WHERE request_id = '<test-request-id>'`
   - Verify counts match sidebar display

### Console Logging

After the fix, check browser console for:
```
[chatSessionToUIFormat] 🔍 Session with tripId: {
  tripId: "T6WWSV",
  rfqFlightsCount: 3,  // Should show actual count
  ...
}
```

---

## Why the Previous Fix Appeared Complete

The `/api/chat-sessions` endpoint correctly:
1. ✅ JOINs quotes table (lines 124-140)
2. ✅ Maps status with `mapQuoteStatusToRFQStatus()` (lines 32-49)
3. ✅ Returns `rfqFlights` array (lines 233-250)

But the `chatSessionToUIFormat()` transformation function was never updated to consume this data. The frontend was still expecting lazy-loading that never existed.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type mismatch | Low | Medium | TypeScript will catch errors |
| Breaking existing UI | Low | Low | Fallback to empty array if undefined |
| Performance | Very Low | Very Low | Data already fetched, just passing through |

---

## Rollback Plan

If issues arise, revert line 283 to:
```typescript
rfqFlights: [],
```

This returns to the current (broken) behavior while investigating further.

---

## Implementation Checklist

- [ ] Update `ChatSessionRow` type to include `rfqFlights`
- [ ] Update `quotesReceived` calculation to use rfqFlights
- [ ] Update `quotesTotal` calculation to use rfqFlights
- [ ] Change line 283 to pass through `chatSessionRow.rfqFlights`
- [ ] Test fresh page load
- [ ] Test chat selection
- [ ] Test session switching
- [ ] Verify console logs show rfqFlights data
