# Post-Quote Lifecycle Bug Fixes (ONEK-336) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 19 bugs across Scenarios 10-13 (proposal, contract, payment, closure) found in the March 1 E2E test run.

**Architecture:** All 6 issues are children of ONEK-336 and share the same post-quote lifecycle pipeline. Work is done on a single branch `fix/onek-336-post-quote-lifecycle-bugs` since bugs are tightly interdependent. Each task targets one Linear issue.

**Tech Stack:** Next.js 14, TypeScript, React, Supabase, OpenAI function calling, MCP tools

**Linear Issues:**
| Issue | Priority | Bugs | Summary |
|-------|----------|------|---------|
| ONEK-339 | High | P1-P6 | Proposal flow: approval bypass, status not updated |
| ONEK-337 | Urgent | C1 | "Book Flight" button non-functional |
| ONEK-338 | High | C2-C8 | Contract pipeline: missing tools, PDF, UI |
| ONEK-340 | Medium | PM1-PM2 | Payment: no PaymentConfirmedCard, no validation |
| ONEK-341 | Medium | CL1-CL3 | Closure: no ClosedWonConfirmation, DB gap |

---

## Task 1: ONEK-339 — Fix Proposal Flow (P1, P3, P6)

**Files:**
- Modify: `agents/jetvision-agent/tool-executor.ts` (sendProposalEmail function)
- Modify: `lib/prompts/jetvision-system-prompt.ts` (strengthen prepare-first rule)
- Test: `__tests__/unit/agents/tool-executor-proposal.test.ts` (create)

### Context

The proposal flow has 3 active bugs:
- **P1**: `ProposalPreview` renders without "Approve & Send" — but this is expected. The approval happens in `EmailApprovalUI` (rendered by `prepare_proposal_email` tool via tool-ui-registry). The real issue is P3.
- **P3**: Agent sometimes calls `send_proposal_email` directly, bypassing `prepare_proposal_email`. The system prompt at line ~449 says to always use prepare first, but the forced-tool patterns at lines 1261-1266 match "send proposal immediately" and route to `send_proposal_email`.
- **P6**: After `send_proposal_email` succeeds, `proposals.status` should auto-update to `'sent'` via `updateProposalSent()` (proposal-service.ts:366). But in the E2E test it didn't update. Root cause: either `updateProposalSent()` failed silently, or was never called.

### Step 1: Write failing test for proposal status update

```typescript
// __tests__/unit/agents/tool-executor-proposal.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock proposal-service
vi.mock('@/lib/services/proposal-service', () => ({
  getProposalById: vi.fn(),
  updateProposalSent: vi.fn(),
}))

describe('sendProposalEmail', () => {
  it('should call updateProposalSent after sending email successfully', async () => {
    const { updateProposalSent } = await import('@/lib/services/proposal-service')
    // Setup mocks for successful email send + proposal fetch
    // Execute sendProposalEmail tool
    // Assert updateProposalSent was called with correct proposal_id and email metadata
    expect(updateProposalSent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sent_to_email: expect.any(String), status: 'sent' })
    )
  })

  it('should NOT call send_proposal_email if prepare was not called first', async () => {
    // Test that the system prompt forced-tool patterns prefer prepare_proposal_email
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx vitest run __tests__/unit/agents/tool-executor-proposal.test.ts -v`
Expected: FAIL (test file doesn't exist yet or mocks not set up)

### Step 3: Investigate and fix P6 — proposal status not updating

Read `tool-executor.ts` around the `sendProposalEmail` function (lines 1156-1206).

**Likely fix**: Ensure `updateProposalSent()` is awaited and errors are not swallowed. Check that the proposal_id passed is valid UUID. Add error logging if the update fails.

```typescript
// In tool-executor.ts sendProposalEmail:
// After successful email send, ensure status update succeeds:
const updateResult = await updateProposalSent(proposal_id, {
  sent_to_email: to_email,
  sent_to_name: to_name || 'Customer',
  email_subject: subject,
  email_body: body,
  email_message_id: emailResult.message_id,
});

if (!updateResult || updateResult.status !== 'sent') {
  console.error('[sendProposalEmail] Failed to update proposal status:', updateResult);
}
```

### Step 4: Fix P3 — strengthen system prompt to prevent send bypass

In `lib/prompts/jetvision-system-prompt.ts`, find the forced-tool patterns section (lines 1261-1293). Ensure that patterns matching "send proposal" ALWAYS route to `prepare_proposal_email` first, with `send_proposal_email` only as explicit override.

**Check**: The pattern at line 1261-1266 for "send proposal immediately" — if this is too broad, narrow it to only match explicit "skip review" / "send immediately" phrases.

### Step 5: Run tests to verify fixes

Run: `npx vitest run __tests__/unit/agents/tool-executor-proposal.test.ts -v`
Expected: PASS

### Step 6: Commit

```bash
git add agents/jetvision-agent/tool-executor.ts lib/prompts/jetvision-system-prompt.ts __tests__/unit/agents/tool-executor-proposal.test.ts
git commit -m "fix(ONEK-339): ensure proposal status updates to sent after email, strengthen prepare-first prompt"
```

---

## Task 2: ONEK-337 — Fix "Book Flight" Button (C1)

**Files:**
- Modify: `components/chat-interface.tsx` (handleBookFlight function, ~line 2183)
- Possibly modify: `components/avinode/flight-search-progress.tsx` (prop passing)
- Test: `__tests__/unit/components/book-flight-handler.test.ts` (create)

### Context

The "Book Flight" button handler chain is:
1. `RFQFlightCard` button (line 638/894) → `handleBookFlight()` → calls `onBookFlight?.(flight.id, quoteId)`
2. `FlightSearchProgress` passes `onBookFlight` prop through (line 308)
3. `ChatInterface` provides `handleBookFlight` (line 2183) which:
   - Calls `rfqFlights.find(f => f.id === flightId)` (line 2187)
   - If not found, **returns silently** (line 2189) — no error shown to user
   - If found, opens BookFlightModal

**Root cause hypothesis**: `rfqFlights` (useMemo at line 301) may not contain the flight being clicked. This happens when:
- `activeChat.rfqFlights` is empty/stale after page reload
- The flight ID in the card doesn't match any ID in the memo
- The `rfqFlights` memo depends on `activeChat.rfqFlights` which may not be persisted properly

### Step 1: Write failing test

```typescript
// __tests__/unit/components/book-flight-handler.test.ts
describe('handleBookFlight', () => {
  it('should open BookFlightModal when flight is found in rfqFlights', () => {
    // Setup: rfqFlights contains the target flight
    // Action: call handleBookFlight(flightId, quoteId)
    // Assert: isBookFlightModalOpen === true, bookFlightData === flight
  })

  it('should fallback to message-embedded flights when rfqFlights is empty', () => {
    // Setup: rfqFlights is empty, but message contains FlightSearchProgress with flights
    // Action: call handleBookFlight(flightId, quoteId)
    // Assert: still finds the flight and opens modal
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx vitest run __tests__/unit/components/book-flight-handler.test.ts -v`

### Step 3: Fix handleBookFlight to search broader sources

In `components/chat-interface.tsx` at line 2183-2221, add fallback search when `rfqFlights.find()` returns null:

```typescript
const handleBookFlight = useCallback((flightId: string, quoteId?: string) => {
  console.log('[ChatInterface] Book flight:', { flightId, quoteId })

  // Primary: find from rfqFlights memo
  let flight = rfqFlights.find(f => f.id === flightId)

  // Fallback: search in activeChat.rfqFlights directly (may have fresher data)
  if (!flight && activeChat.rfqFlights) {
    flight = activeChat.rfqFlights.find(f => f.id === flightId)
  }

  // Fallback 2: search in message-embedded flight data
  if (!flight) {
    for (const msg of (activeChat.messages || [])) {
      const msgFlights = msg.rfqFlights || msg.flights || []
      const found = msgFlights.find((f: RFQFlight) => f.id === flightId)
      if (found) {
        flight = found
        break
      }
    }
  }

  if (!flight) {
    console.error('[ChatInterface] Flight not found in any source:', flightId)
    // Show user feedback instead of silent failure
    return
  }

  // ... rest of existing logic (check for proposal customer, open modal)
}, [rfqFlights, activeChat.rfqFlights, activeChat.messages])
```

### Step 4: Run tests to verify

Run: `npx vitest run __tests__/unit/components/book-flight-handler.test.ts -v`
Expected: PASS

### Step 5: Commit

```bash
git add components/chat-interface.tsx __tests__/unit/components/book-flight-handler.test.ts
git commit -m "fix(ONEK-337): fix Book Flight button by adding fallback flight lookup"
```

---

## Task 3: ONEK-338 — Fix Contract Pipeline (C2-C8)

**Files:**
- Modify: `agents/jetvision-agent/tool-executor.ts` (generateContract, add send_contract_email, add update_contract_status)
- Modify: `agents/jetvision-agent/tools.ts` (tool definitions)
- Modify: `lib/services/contract-service.ts` (PDF generation, status transitions)
- Test: `__tests__/unit/agents/tool-executor-contract.test.ts` (create)

### Context

7 bugs in the contract pipeline:

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| C2 | BookFlightModal not triggered from agent path | Agent `generate_contract` should return `contractSentData` for ContractSentConfirmation rendering (already wired at chat-interface.tsx:1030-1041) |
| C3 | No `send_contract_email` tool | Create new tool that sends contract PDF via email |
| C4 | `file_url` null after `generate_contract` | PDF generation in contract-service not persisting URL |
| C5 | No auto-open of PDF tab | Client-side only — add to ContractSentConfirmation "View PDF" button |
| C6 | ContractSentConfirmation not rendered in agent path | Ensure `contractSentData` is returned with all required fields from tool-executor |
| C7 | No `update_contract_status` tool | Create new tool for status transitions |
| C8 | Contract stays in `draft` | After generate + send, auto-update status to `sent` |

### Step 1: Write failing tests

```typescript
// __tests__/unit/agents/tool-executor-contract.test.ts
describe('generateContract', () => {
  it('should return contractSentData with all required ContractSentPayload fields', async () => {
    // Assert returned object has: contractId, contractNumber, status, pdfUrl,
    // customerName, customerEmail, flightRoute, departureDate, totalAmount, currency
  })

  it('should generate PDF and populate file_url', async () => {
    // Assert contract-service createContract returns non-null file_url
  })
})

describe('sendContractEmail', () => {
  it('should send email with contract PDF and update status to sent', async () => {
    // Assert email sent via Gmail MCP
    // Assert contract status updated to 'sent'
  })
})

describe('updateContractStatus', () => {
  it('should transition contract status', async () => {
    // Assert status can be updated from draft->sent, sent->signed, etc.
  })
})
```

### Step 2: Run tests to verify they fail

Run: `npx vitest run __tests__/unit/agents/tool-executor-contract.test.ts -v`

### Step 3: Fix C4 + C6 — generateContract return data and PDF

In `tool-executor.ts`, find the `generateContract` handler. Ensure:

1. **PDF generation**: Call the PDF generation service and store the URL in Supabase storage. Update `contracts.file_url` with the storage URL.
2. **Return data**: Return a `contractSentData` object matching `ContractSentPayload`:

```typescript
return {
  contractId: contract.id,
  contractNumber: contract.contract_number,
  status: contract.status,
  pdfUrl: contract.file_url, // Must be non-null
  // These fields enable ContractSentConfirmation rendering in chat-interface.tsx:1030-1041
  contractSentData: {
    contractId: contract.id,
    contractNumber: contract.contract_number,
    status: contract.status,
    pdfUrl: contract.file_url,
    customer: { name: clientName, email: clientEmail },
    flightRoute: `${departureAirport} → ${arrivalAirport}`,
    pricing: { totalAmount: contract.total_amount, currency: contract.currency },
  },
}
```

### Step 4: Add C3 — `send_contract_email` tool

In `agents/jetvision-agent/tools.ts`, add tool definition:

```typescript
{
  name: 'send_contract_email',
  description: 'Send a generated contract to the client via email with PDF attachment',
  parameters: {
    type: 'object',
    properties: {
      contract_id: { type: 'string', description: 'Contract UUID' },
      to_email: { type: 'string', description: 'Recipient email' },
      to_name: { type: 'string', description: 'Recipient name' },
      subject: { type: 'string', description: 'Email subject (optional)' },
      message: { type: 'string', description: 'Email body (optional)' },
    },
    required: ['contract_id'],
  },
}
```

In `tool-executor.ts`, implement handler:
1. Fetch contract by ID
2. Get PDF from `file_url`
3. Send email via Gmail MCP with PDF attached
4. Update contract status to `'sent'` via `updateContractSent()`
5. Return success with contract details

### Step 5: Add C7 — `update_contract_status` tool

In `tools.ts`, add:
```typescript
{
  name: 'update_contract_status',
  description: 'Update the status of a contract (e.g., from draft to sent, sent to signed)',
  parameters: {
    type: 'object',
    properties: {
      contract_id: { type: 'string', description: 'Contract UUID or contract number' },
      status: { type: 'string', enum: ['sent', 'viewed', 'signed', 'payment_pending', 'paid', 'completed', 'cancelled'] },
    },
    required: ['contract_id', 'status'],
  },
}
```

In `tool-executor.ts`, implement using existing `contract-service.ts` methods.

### Step 6: Fix C8 — contract should auto-send after generation

Two options (implementation should pick one):
- **Option A**: `generate_contract` auto-sets status to `sent` if email is sent in the same flow
- **Option B**: Keep `draft` status, require explicit `send_contract_email` call (cleaner separation)

Recommend **Option B** for human-in-the-loop. Update system prompt to instruct: `generate_contract` → review → `send_contract_email`.

### Step 7: Run tests

Run: `npx vitest run __tests__/unit/agents/tool-executor-contract.test.ts -v`
Expected: PASS

### Step 8: Commit

```bash
git add agents/jetvision-agent/tool-executor.ts agents/jetvision-agent/tools.ts lib/services/contract-service.ts __tests__/unit/agents/tool-executor-contract.test.ts
git commit -m "fix(ONEK-338): add send_contract_email and update_contract_status tools, fix PDF generation and contract rendering"
```

---

## Task 4: ONEK-340 — Fix Payment Confirmation (PM1, PM2)

**Files:**
- Modify: `agents/jetvision-agent/tool-executor.ts` (confirmPayment return data)
- Test: `__tests__/unit/agents/tool-executor-payment.test.ts` (create)

### Context

- **PM1**: `PaymentConfirmedCard` exists and is rendered by `AgentMessage` when `showPaymentConfirmation === true` (agent-message.tsx:685-687). The UI path works (chat-interface.tsx:2380-2403). But the agent path (`confirm_payment` tool) does NOT return `paymentConfirmationData` — confirmed by grep showing no matches in tool-executor.ts.
- **PM2**: `confirm_payment` accepts any amount without checking against contract total. Should flag partial payments.

### Step 1: Write failing test

```typescript
// __tests__/unit/agents/tool-executor-payment.test.ts
describe('confirmPayment', () => {
  it('should return paymentConfirmationData for PaymentConfirmedCard rendering', async () => {
    // Execute confirmPayment tool
    // Assert result includes paymentConfirmationData with:
    // contractId, contractNumber, paymentAmount, paymentMethod, paymentReference, paidAt, currency
  })

  it('should flag partial payment when amount is less than contract total', async () => {
    // Setup: contract total = $78,000, payment = $45,000
    // Assert: result includes partial_payment warning with remaining balance
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx vitest run __tests__/unit/agents/tool-executor-payment.test.ts -v`

### Step 3: Fix PM1 — return paymentConfirmationData from confirmPayment

In `tool-executor.ts`, find the `confirmPayment` handler. After successful payment recording, add to the return value:

```typescript
return {
  success: true,
  contract_id: contract.id,
  contract_number: contract.contract_number,
  payment_recorded: true,
  // NEW: Enable PaymentConfirmedCard rendering in chat-interface.tsx:1043-1044
  paymentConfirmationData: {
    contractId: contract.id,
    contractNumber: contract.contract_number,
    paymentAmount: payment_amount,
    paymentMethod: payment_method,
    paymentReference: payment_reference,
    paidAt: new Date().toISOString(),
    currency: contract.currency || 'USD',
  },
}
```

### Step 4: Fix PM2 — add partial payment validation

In the `confirmPayment` handler, after resolving the contract, compare payment amount to contract total:

```typescript
const contractTotal = contract.total_amount || 0
if (payment_amount < contractTotal) {
  const remaining = contractTotal - payment_amount
  // Include warning in response but still process the payment
  result.partial_payment = true
  result.remaining_balance = remaining
  result.message = `Partial payment of ${payment_amount} recorded. Remaining balance: ${remaining}. Contract total: ${contractTotal}.`
}
```

### Step 5: Run tests

Run: `npx vitest run __tests__/unit/agents/tool-executor-payment.test.ts -v`
Expected: PASS

### Step 6: Commit

```bash
git add agents/jetvision-agent/tool-executor.ts __tests__/unit/agents/tool-executor-payment.test.ts
git commit -m "fix(ONEK-340): return paymentConfirmationData from confirm_payment, add partial payment validation"
```

---

## Task 5: ONEK-341 — Fix Deal Closure (CL1, CL2, CL3)

**Files:**
- Modify: `agents/jetvision-agent/tool-executor.ts` (confirmPayment closure data)
- Modify: `lib/services/contract-service.ts` or session archival logic
- Test: `__tests__/unit/agents/tool-executor-closure.test.ts` (create)

### Context

- **CL1**: `ClosedWonConfirmation` exists and is rendered by `AgentMessage` when `showClosedWon === true` (agent-message.tsx:692-694). The UI path works (chat-interface.tsx:2405-2426). But the agent path does NOT return `closedWonData` — confirmed by grep.
- **CL2**: `session_status` not updated to `'archived'` in DB when deal is closed. Only `current_step` is updated to `closed_won`.
- **CL3**: `confirm_payment` auto-archives without a separate step. The UI path at chat-interface.tsx:2429 intentionally does NOT auto-archive ("Do NOT auto-archive — let the user see the confirmation cards first"). But the agent path might auto-archive.

### Step 1: Write failing test

```typescript
// __tests__/unit/agents/tool-executor-closure.test.ts
describe('confirmPayment closure', () => {
  it('should return closedWonData for ClosedWonConfirmation rendering', async () => {
    // Assert result includes closedWonData with:
    // contractNumber, customerName, flightRoute, dealValue, currency, timestamps
  })

  it('should update session_status to archived in database', async () => {
    // After confirm_payment, check DB: requests.session_status === 'archived'
  })

  it('should NOT auto-archive immediately — let user see confirmation cards first', async () => {
    // Verify session_status transitions: active -> closed_won (not archived immediately)
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx vitest run __tests__/unit/agents/tool-executor-closure.test.ts -v`

### Step 3: Fix CL1 — return closedWonData from confirmPayment

In `tool-executor.ts`, after payment confirmation succeeds, add `closedWonData` to return value:

```typescript
// After paymentConfirmationData, also return closure data:
closedWonData: {
  contractNumber: contract.contract_number,
  customerName: contract.client_name,
  flightRoute: `${contract.departure_airport} → ${contract.arrival_airport}`,
  dealValue: payment_amount,
  currency: contract.currency || 'USD',
  proposalSentAt: proposal?.sent_at || undefined,
  contractSentAt: contract.sent_at || undefined,
  paymentReceivedAt: new Date().toISOString(),
},
```

### Step 4: Fix CL2 — update session_status in DB

In the `confirmPayment` handler, after recording payment, update the requests table:

```typescript
// Update request status to closed_won
await supabaseAdmin
  .from('requests')
  .update({
    status: 'closed_won',
    session_status: 'closed_won', // Not 'archived' yet — let user see cards first
    current_step: 'closed_won',
    session_ended_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  })
  .eq('id', requestId)
```

### Step 5: Fix CL3 — separate archive from payment

Ensure `confirm_payment` sets status to `closed_won` (not `archived`). Archival should be a separate explicit action by the user (via sidebar "Archive" button or `archive_session` tool).

If there's auto-archive logic in the tool-executor, remove or gate it:
```typescript
// Do NOT auto-archive after payment — user needs to see PaymentConfirmedCard
// and ClosedWonConfirmation before archiving
// Archive should happen via explicit user action
```

### Step 6: Run tests

Run: `npx vitest run __tests__/unit/agents/tool-executor-closure.test.ts -v`
Expected: PASS

### Step 7: Commit

```bash
git add agents/jetvision-agent/tool-executor.ts __tests__/unit/agents/tool-executor-closure.test.ts
git commit -m "fix(ONEK-341): return closedWonData, fix session_status update, separate archive from payment"
```

---

## Task 6: Update Linear Issues and Create PR

**Files:**
- No code changes

### Step 1: Run full test suite

Run: `npm run test:unit`
Expected: All tests pass

### Step 2: Run lint

Run: `npm run lint`
Expected: No errors

### Step 3: Update all 6 Linear issues to "In Progress"

Update ONEK-336, ONEK-337, ONEK-338, ONEK-339, ONEK-340, ONEK-341 status.

### Step 4: Create PR

```bash
gh pr create --title "fix: post-quote lifecycle bugs (ONEK-336)" --body "$(cat <<'EOF'
## Summary
- **ONEK-339**: Fix proposal status not updating to 'sent' after email, strengthen prepare-first prompt
- **ONEK-337**: Fix "Book Flight" button by adding fallback flight lookup when rfqFlights is stale
- **ONEK-338**: Add `send_contract_email` and `update_contract_status` tools, fix PDF generation and ContractSentConfirmation rendering
- **ONEK-340**: Return `paymentConfirmationData` from `confirm_payment` for PaymentConfirmedCard rendering, add partial payment validation
- **ONEK-341**: Return `closedWonData` from `confirm_payment` for ClosedWonConfirmation, fix session_status DB update, separate archive from payment

## Test plan
- [ ] Run `npm run test:unit` — all pass
- [ ] E2E Scenario 10: Proposal generates, preview renders, "Send Email" button works, proposal status updates to 'sent' in DB
- [ ] E2E Scenario 11: "Book Flight" button opens BookFlightModal, contract PDF generated with file_url, ContractSentConfirmation card renders
- [ ] E2E Scenario 12: PaymentConfirmedCard renders after `confirm_payment`, partial payment flagged
- [ ] E2E Scenario 13: ClosedWonConfirmation renders with timeline, session_status updated in DB, no auto-archive

Fixes: ONEK-336, ONEK-337, ONEK-338, ONEK-339, ONEK-340, ONEK-341
EOF
)"
```

### Step 5: Post dev summary to Linear

Use `/linear-update-summary` for ONEK-336.

---

## Dependency Graph

```
Task 1 (ONEK-339: Proposal) ──┐
                               ├──> Task 3 (ONEK-338: Contract)
Task 2 (ONEK-337: Book Flight)┘          │
                                          v
                               Task 4 (ONEK-340: Payment)
                                          │
                                          v
                               Task 5 (ONEK-341: Closure)
                                          │
                                          v
                               Task 6 (PR + Linear Update)
```

Tasks 1 and 2 are independent and can run in parallel. Tasks 3-5 are sequential (each depends on the previous pipeline stage). Task 6 is the final PR creation.
