# E2E Test Report: ONEK-144 — Multi-City Trips & Empty Leg Subscriptions

| Field | Value |
|-------|-------|
| **Issue** | [ONEK-144](https://linear.app/designthru-ai/issue/ONEK-144) |
| **Status** | Done |
| **Priority** | High |
| **Date** | 2026-02-08 |
| **Branch** | `kinglerbercy/onek-144-epic-multi-city-trips-empty-leg-subscriptions` |
| **Environment** | Vercel Production (`v0-jetvision-assistant.vercel.app`) |
| **Tester** | Claude Code (Automated E2E) |

---

## Test Summary

| # | Test | AC | Result | Session |
|---|------|----|--------|---------|
| 1 | Multi-City Trip (3 segments) | AC-1, AC-3 | **FAIL** | KTDPDU |
| 2 | Round-Trip (2 segments) | AC-2, AC-3 | **FAIL** | N3KRYU |
| 3 | One-Way Backward Compatibility | AC-4 | **PASS** | RB4UKV |
| 4 | Existing Session Regression | AC-6 | **PASS** | JDREBG |

**Overall Result: 2 PASS / 2 FAIL**

---

## Acceptance Criteria Results

| AC | Description | Result | Notes |
|----|-------------|--------|-------|
| AC-1 | Create Multi-City Trip via Chat | **FAIL** | Agent creates only first segment; remaining segments lost |
| AC-2 | Create Round-Trip via Chat | **PARTIAL** | Agent recognizes round-trip but card shows "One-Way" |
| AC-3 | Trip Summary Card Shows All Segments | **FAIL** | Card only shows first leg for multi-city; no return date for round-trip |
| AC-4 | Backward Compatibility — One-Way Trips | **PASS** | One-way trips work correctly with single segment |
| AC-5 | Segments Stored in Database | **NOT TESTED** | Requires direct Supabase query |
| AC-6 | Regression — Existing Sessions Load | **PASS** | Older sessions load with all data intact |

---

## Detailed Test Results

### Test 1 — Multi-City Trip (AC-1, AC-3) — FAIL

**Input:** "I need a flight from Teterboro to London Luton, then London to Paris Le Bourget, then Paris back to Teterboro. 4 passengers, departing March 10."

**Expected:**
- Trip created with 3 segments
- Trip card shows all 3 legs: KTEB → EGGW → LFPB → KTEB
- Trip type badge shows "Multi-City"

**Actual:**
- Session KTDPDU created
- Trip card shows **"One-Way"** badge with only **KTEB → EGGW** (first segment)
- Segments 2 (EGGW → LFPB) and 3 (LFPB → KTEB) are missing from the card
- Agent did recognize the multi-city intent and asked clarifying questions

**Root Cause (Suspected):** The `create_trip` MCP tool call only passes the first segment to Avinode. The multi-segment data is either not being passed correctly in the function call arguments, or the TripSummaryCard component only renders the first segment.

---

### Test 2 — Round-Trip (AC-2, AC-3) — FAIL

**Input:** "Round trip from KTEB to KVNY, departing March 2, returning March 5, 6 passengers"

**Expected:**
- Trip created with 2 segments (outbound + return)
- Trip card shows "Round-Trip" badge with ⇄ indicator
- Both departure (Mar 2) and return (Mar 5) dates shown

**Actual:**
- Session N3KRYU created
- Trip card shows **"One-Way"** badge instead of "Round-Trip"
- Only outbound route KTEB → KVNY displayed
- Return date (Mar 5) **not shown** on the trip card
- Agent correctly recognized round-trip intent (mentioned "Route: KTEB ↔ KVNY, Dates: Depart Mar 2 return Mar 5, PAX: 6, Trip type: Round trip")

**Root Cause (Suspected):** The `tripType` property is not being passed correctly from the agent response to the TripSummaryCard component, or the component defaults to "One-Way" when `tripType` is undefined/missing.

---

### Test 3 — One-Way Backward Compatibility (AC-4) — PASS

**Input:** "I need a one-way flight from KTEB to KMIA on March 15 for 3 passengers"

**Expected:**
- Trip created with 1 segment
- Same behavior as before multi-city feature

**Actual:**
- Session RB4UKV created
- Trip card correctly shows:
  - "One-Way" badge
  - KTEB (Teterboro, NJ) → KMIA (Miami, FL)
  - Date: Sun, Mar 15, 2026
  - Passengers: 3
- "Open in Avinode Marketplace" button present
- Agent asks follow-up about departure time and preferences

**Verdict:** One-way trips work identically to pre-feature behavior.

---

### Test 4 — Existing Session Regression (AC-6) — PASS

**Session:** JDREBG (pre-existing one-way KTEB → KVNY, Mar 25, 4 passengers)

**Expected:**
- Session loads without errors
- All original data intact

**Actual:**
- Session loaded successfully with all data intact:
  - Trip card: KTEB → KVNY, 4 passengers, Mar 25, 2026
  - Step 2: Flight & RFQ Selected with "Open in Avinode Marketplace" button
  - Step 3: View RFQ Flights with "Update RFQs" button
  - Proposal email draft visible
  - Customer selection visible
  - RFQ details: 2/2 RFQs
  - Sidebar: "Analyzing Options" status, "Proposal Sent" badge

**Verdict:** No regression. Pre-existing sessions load correctly.

---

## Issues Found

### ISSUE-1: Multi-City Trip Only Creates First Segment [MAJOR]

| Field | Value |
|-------|-------|
| **Severity** | Major |
| **AC Affected** | AC-1, AC-3 |
| **Component** | Agent → MCP `create_trip` tool call |
| **Reproducible** | Yes |

**Description:** When a user requests a multi-city trip with 3+ segments, only the first segment (KTEB → EGGW) is created. The subsequent segments are lost between the agent's recognition of the multi-city intent and the actual trip creation.

**Steps to Reproduce:**
1. Open new chat session
2. Type: "I need a flight from Teterboro to London Luton, then London to Paris Le Bourget, then Paris back to Teterboro. 4 passengers, departing March 10."
3. Observe: Only first leg appears on trip card

**Expected:** Trip card shows 3 segments: KTEB → EGGW → LFPB → KTEB

**Investigation Areas:**
- Check if `segments[]` array is being passed in the `create_trip` function call
- Verify `normalizeToSegments()` is being called with all segments
- Check if TripCreatedUI/TripSummaryCard renders multiple segments

---

### ISSUE-2: Round-Trip Displays as One-Way [MAJOR]

| Field | Value |
|-------|-------|
| **Severity** | Major |
| **AC Affected** | AC-2, AC-3 |
| **Component** | TripSummaryCard / TripCreatedUI |
| **Reproducible** | Yes |

**Description:** When a round-trip is created, the trip card displays "One-Way" badge instead of "Round-Trip" with ⇄ indicator. The agent correctly identifies the trip as round-trip in its response text, but the UI card does not reflect this.

**Steps to Reproduce:**
1. Open new chat session
2. Type: "Round trip from KTEB to KVNY, departing March 2, returning March 5, 6 passengers"
3. Observe: Trip card shows "One-Way" instead of "Round-Trip"

**Expected:** Trip card shows "Round-Trip" badge with ⇄ symbol

**Investigation Areas:**
- Check if `tripType` prop is being passed to TripSummaryCard
- Verify `determineTripType()` output reaches the UI layer
- Check the chat message persistence — is `tripType` stored and retrieved?

---

### ISSUE-3: Return Date Missing on Round-Trip Card [MAJOR]

| Field | Value |
|-------|-------|
| **Severity** | Major |
| **AC Affected** | AC-3 |
| **Component** | TripSummaryCard |
| **Reproducible** | Yes |

**Description:** When a round-trip is created, the return date (Mar 5) is not displayed on the trip card. Only the outbound date is shown.

**Steps to Reproduce:**
1. Same as ISSUE-2
2. Observe: Only departure date shown, no return date

**Expected:** Both departure (Mar 2) and return (Mar 5) dates visible on card

**Investigation Areas:**
- Check if `returnDate` prop is passed to TripSummaryCard
- Verify the card has conditional rendering for return dates
- Check if the `segments` data includes the return leg date

---

## Action Plan

### Priority 1 — Fix Multi-Segment Trip Creation (ISSUE-1)

1. Debug the `create_trip` tool call in `agents/jetvision-agent/tools.ts` to verify `segments[]` is populated
2. Add logging to `mcp-servers/avinode-mcp-server/src/index.ts` `normalizeToSegments()` to trace segment processing
3. Verify TripCreatedUI component receives and renders all segments
4. Add unit test for multi-segment trip creation flow

### Priority 2 — Fix Trip Type Display (ISSUE-2)

1. Trace the `tripType` value from `determineTripType()` through the response chain
2. Check if `tripType` is included in the `create_trip` response tool result
3. Verify TripSummaryCard conditional rendering for `tripType === 'round_trip'`
4. Check chat message serialization/deserialization preserves `tripType`

### Priority 3 — Fix Return Date Display (ISSUE-3)

1. Verify `returnDate` is included in the trip response data
2. Check TripSummaryCard JSX for return date rendering logic
3. Add conditional display: if `tripType === 'round_trip'`, show return date row

---

## Files to Investigate

| File | Reason |
|------|--------|
| `agents/jetvision-agent/tools.ts` | OpenAI function calling schema for `create_trip` — check segments parameter |
| `mcp-servers/avinode-mcp-server/src/index.ts` | `normalizeToSegments()`, `determineTripType()` — verify multi-segment processing |
| `mcp-servers/avinode-mcp-server/src/types.ts` | `CreateTripParams`, `CreateTripResponse` — check type definitions |
| `components/mcp-ui/composites/TripCreatedUI.tsx` | Wrapper that passes `tripType` and `returnDate` to TripSummaryCard |
| `components/avinode/trip-summary-card.tsx` | Trip card rendering — check multi-segment and trip type display logic |
| `components/chat-interface.tsx` | Chat message rendering — check how tool results map to UI components |

---

## Sign-Off

| Tester | Result | Date | Notes |
|--------|--------|------|-------|
| Claude Code (E2E) | 2 PASS / 2 FAIL | 2026-02-08 | AC-1, AC-2, AC-3 failing; AC-4, AC-6 passing |
| @AB | ⬜ Pass / ⬜ Fail | | |
| @Kham | ⬜ Pass / ⬜ Fail | | |
