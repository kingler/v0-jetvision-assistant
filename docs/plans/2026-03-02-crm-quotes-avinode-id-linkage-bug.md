# CRM Quotes Table — Avinode Quote ID Linkage Bug

> **Linear Issues Created**:
> - **ONEK-360** — Bug (top-level): CRM quotes table missing Avinode quote ID linkage
> - **ONEK-361** — Epic 1: Fix Quote ID Persistence in Webhook + RFQ Flows (child of ONEK-360)
>   - **ONEK-362** — Story 1.1: Webhook stores real Avinode quote IDs for all response types
>   - **ONEK-363** — Story 1.2: get_rfq flow saves quotes to CRM database
> - **ONEK-364** — Epic 2: Verify End-to-End Proposal Chain Works (child of ONEK-360)
>   - **ONEK-365** — Story 2.1: create_proposal resolves Avinode quote IDs after fix
>
> **Priority**: Urgent (P1) — blocks entire post-quote lifecycle
> **Type**: Bug
> **Team**: One Kaleidoscope
> **Related**: ONEK-336 (post-quote lifecycle bugs — symptoms, not root cause)

---

## Bug (Top-Level)

**Title**: CRM quotes table missing Avinode quote ID linkage — cascading proposal/contract/payment failure

### Summary

The `get_rfq` / Update RFQ flow does not write Avinode quote IDs into the CRM `quotes` table, causing cascading failures:

- `create_proposal` → "No quote found with Avinode ID: aquote-XXXXXXX"
- `generate_contract` → fails (no proposal exists)
- `confirm_payment` → fails (no contract exists)

Only `close_request` works (depends solely on `request_id`).

### Root Cause Analysis

**Problem 1** — `webhook-utils.ts:380-384`: `storeOperatorQuote()` uses broken fallback chain:
```typescript
avinode_quote_id:
  webhookData.quote?.id || quoteData?.id || `decline-${webhookPayload.eventId}`
```
Declined quotes get pseudo-IDs (`decline-XXXX`) instead of real quote IDs extracted from `messageDetails`.

**Problem 2** — `avinode-mcp-server/index.ts:2040+`: `getRFQ()` returns quote data to the UI but **never saves to the database**. There's no code path that inserts/upserts quotes into the CRM `quotes` table when quotes are retrieved via `get_rfq`.

**Problem 3** — `tool-executor.ts:483-490`: `createProposal()` calls `findQuoteByAvinodeId()` which queries `quotes.avinode_quote_id` — column never populated with real Avinode quote IDs.

### Reproduction

1. Create round-trip flight, send RFQ, operator submits quote
2. Pull quotes via "Check for available quotes" — cards render with `aquote-XXXXXXX`
3. Try `create_proposal` → ERROR: "No quote found with Avinode ID"
4. Query `quotes` table → no matching `avinode_quote_id` row

### Impact Matrix

| Scenario | Status | Reason |
|----------|--------|--------|
| Flight Request | PASS | No dependency on quotes table |
| Send RFQ | PASS | Avinode API only |
| Operator Approve | PASS | Avinode sandbox only |
| Update RFQ (pull quotes) | PASS (UI) | Cards render from API response, not DB |
| Generate Proposal | BLOCKED | `findQuoteByAvinodeId()` returns null |
| Generate Contract | BLOCKED | Cascading — no proposal |
| Confirm Payment | BLOCKED | Cascading — no contract |
| Close/Archive | PASS | Uses `request_id` only |

### Key Files

| File | Lines | Role |
|------|-------|------|
| `app/api/webhooks/avinode/webhook-utils.ts` | 380-384 | Quote storage with broken fallback |
| `mcp-servers/avinode-mcp-server/src/index.ts` | 2040-2140 | `getRFQ()` — returns but doesn't save |
| `mcp-servers/avinode-mcp-server/src/index.ts` | 2683-2731 | `getQuote()` — returns but doesn't save |
| `agents/jetvision-agent/tool-executor.ts` | 483-490 | `createProposal()` — fails on lookup |
| `lib/services/proposal-service.ts` | 65-81 | `findQuoteByAvinodeId()` — returns null |
| `supabase/migrations/015_modify_existing_tables.sql` | 15-17 | `avinode_quote_id` column |
| `supabase/migrations/020_extend_quotes_for_webhooks.sql` | 84-95 | Unique constraint |

### Demo Evidence

**Track B (Round-trip)**:
- Trip: D5RRXB, Route: EGGW <-> KVNY
- Quote: aquote-398402416
- Request ID: 28f35743-272b-47f3-82a6-55b7c7d7bc66
- Client ID: c0c0b0a1-0b0a-4c2a-9f2a-0b2b7a6c9d1e

**Track C (Multi-city, 2026-03-02)**:
- Trip: SWZUVL, Route: KTEB -> EGGW -> LFPB -> KTEB (3-leg multi-city)
- Quotes: aquote-398402435 (Falcon 7X, $147,350), aquote-398402436 (Challenger 600/601, $154,350)
- T1-T3 completed successfully (RFQ sent, operator approved, quotes pulled into Jetvision)
- T4 BLOCKED: `create_proposal` returns "No quote found" for aquote-398402435
- Proposal card rendered with TBD values (Route: TBD->TBD, Date: TBD, Passengers: 0, Price: $0)
- Email review card shows empty To/Subject/Message fields
- T5-T7 cascading blocked (contract, payment, closure all depend on proposal)

---

## Epic 1: Fix Quote ID Persistence in Webhook + RFQ Flows

### User Story 1.1: Webhook stores real Avinode quote IDs for all response types

**As a** sales representative
**I want** webhook-received quotes to be stored with their real Avinode quote ID
**So that** I can create proposals from any quote the system has received

#### AC-1: Quoted Response Stores Real ID

**Given** an operator submits a quote via Avinode (status: "quoted") with quote ID "aquote-398402416"
**When** the webhook handler receives the `TripRequestSellerResponse` event and calls `storeOperatorQuote()`
**Then** the `quotes` table row has `avinode_quote_id = 'aquote-398402416'` (not a pseudo-ID)

#### AC-2: Declined Response Extracts ID from Message Details

**Given** an operator declines a quote (status: "declined") where `webhookData.quote` is null
**When** the webhook handler fetches message details and calls `storeOperatorQuote()`
**Then** the `avinode_quote_id` is extracted from `messageDetails.data.id` or `messageDetails.quote_id` rather than falling back to `decline-{eventId}`

#### AC-3: Fallback Only When No ID Available

**Given** a webhook event where neither the payload nor fetched message details contain a quote ID
**When** `storeOperatorQuote()` builds the quote record
**Then** it falls back to `decline-{eventId}` as last resort AND logs a warning for investigation

**Dev Task**: Fix `storeOperatorQuote()` fallback chain in `webhook-utils.ts`

**Files to modify**:
- `app/api/webhooks/avinode/webhook-utils.ts` (lines 380-384)

**Implementation**:
```typescript
avinode_quote_id:
  webhookData.quote?.id ||
  quoteData?.id ||
  messageDetails?.data?.id ||
  messageDetails?.quote_id ||
  `decline-${webhookPayload.eventId}` // ONLY as last resort
```

---

### User Story 1.2: get_rfq flow saves quotes to CRM database

**As a** sales representative
**I want** quotes pulled via "Check for available quotes" to be saved to the CRM database
**So that** I can create proposals from quotes retrieved through the chat interface

#### AC-1: Quotes Upserted on RFQ Refresh

**Given** a trip with 3 operator quotes returned by the Avinode `get_rfq` API
**When** the agent executes the `get_rfq` tool and returns results to the chat
**Then** all 3 quotes are upserted into the `quotes` table with their `avinode_quote_id`, `request_id`, pricing, and aircraft details

#### AC-2: Duplicate Quotes Not Created

**Given** a quote with `avinode_quote_id = 'aquote-398402416'` already exists in the `quotes` table
**When** the user asks to refresh quotes and `get_rfq` returns the same quote
**Then** the existing row is updated (not duplicated) via the `avinode_quote_id` unique constraint

#### AC-3: Quote Data Includes Required Fields for Proposal

**Given** a quote upserted from `get_rfq` response
**When** `findQuoteByAvinodeId('aquote-398402416')` is called
**Then** it returns the quote's UUID, and the quote row contains: `operator_name`, `aircraft_type`, `price`, `currency`, `availability_status`

**Dev Task**: Add quote upsert logic to get_rfq tool execution

**Files to modify**:
- `agents/jetvision-agent/tool-executor.ts` — add DB upsert after `get_rfq` returns
- `mcp-servers/avinode-mcp-server/src/index.ts` — ensure response includes all required fields
- `lib/services/proposal-service.ts` — add `upsertQuoteFromRFQ()` function

---

## Epic 2: Verify End-to-End Proposal Chain Works

### User Story 2.1: create_proposal resolves Avinode quote IDs after fix

**As a** sales representative
**I want** `create_proposal` to find quotes by their Avinode ID
**So that** I can generate proposals directly from RFQ flight cards

#### AC-1: Proposal Created from Webhook Quote

**Given** a webhook-stored quote with `avinode_quote_id = 'aquote-398402416'` in the `quotes` table
**When** the agent calls `create_proposal` with `quote_id = 'aquote-398402416'`
**Then** `findQuoteByAvinodeId()` returns the quote UUID and the proposal is created successfully

#### AC-2: Proposal Created from RFQ-Refreshed Quote

**Given** a quote upserted via `get_rfq` with `avinode_quote_id = 'aquote-398402416'`
**When** the agent calls `create_proposal` with `quote_id = 'aquote-398402416'`
**Then** the proposal is created with correct flight details, pricing, and operator info from the quote row

#### AC-3: Cascading Chain Unblocked

**Given** a valid proposal created from a real quote
**When** the user requests contract generation, payment confirmation, and closure in sequence
**Then** `generate_contract` succeeds (finds proposal), `confirm_payment` succeeds (finds contract), and `close_request` succeeds

**Dev Task**: Add integration test for full post-quote lifecycle chain

**Files to create/modify**:
- `__tests__/integration/post-quote-lifecycle.test.ts` (create)
- Test: webhook quote → create_proposal → generate_contract → confirm_payment → close_request

---

## Linear Issue Creation Commands

When Linear MCP is available, create in this order:

```
1. Bug (top-level): "CRM quotes table missing Avinode quote ID linkage..."
   Labels: Bug, Priority: Urgent

2. Epic 1: "Fix Quote ID Persistence in Webhook + RFQ Flows"
   Parent: Bug issue ID

3. Story 1.1: "Webhook stores real Avinode quote IDs for all response types"
   Parent: Epic 1 ID

4. Story 1.2: "get_rfq flow saves quotes to CRM database"
   Parent: Epic 1 ID

5. Epic 2: "Verify End-to-End Proposal Chain Works"
   Parent: Bug issue ID

6. Story 2.1: "create_proposal resolves Avinode quote IDs after fix"
   Parent: Epic 2 ID
```
