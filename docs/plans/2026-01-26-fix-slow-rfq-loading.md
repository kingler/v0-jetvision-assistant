# Implementation Plan: Fix "0 RFQs" Display Issue

**Date**: 2026-01-28
**Branch**: `fix/onek-208-chatsessionrow-rfqflights-type`
**Linear Issue**: ONEK-208
**Issue**: FlightRequestCard displays "0 RFQs" despite quotes being in database
**Priority**: Critical (UX Issue)

---

## Problem Statement

### Symptoms Observed
1. FlightRequestCard in sidebar displays "0 RFQs" or "0/0 RFQs"
2. Clicking a card doesn't immediately show quote data
3. After switching chats, previously-loaded RFQ data disappears

### Root Cause Analysis

The `ChatSessionRow` type in `lib/utils/chat-session-to-ui.ts` does not include an `rfqFlights` field, forcing 3 unsafe `as any` casts to access data that the API correctly returns.

## Solution Applied

1. **Added `rfqFlights` field to `ChatSessionRow` type** using `Partial<RFQFlight>` to match the subset returned by the API
2. **Removed 3 `as any` casts** in quote statistics and rfqFlights assignment
3. **Added `RFQFlight` import** from `@/components/avinode/rfq-flight-card`

## Files Modified

| File | Change |
|------|--------|
| `lib/utils/chat-session-to-ui.ts` | Add `rfqFlights` to `ChatSessionRow` type, remove `as any` casts |

## Implementation Checklist

- [x] Update `ChatSessionRow` type to include `rfqFlights`
- [x] Update `quotesReceived` calculation to remove `as any`
- [x] Update `quotesTotal` calculation to remove `as any`
- [x] Change rfqFlights assignment to remove `as any`
- [ ] Test fresh page load
- [ ] Test chat selection
- [ ] Test session switching
