# Fix: JDREBG Chat Session Redundancy & Shortcomings

**Date**: 2026-02-05
**Branch**: `fix/ONEK-174-round-trip-proposal-multi-leg`
**Scope**: P0-P2 fixes for duplicate RFQ messages, date discrepancies, sidebar status, and conversation quality

---

## Root Cause Analysis

The JDREBG chat session contains ~25 nearly identical agent messages about RFQ status. The root cause:

**`app/api/chat/route.ts` lines 222-254**: The `skipMessagePersistence` flag only gates the USER message save (line 171). The AI assistant response is **always saved unconditionally** - there is no `if (!skipMessagePersistence)` check around the assistant message save.

Every auto-load and webhook-triggered `handleTripIdSubmit()` call:
1. Sends `skipMessagePersistence: true` (line 1011 in chat-interface.tsx)
2. User message is correctly skipped
3. AI generates a full status response
4. **AI response is saved to the database** (the bug)
5. On next page load, all these saved responses appear in the conversation

---

## Plan

### Fix 1 (P0): Skip assistant message persistence when `skipMessagePersistence=true`

**File**: `app/api/chat/route.ts`
- **Lines 222-254**: Wrap the assistant message save block in `if (!skipMessagePersistence)`
- This is a 1-line conditional addition that stops all duplicate RFQ status messages from being persisted

```
Before: // 7. Save assistant response (UNCONDITIONAL)
After:  if (!skipMessagePersistence) { // 7. Save assistant response }
```

### Fix 2 (P0): Add webhook refresh debounce

**File**: `components/chat-interface.tsx`
- **Lines 430-461**: Add debounce to `handleWebhookEvent` for `TripRequestSellerResponse` events
- Multiple quotes arriving in rapid succession (e.g., 4 within 3 seconds at 1:20:56-1:20:59 PM) should be batched into a single refresh
- Add a `lastWebhookRefreshRef` with 5-second minimum interval

### Fix 3 (P1): Clean up existing duplicate messages from JDREBG session

**File**: New migration or API endpoint
- Create a one-time cleanup script/SQL to remove duplicate assistant messages from the `messages` table for the JDREBG session
- Logic: Keep the FIRST and LAST agent message for each distinct status phase, remove duplicates in between
- Alternative: Add a "Clean Duplicates" admin action

### Fix 4 (P1): Add `proposal_sent` status to sidebar

**File**: `components/chat-sidebar.tsx`
- **Line 81**: Add `"proposal_sent"` to the status union type
- Update badge rendering to show a new "Proposal Sent" badge (green or blue) when status is `proposal_sent`

**File**: `components/chat-interface.tsx`
- After a proposal is sent successfully (when `showProposalSentConfirmation` is set), update the session status to `proposal_sent` via `onUpdateChat`

### Fix 5 (P1): Fix date discrepancy in Step 1 card

**Investigation**: The Step 1 TripSummaryCard shows "Fri, Feb 6, 2026" (the trip creation date) instead of the user's requested date "March 25, 2026". The proposal card shows "Mar 24, 2026" (off by one day, timezone issue).

**File**: Component that renders Step 1 (TripSummaryCard or flight-request-card)
- Ensure the date displayed is the user's requested departure date from the `requests` table (`departure_date` field), NOT the Avinode trip creation timestamp
- For the proposal card date: Ensure UTC date formatting to prevent timezone-induced off-by-one

### Fix 6 (P2): Suppress "not active trip" message after trip creation

**File**: `components/chat-interface.tsx`
- When `handleTripIdSubmit` runs immediately after trip creation (within seconds), the RFQ data comes back empty since operators haven't responded yet
- The AI then generates a confusing "doesn't look like an active trip" message
- Add a `tripCreatedAtRef` timestamp when trip is created
- In the auto-load useEffect, skip if `Date.now() - tripCreatedAtRef < 30000` (30-second grace period)

### Fix 7 (P2): Rate-limit RFQ status messages in conversation

**File**: `lib/chat/hooks/use-message-deduplication.ts`
- Enhance semantic dedup: detect messages about the same trip with the same status
- Block agent messages that match: same trip ID + same status + no new quote count changes
- Extract tripId + status + quoteCount from message content, compare to previous messages

---

## Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `app/api/chat/route.ts` | Add `skipMessagePersistence` check around assistant save (lines 222-254) |
| 2 | `components/chat-interface.tsx` | Add webhook debounce (lines 430-461), trip-created grace period (lines 358-425) |
| 3 | `components/chat-sidebar.tsx` | Add `proposal_sent` status type and badge (line 81, badge section) |
| 4 | `lib/chat/hooks/use-message-deduplication.ts` | Add semantic RFQ dedup by trip+status+count |
| 5 | TripSummaryCard component | Fix date source to use departure_date not creation date |

---

## Implementation Order

1. **Fix 1** - Skip assistant persistence (P0, 5 min, eliminates root cause)
2. **Fix 2** - Webhook debounce (P0, 15 min, prevents burst refreshes)
3. **Fix 6** - Suppress post-creation auto-load (P2, 10 min, UX improvement)
4. **Fix 4** - Proposal_sent sidebar status (P1, 15 min, status accuracy)
5. **Fix 5** - Date discrepancy (P1, 20 min, data accuracy)
6. **Fix 7** - Semantic dedup (P2, 20 min, defense-in-depth)
7. **Fix 3** - Clean existing duplicates (P1, 10 min, data cleanup)

---

## Verification

1. **Fix 1**: Open JDREBG chat, click "Update RFQs" - verify NO new agent message appears in conversation after page reload
2. **Fix 2**: Simulate rapid webhook events - verify only 1 refresh per 5-second window
3. **Fix 3**: Reload JDREBG chat - verify duplicate messages are gone
4. **Fix 4**: After proposal sent, verify sidebar shows "Proposal Sent" badge instead of "Pending"
5. **Fix 5**: Verify Step 1 card shows "Mar 25, 2026" (user's date) and proposal card shows correct date
6. **Fix 6**: Create a new trip, verify no "doesn't look active" message appears immediately after
7. **Fix 7**: Force 3 identical RFQ status messages - verify dedup blocks 2nd and 3rd
8. **Run tests**: `npm run test:unit` to ensure no regressions
