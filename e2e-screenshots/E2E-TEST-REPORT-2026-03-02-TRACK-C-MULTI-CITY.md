# E2E Test Report: Track C — Multi-City Full Lifecycle (Scenarios 21-27)

**Date:** 2026-03-02
**Branch:** `fix/onek-342-post-quote-ui-data-bugs`
**Trip ID:** GD4UJC (Avinode: atrip-66138746)
**Route:** KTEB → EGGW → LFPB → KTEB (3 legs, Multi-City)
**Passengers:** 4
**Aircraft:** Falcon 7X (SBX-9003)
**Quote Price:** $147,350 per leg
**Test Payment:** $95,000 Wire, Ref WT-2026-TEST-003
**Customer:** John Smith, Smith Aviation LLC, kingler@me.com
**Tester:** Claude Code Interactive (Claude-in-Chrome)

---

## Executive Summary

| Category | Result |
|----------|--------|
| **Scenarios Passed** | 4/7 (Scenarios 21-24) |
| **Scenarios Passed with Bugs** | 1/7 (Scenario 25 — Contract) |
| **Scenarios Failed** | 2/7 (Scenario 26 — Payment, Scenario 27 — Closure) |
| **Critical Bugs** | 1 (contract not persisted to DB) |
| **Major Bugs** | 5 (sidebar parsing, header data, trip type, status updates) |
| **Medium Bugs** | 4 (contract PDF, Book Flight dialog, pluralization, archive) |
| **Low Bugs** | 2 (auto-resolve, ClosedWon card) |
| **Overall Status** | FAIL — Payment & Closure blocked by critical contract persistence bug |

---

## Scenario Results

### Scenario 21: Send RFQ — Multi-City — PASS

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Send multi-city request (3 legs) | Agent creates trip with 3 legs | Trip GD4UJC created with KTEB→EGGW, EGGW→LFPB, LFPB→KTEB | PASS |
| TripRequestCard renders | Card shows Multi-City tag, 3 legs, dates, 4 PAX | Card rendered correctly with all 3 legs and correct dates | PASS |
| Deep link generated | "Open in Avinode Marketplace" button | Button rendered with valid deep link to atrip-66138746 | PASS |
| Avinode trip accessible | Trip visible in Avinode Marketplace | Trip accessible at Avinode Buying page, all 3 legs visible | PASS |

**Notes:** Trip creation required two messages — first to establish routing/passengers, second to provide specific dates/times. Agent correctly held off trip creation until all details were provided.

### Scenario 22: Operator Approves — Multi-City — PASS

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Open Avinode deep link | Navigate to trip in Marketplace | Trip loaded in Buying tab with 3 legs | PASS |
| Switch to Seller account | Switch to Sandbox Dev Operator | Company switch to ID 14013 successful | PASS |
| Find RFQ on Selling page | RFQ visible in Selling tab | RFQ D5RRXB found with 3 legs | PASS |
| Submit operator quotes | Quote all 3 legs at $147,350 each | 6 quotes submitted (2 operators × 3 legs) | PASS |

**Notes:** Sandbox Dev Operator auto-accepted some RFQs. Manual accept flow required clicking checkmark icon on each leg. All 6 quotes (Falcon 7X and Challenger 600/601 across 3 legs) were submitted.

### Scenario 23: Update RFQ — Multi-City — PASS

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Click "Update RFQs" button | Fetch latest quotes from Avinode | 6 flights fetched and displayed | PASS |
| Quote cards render | Cards show aircraft, price, operator | Falcon 7X $147,350, Challenger 600/601 $154,350 across Outbound/Return/Leg 3 | PASS |
| Quote sorting works | Sort by price ascending | Quotes sorted correctly | PASS |
| Leg labels correct | Outbound, Return, Leg 3 | Labels displayed correctly for multi-city trip | PASS |

**Notes:** Quote cards correctly categorized into "Outbound Flight Options" (2) and "Return Flight Options" (4). The "Return" label is used for both Leg 2 and Leg 3 — minor labeling issue but functionally correct.

### Scenario 24: Proposal — Multi-City — PASS (with UI bugs)

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Request proposal generation | Agent generates proposal | Proposal JV-MM93VVZ5-QMPG generated for $324,170 total | PASS |
| ProposalSentConfirmation card | Card shows route, dates, price | Card rendered with "Round-Trip" label (should be "Multi-City") | BUG |
| Email sent to client | Email to kingler@me.com | Email sent with proposal PDF attachment | PASS |
| Proposal PDF opens in new tab | Auto-open PDF tab | PDF tab opened successfully with correct document | PASS |

**Bugs Found:**
- Proposal card shows "Round-Trip" instead of "Multi-City" trip type
- Route shows "KTEB ⇄ EGGW" (only first leg, round-trip notation) instead of full multi-city route
- Only shows "Outbound Date" and "Return Date" — missing Leg 3 date

### Scenario 25: Contract — Multi-City — PASS (with bugs)

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Click "Book Flight" on Falcon 7X | BookFlightModal opens | Dialog opened with customer selection and contract preview | PASS |
| Contract dialog shows correct data | Multi-city, 3 legs, 4 PAX, correct pricing | Shows only outbound leg, 1 passenger, $158,406.45 total | BUG |
| Click "Approve & Send" | Contract sent to client | Contract sent (confirmed by agent response) | PASS |
| ContractGenerated card renders | Card shows contract details | Card shows "Multi-City" tag, all 3 legs, correct dates, "Sent" badge | PASS |
| Contract PDF tab opens | Auto-open like proposal | No PDF tab opened | BUG |
| Sidebar status updates | "Contract Sent" | Status remained "Proposal Sent" | BUG |

**Contract ID References:**
- Agent-facing: `aquote-398402418`
- UI-facing: `CONTRACT-MM94BASP-4C99`
- Database UUID: NOT FOUND (critical bug)

**Bugs Found:**
- "Book Flight" dialog shows 1 passenger instead of 4
- Dialog shows only outbound leg (KTEB → EGGW) — missing Legs 2 and 3
- No contract PDF tab auto-opens (proposal flow does open PDF)
- Sidebar status badge stays "Proposal Sent" — never transitions to "Contract Sent"
- Header still shows "KTEB → EGGW • 1 passengers • Mar 2, 2026"

### Scenario 26: Payment — Multi-City — FAIL

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Click "Mark Payment Received" | Payment dialog opens | Dialog opened with Amount, Method, Reference fields | PASS |
| Fill payment details | $95,000, Wire, WT-2026-TEST-003 | Fields filled correctly | PASS |
| Click "Confirm Payment" | Payment recorded, PaymentConfirmedCard | **ERROR: "Contract not found: unable to resolve 'CONTRACT-MM94BASP-4C99' to a valid contract"** | **FAIL** |
| Try chat-based payment | Agent records payment | Agent says "that's a quote ID, not a contract ID" (for aquote-398402418) | **FAIL** |
| Try explicit contract ID | Agent records with CONTRACT-MM94BASP-4C99 | Agent says "it isn't resolving to a contract UUID in the database" | **FAIL** |
| Try auto-resolve | Agent resolves from session | Agent says "contract_id cannot be auto-resolved — it must be provided explicitly" | **FAIL** |

**Root Cause:** The "Book Flight" button UI flow creates a contract card and sends the contract email, but **does not persist the contract record to the `contracts` database table**. The UI-generated contract number `CONTRACT-MM94BASP-4C99` has no corresponding row in the database. The `record_payment` tool requires a valid `contract_id` (UUID from the contracts table), which doesn't exist.

**Impact:** This is a **CRITICAL** blocking bug. Without a persisted contract record:
- "Mark Payment Received" button fails
- Chat-based payment recording fails
- "Closed Won" status transition is impossible
- Full lifecycle cannot complete

### Scenario 27: Closure — Multi-City — PARTIAL FAIL

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Request close as won | ClosedWonConfirmation card | Agent says "can't mark it 'won' without payment confirmation" | **FAIL** |
| Archive session | Session moves to Archive tab | Agent says "Session archived. The chat is now read-only." | PARTIAL |
| Sidebar updates | Session in Archive tab, "Archived" badge | Session still in "Active (4)", badge still "Proposal Sent" | **FAIL** |
| ClosedWonConfirmation card | Card rendered with summary | No card rendered | **FAIL** |

**Root Cause:** Cascading failure from Scenario 26. Without payment recorded, the agent cannot mark the trip as "won". Additionally, even the archive action doesn't properly:
1. Move the session from Active to Archive sidebar tab
2. Update the status badge from "Proposal Sent" to "Archived"
3. Render any closure confirmation card

---

## Bugs Summary

### Critical (Blocks Full Lifecycle)

| # | Bug ID | Title | Component | Impact |
|---|--------|-------|-----------|--------|
| 1 | TC-BUG-001 | **"Book Flight" contract flow doesn't persist contract to database** | `chat-interface.tsx` (handleBookFlight) | Payment recording impossible; full lifecycle blocked |

### Major (Incorrect Data/Behavior)

| # | Bug ID | Title | Component | Impact |
|---|--------|-------|-----------|--------|
| 2 | TC-BUG-002 | **Sidebar airport codes parse random uppercase strings from messages** | `chat-sidebar.tsx` / trip data parsing | Sidebar shows "TIED → THE", "SBX → LLC", "QMPG → SBX" instead of actual route |
| 3 | TC-BUG-003 | **Header shows wrong passenger count** | `chat-interface.tsx` header | Shows "1 passengers" instead of "4 passengers" |
| 4 | TC-BUG-004 | **Header shows session date instead of departure date** | `chat-interface.tsx` header | Shows "Mar 2, 2026" (today) instead of "Mar 10, 2026" (departure) |
| 5 | TC-BUG-005 | **Trip type misidentified as "Round-Trip" for Multi-City** | `proposal-sent-confirmation.tsx`, BookFlightModal | Proposal and contract dialogs show "Round-Trip" instead of "Multi-City" |
| 6 | TC-BUG-006 | **Sidebar status badge never updates past "Proposal Sent"** | `chat-sidebar.tsx` / status tracking | No transition to "Contract Sent", "Payment Received", or "Archived" |

### Medium (Functional Gaps)

| # | Bug ID | Title | Component | Impact |
|---|--------|-------|-----------|--------|
| 7 | TC-BUG-007 | **No contract PDF auto-opens after "Approve & Send"** | BookFlightModal / contract flow | Proposal flow opens PDF tab; contract flow doesn't |
| 8 | TC-BUG-008 | **Book Flight dialog shows only outbound leg + 1 PAX** | BookFlightModal | Multi-city legs and correct passenger count missing from dialog |
| 9 | TC-BUG-009 | **"1 passengers" grammar error in header** | `chat-interface.tsx` header | Missing singular/plural logic for passenger count |
| 10 | TC-BUG-010 | **Archive doesn't move session from Active to Archive tab** | `archive_session` tool / sidebar | Session stays in Active tab after archiving |

### Low (Minor Issues)

| # | Bug ID | Title | Component | Impact |
|---|--------|-------|-----------|--------|
| 11 | TC-BUG-011 | **`record_payment` tool can't auto-resolve contract from session** | `tool-executor.ts` (record_payment) | User must manually provide contract UUID — can't resolve from context |
| 12 | TC-BUG-012 | **No ClosedWonConfirmation card rendered on closure** | Closure flow | Even when archived, no confirmation card shown |

---

## Bug Dependency Chain

The critical bug (TC-BUG-001) creates a cascading failure that blocks 3 scenarios:

```
TC-BUG-001: Contract not persisted to DB
    ├── Scenario 26: Payment FAIL (no contract to pay against)
    │   └── Scenario 27: Closure FAIL (can't mark "won" without payment)
    └── TC-BUG-010: Archive doesn't update sidebar (secondary issue)
```

---

## Header & Sidebar Data Display Issues

These bugs consistently affected the session throughout testing:

**Header (ref_59):** `KTEB → EGGW • 1 passengers • Mar 2, 2026`
- Should be: `KTEB → EGGW → LFPB → KTEB • 4 passengers • Mar 10, 2026`

**Sidebar (ref_344):** `KTEB → EGGW`
- Should be: `KTEB → EGGW → LFPB → KTEB` (or abbreviated multi-city format)

**Sidebar Status (ref_343):** `Proposal Sent` (never changed after contract/archive)

**Sidebar Passengers (ref_345):** `1 passenger • Mar 2, 2026`
- Should be: `4 passengers • Mar 10, 2026`

---

## What Worked Well

1. **Trip creation** — Multi-city trip created correctly with 3 legs and proper routing
2. **TripRequestCard** — Rendered all 3 legs with correct airports, dates, and "Multi-City" tag
3. **Avinode deep link** — Successfully opened trip in Avinode Marketplace
4. **Operator quoting** — All 6 quotes received from 2 operators across 3 legs
5. **Update RFQs** — Successfully fetched and displayed all 6 flight options
6. **Quote sorting and categorization** — Correct Outbound/Return/Leg 3 labels
7. **Proposal generation** — PDF generated, emailed, and auto-opened in new tab
8. **ContractGenerated card** — Correctly shows "Multi-City" tag with all 3 legs
9. **Agent conversational flow** — Clarifying questions when info missing, tool routing correct
10. **Chat SSE streaming** — Messages sent and received in real-time

---

## Comparison: Proposal vs Contract Flow

| Feature | Proposal Flow | Contract Flow (Book Flight) | Gap |
|---------|--------------|---------------------------|-----|
| Card renders | ProposalSentConfirmation | ContractGenerated | Both work |
| PDF generated | Yes | Unknown (no tab opened) | Missing PDF tab |
| Email sent | Yes | Yes (confirmed by agent) | OK |
| Trip type shown | "Round-Trip" (wrong) | "Multi-City" (correct) | Inconsistent |
| All legs shown | No (only Leg 1) | Yes (all 3 legs) | Contract card better |
| DB record created | Yes (proposals table) | **No** (contracts table empty) | CRITICAL |
| Status badge update | "Proposal Sent" | No change | Missing transition |
| PDF auto-open | Yes (new tab) | No | Missing feature |

---

## Test Environment

| Component | Details |
|-----------|---------|
| **App URL** | http://localhost:3000 |
| **Browser** | Chrome (Claude-in-Chrome MCP) |
| **Auth** | Clerk (Kingler user) |
| **Avinode Sandbox** | Buyer: Jetvision LLC (13792), Seller: Sandbox Dev Operator (14013) |
| **DB** | Supabase (sbzaevawnjlrsjsuevli) |
| **Test Duration** | ~65 minutes (6:05 AM - 7:10 AM) |

---

## Screenshots (Claude-in-Chrome Session IDs)

| Screenshot ID | Description | Scenario |
|---------------|-------------|----------|
| ss_8551dh0yw | Closure request — agent asks for contract UUID or "archive anyway" | 27 |
| ss_5041apghu | Same view from scrolled position | 27 |
| ss_7883o1402 | Archive response — "Session archived. The chat is now read-only." | 27 |

**Note:** Scenarios 21-25 screenshots were captured in previous sessions (context compacted). The multi-city-lifecycle directory was created but screenshots were in-memory only (Claude-in-Chrome ss_* IDs from prior sessions).

---

## Recommendations

### Immediate Fix (P0 — Blocks Full Lifecycle)

**TC-BUG-001: Contract database persistence**
- The "Book Flight" → "Approve & Send" flow in `chat-interface.tsx` must persist the contract record to the `contracts` table before displaying the ContractGenerated card
- The `contractId` (`CONTRACT-MM94BASP-4C99` format) must map to a UUID in the contracts table
- The `Mark Payment Received` button must pass a resolvable contract ID

### High Priority (P1 — Data Integrity)

**TC-BUG-002 through TC-BUG-006: Header/sidebar data accuracy**
- Sidebar and header should read trip data from the database (trip_type, passenger_count, departure_date, route) rather than parsing message content
- Status badge should track through the full lifecycle: Understanding Request → Processing → Proposal Sent → Contract Sent → Payment Received → Closed Won → Archived

### Medium Priority (P2 — Feature Parity)

**TC-BUG-007, TC-BUG-008: Contract flow parity with proposal flow**
- Contract PDF should auto-open in new tab (like proposal)
- Book Flight dialog should show all multi-city legs and correct passenger count
- Trip type in proposal card should show "Multi-City" (not "Round-Trip")

### Low Priority (P3 — Polish)

**TC-BUG-009 through TC-BUG-012: Minor fixes**
- Singular/plural grammar for passenger count
- Archive action should move session to Archive tab
- `record_payment` tool should support session-context resolution
- ClosedWonConfirmation card should render on successful closure

---

## Verdict

**Track C: FAIL — Multi-city lifecycle cannot complete.**

The core flows (trip creation, quoting, proposal) work well for multi-city trips. The ContractGenerated card correctly renders multi-city data. However, a critical contract persistence bug prevents payment recording and deal closure, making the full lifecycle uncompletable. Additionally, widespread header/sidebar data display issues affect the multi-city trip presentation throughout the session.

**Recommended action:** Fix TC-BUG-001 (contract persistence) first, then address the header/sidebar data bugs (TC-BUG-002 through TC-BUG-006) as a batch.
