# Bug: Contract ID Resolution Failure in Payment Flow

**Discovered during:** Track A demo recording (one-way KTEB → KVNY lifecycle)
**Date:** 2026-03-02
**Trip ID:** V6DXGM
**Proposal ID:** JV-MM99C9M9-XF5Z
**Contract displayed as:** `aquote-398402443`

---

## Symptoms

1. **"Mark Payment Received" button** on the Contract Generated card generates an internal contract ID `CONTRACT-MM99JPYE-TNEM` which cannot be resolved:
   - Error: "Contract not found: unable to resolve 'CONTRACT-MM99JPYE-TNEM' to a valid contract"

2. **Chat-based payment approach** — when providing `aquote-398402443` (the ID shown on the Contract Generated card), the agent says:
   - "That ID (aquote-398402443) is a quote ID, not a contractid, so I can't apply payment to it."

3. **"use active contract" approach** — agent says:
   - "I can't auto-resolve the contract in this tool flow—confirmpayment requires an explicit contractid."

## Impact

- **T6 (Record Payment)** — blocked
- **T7 (Close Deal & Archive)** — blocked (depends on payment being recorded first)

## Root Cause (Suspected)

The `book_flight` tool creates a contract using the Avinode quote ID (`aquote-398402443`) as its identifier, but the `confirmpayment` tool expects a different contract ID format (`contract-...` or UUID). There is a mismatch between how contracts are stored/identified across the booking and payment tools.

Specifically:
- The booking step stores the contract with an Avinode-derived key (`aquote-...`)
- The UI card generates a synthetic `CONTRACT-...` ID at render time
- The payment confirmation tool cannot resolve either format back to the actual contract record

## Steps to Reproduce

1. Complete lifecycle through T5 (Book Flight) for trip V6DXGM
2. Click "Mark Payment Received" on the Contract Generated card
3. Fill in payment details ($45,000, Wire Transfer, WT-2026-TEST-001)
4. Click "Confirm Payment" → Error appears

Alternatively:
1. After step 1 above, ask the agent in chat to record payment using `aquote-398402443`
2. Agent rejects the ID as a quote ID rather than a contract ID

## Affected Components

- `components/chat/flight-request-card.tsx` — Mark Payment Received button handler (generates the `CONTRACT-...` ID)
- Chat API payment confirmation tool (`confirmpayment`) — expects a contract ID it cannot resolve
- Contract ID generation/resolution logic — no shared mapping between booking output and payment input

## Suggested Fix

Ensure a single canonical contract ID is:
1. Generated during `book_flight` and persisted to the database
2. Returned in the booking tool response so the UI can display it
3. Accepted by `confirmpayment` without requiring format translation

The Contract Generated card should read the persisted contract ID rather than synthesizing one at render time.
