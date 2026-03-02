# Track C: Multi-City Lifecycle Bugs — Linear Issue Plan

**Date:** 2026-03-02
**Source:** `e2e-screenshots/E2E-TEST-REPORT-2026-03-02-TRACK-C-MULTI-CITY.md`
**Status:** Created in Linear (ONEK-348 parent + 11 children)

## Linear Issues Created

| Linear ID | Title | Priority | Bug ID |
|-----------|-------|----------|--------|
| **ONEK-348** | Track C: Multi-City Lifecycle Bugs (parent) | Urgent | — |
| ONEK-349 | CRITICAL: Book Flight contract not persisted to database | Urgent | TC-BUG-001 |
| ONEK-350 | Sidebar airport codes parse random uppercase strings | High | TC-BUG-002 |
| ONEK-351 | Header wrong PAX, date, route for multi-city trips | High | TC-BUG-003+004 |
| ONEK-352 | Proposal card: Round-Trip instead of Multi-City | High | TC-BUG-005 |
| ONEK-353 | Status badge does not update after contract | High | TC-BUG-006 |
| ONEK-354 | Contract PDF tab missing after booking | Medium | TC-BUG-007 |
| ONEK-355 | Book Flight dialog: only 1 leg and 1 PAX for multi-city | Medium | TC-BUG-008 |
| ONEK-356 | Archive session not reflected in sidebar | Medium | TC-BUG-010 |
| ONEK-357 | Payment tool contract resolution | Low | TC-BUG-011 |
| ONEK-358 | Missing ClosedWon confirmation card | Low | TC-BUG-012 |
| ONEK-359 | Fix passenger count display grammar | Low | TC-BUG-009 |

---

## Parent Issue

**Title:** Track C: Multi-City Lifecycle Bugs (12 bugs from E2E Scenarios 21-27)
**Team:** One Kaleidoscope
**Priority:** Urgent (P1)
**Labels:** Bug
**Related:** ONEK-336, ONEK-342

### Description

Track C E2E testing of the full multi-city charter flight lifecycle (KTEB → EGGW → LFPB → KTEB, 4 PAX, Falcon 7X, Trip GD4UJC) revealed 12 bugs. 1 critical bug blocks payment recording and deal closure, preventing the lifecycle from completing.

Source: `e2e-screenshots/E2E-TEST-REPORT-2026-03-02-TRACK-C-MULTI-CITY.md`

---

## Child Issue 1 — P0 Critical

**Title:** CRITICAL: "Book Flight" contract flow doesn't persist contract to database
**Priority:** Urgent (P1)
**Labels:** Bug, Agent:Coder
**Estimate:** 3

### Description

The "Book Flight" button UI flow creates a contract card and sends the contract email, but does NOT persist the contract record to the `contracts` database table. The UI-generated contract number `CONTRACT-MM94BASP-4C99` has no corresponding row in the database.

**Impact:** Payment recording impossible; full lifecycle blocked. Neither the "Mark Payment Received" UI button nor the chat-based agent can resolve any contract identifier to a valid DB UUID.

**Affected Files:**
- `components/chat-interface.tsx` — `handleBookFlight` / contract creation flow
- `agents/jetvision-agent/tool-executor.ts` — contract persistence logic
- Database `contracts` table

### Acceptance Criteria

#### AC-1: Contract persisted on Book Flight

**Given** a user clicks "Book Flight" on a quote card and fills the dialog
**When** the user clicks "Approve & Send"
**Then** a row is inserted in the `contracts` table with a valid UUID, linked to the quote and request

#### AC-2: Mark Payment Received resolves contract

**Given** a contract was created via "Book Flight" and persisted to DB
**When** the user clicks "Mark Payment Received" on the ContractGenerated card
**Then** the payment dialog pre-fills the contract ID and successfully records payment

---

## Child Issue 2 — P1 Major

**Title:** Sidebar airport codes parse random uppercase strings from chat messages
**Priority:** High (P2)
**Labels:** Bug, Agent:Frontend
**Estimate:** 2

### Description

The sidebar session card extracts airport codes by parsing uppercase strings from chat messages instead of reading from trip data in the database. This produces nonsensical routes like "TIED → THE", "SBX → LLC", "QMPG → SBX".

**Expected:** Sidebar reads `departure_airport` and `arrival_airport` from the request record or trip data.

**Affected Files:**
- `components/chat-sidebar.tsx` — airport code extraction logic
- Possibly `lib/chat/` utilities

### Acceptance Criteria

#### AC-1: Sidebar shows correct airport codes

**Given** a multi-city trip with route KTEB → EGGW → LFPB → KTEB
**When** viewing the sidebar session card
**Then** the route displays "KTEB → EGGW → LFPB → KTEB" (or abbreviated "KTEB → EGGW +2")

#### AC-2: Airport codes come from database, not message parsing

**Given** a session with chat messages containing random uppercase words like "TIED", "SBX"
**When** the sidebar renders
**Then** only actual ICAO airport codes from the trip record are displayed

---

## Child Issue 3 — P1 Major

**Title:** Session header shows wrong passenger count, date, and route for multi-city trips
**Priority:** High (P2)
**Labels:** Bug, Agent:Frontend
**Estimate:** 2

### Description

The session header bar consistently shows incorrect data for multi-city trips:
- Shows "1 passengers" instead of "4 passengers"
- Shows "Mar 2, 2026" (session creation date) instead of "Mar 10, 2026" (departure date)
- Shows "KTEB → EGGW" (only first leg) instead of full multi-city route

**Expected Header:** `KTEB → EGGW → LFPB → KTEB • 4 passengers • Mar 10, 2026`
**Actual Header:** `KTEB → EGGW • 1 passengers • Mar 2, 2026`

**Affected Files:**
- `components/chat-interface.tsx` — header rendering logic (ref_59)
- Trip data fetching/passing to header

### Acceptance Criteria

#### AC-1: Header shows correct multi-city route

**Given** a multi-city trip KTEB → EGGW → LFPB → KTEB
**When** viewing the session
**Then** the header shows the full route or an abbreviated format like "KTEB → EGGW +2 legs"

#### AC-2: Header shows correct passenger count and date

**Given** a trip with 4 passengers departing March 10, 2026
**When** viewing the session header
**Then** it displays "4 passengers" and "Mar 10, 2026"

---

## Child Issue 4 — P1 Major

**Title:** Trip type misidentified as "Round-Trip" for Multi-City trips in proposal/contract
**Priority:** High (P2)
**Labels:** Bug, Agent:Frontend
**Estimate:** 2

### Description

Proposal and contract dialogs display "Round-Trip" instead of "Multi-City" for multi-city trips. The ProposalSentConfirmation card shows "Round-Trip" with only "Outbound Date" and "Return Date" fields (missing Leg 3). The ContractGenerated card correctly shows "Multi-City" with all 3 legs — inconsistency between the two flows.

**Affected Files:**
- `components/proposal/proposal-sent-confirmation.tsx` — trip type display
- BookFlightModal — trip type passed to dialog
- Trip type determination logic

### Acceptance Criteria

#### AC-1: Proposal card shows "Multi-City" for multi-city trips

**Given** a proposal generated for a 3-leg multi-city trip
**When** the ProposalSentConfirmation card renders
**Then** it shows "Multi-City" (not "Round-Trip") and lists all 3 legs with dates

#### AC-2: Consistent trip type across proposal and contract cards

**Given** a multi-city trip with proposal and contract generated
**When** both cards render
**Then** both show "Multi-City" trip type consistently

---

## Child Issue 5 — P1 Major

**Title:** Sidebar status badge never updates past "Proposal Sent"
**Priority:** High (P2)
**Labels:** Bug, Agent:Frontend
**Estimate:** 2

### Description

The sidebar status badge for a session stays at "Proposal Sent" after:
- Contract is sent → should show "Contract Sent"
- Session is archived → should show "Archived"

The status badge only tracks up to "Proposal Sent" and doesn't recognize subsequent lifecycle stages.

**Affected Files:**
- `components/chat-sidebar.tsx` — status badge logic
- `lib/chat/constants/workflow.ts` — WorkflowStatus / StatusToStep map

### Acceptance Criteria

#### AC-1: Status transitions through full lifecycle

**Given** a session that progresses through proposal → contract → payment → closure
**When** each stage completes
**Then** the sidebar badge updates: "Proposal Sent" → "Contract Sent" → "Payment Received" → "Closed Won" → "Archived"

#### AC-2: Archive action updates status badge

**Given** a session where the agent archives the chat
**When** the archive completes
**Then** the sidebar badge shows "Archived" (not "Proposal Sent")

---

## Child Issue 6 — P2 Medium

**Title:** No contract PDF tab auto-opens after "Approve & Send"
**Priority:** Normal (P3)
**Labels:** Bug, Agent:Frontend
**Estimate:** 1

### Description

The proposal flow auto-opens a PDF tab after sending. The contract flow (via "Book Flight" → "Approve & Send") does not open any PDF tab. This is a feature parity gap between the two flows.

**Affected Files:**
- BookFlightModal / contract send handler
- PDF generation and tab-open logic

### Acceptance Criteria

#### AC-1: Contract PDF opens in new tab

**Given** a user clicks "Approve & Send" in the Book Flight dialog
**When** the contract is generated and sent
**Then** the contract PDF opens in a new browser tab (matching proposal behavior)

---

## Child Issue 7 — P2 Medium

**Title:** Book Flight dialog shows only outbound leg and 1 passenger for multi-city trips
**Priority:** Normal (P3)
**Labels:** Bug, Agent:Frontend
**Estimate:** 2

### Description

The Book Flight dialog shows only the first leg (KTEB → EGGW) and "1 passenger" when the trip is a 3-leg multi-city with 4 passengers. The dialog should show all legs and the correct passenger count.

**Affected Files:**
- BookFlightModal component
- Data passing from quote card to modal

### Acceptance Criteria

#### AC-1: Book Flight dialog shows all multi-city legs

**Given** a multi-city trip KTEB → EGGW → LFPB → KTEB with 4 passengers
**When** the Book Flight dialog opens
**Then** all 3 legs are listed with dates and the passenger count shows "4"

---

## Child Issue 8 — P2 Medium

**Title:** "1 passengers" grammar error — missing singular/plural logic
**Priority:** Normal (P3)
**Labels:** Bug, Agent:Frontend
**Estimate:** 1

### Description

The header displays "1 passengers" instead of "1 passenger". Missing pluralization logic for passenger count display.

**Affected Files:**
- `components/chat-interface.tsx` — header text formatting
- Sidebar passenger display

### Acceptance Criteria

#### AC-1: Correct grammar for passenger count

**Given** a trip with 1 passenger
**When** the header renders
**Then** it shows "1 passenger" (singular, no "s")

---

## Child Issue 9 — P2 Medium

**Title:** Archive doesn't move session from Active to Archive sidebar tab
**Priority:** Normal (P3)
**Labels:** Bug, Agent:Frontend
**Estimate:** 2

### Description

After the agent archives a session ("Session archived. The chat is now read-only."), the session remains in the "Active (4)" tab of the sidebar. It should move to the "Archive" tab.

**Affected Files:**
- `archive_session` tool handler
- `components/chat-sidebar.tsx` — session filtering by status
- Session state management

### Acceptance Criteria

#### AC-1: Archived session moves to Archive tab

**Given** the agent archives a session
**When** the sidebar refreshes
**Then** the session appears under "Archive" tab and is removed from "Active" tab

#### AC-2: Active count decrements

**Given** 4 active sessions and 1 is archived
**When** the sidebar refreshes
**Then** the Active tab shows "Active (3)"

---

## Child Issue 10 — P3 Low

**Title:** record_payment tool cannot auto-resolve contract from active session
**Priority:** Low (P4)
**Labels:** Bug, Agent:Coder
**Estimate:** 1

### Description

The `record_payment` tool requires an explicit `contract_id` parameter. It cannot auto-resolve the most recent contract from the active session context, forcing the user to manually provide a UUID.

**Affected Files:**
- `agents/jetvision-agent/tool-executor.ts` — `recordPayment` handler
- `agents/jetvision-agent/tools.ts` — tool parameter definition

### Acceptance Criteria

#### AC-1: Auto-resolve contract from session

**Given** a session with exactly one contract record
**When** `record_payment` is called without a `contract_id`
**Then** the tool automatically resolves the contract from the session's request record

---

## Child Issue 11 — P3 Low

**Title:** No ClosedWonConfirmation card rendered on deal closure
**Priority:** Low (P4)
**Labels:** Bug, Agent:Frontend
**Estimate:** 1

### Description

When the agent closes/archives a session, no ClosedWonConfirmation card is rendered in the chat. The agent only sends a text message ("Session archived."). A confirmation card should appear summarizing the deal outcome.

**Affected Files:**
- Closure flow in tool-executor.ts
- ClosedWonConfirmation component (may need to be created or wired up)

### Acceptance Criteria

#### AC-1: ClosedWonConfirmation card on closure

**Given** a session is marked as "closed_won" after payment
**When** the closure completes
**Then** a ClosedWonConfirmation card renders showing trip summary, total amount, and payment status

---

## Creation Order

When Linear is available, create issues in this order:
1. Parent issue (Track C Multi-City Lifecycle Bugs)
2. Child Issue 1 (P0 Critical — contract persistence) — `parentId` → parent
3. Child Issues 2-5 (P1 Major — header/sidebar) — `parentId` → parent
4. Child Issues 6-9 (P2 Medium — contract parity) — `parentId` → parent
5. Child Issues 10-11 (P3 Low — polish) — `parentId` → parent

## Related Issues

- ONEK-336: Post-Quote Lifecycle Bugs (Done)
- ONEK-342: Post-Quote UI Data Population Bugs (Backlog, 5 children)
- ONEK-343-347: Individual UI bugs from first test round
