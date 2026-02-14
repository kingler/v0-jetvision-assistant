# Workflow State Machine Diagram

Complete state machine covering the Jetvision deal lifecycle (request through deal closure) and the ISO agent onboarding lifecycle.

## WorkingMemory Workflow Stages (Agent-Level)

These are the stages tracked in `requests.workflow_state` JSONB and injected into the agent's system prompt.

```mermaid
stateDiagram-v2
    [*] --> gathering_info: User starts flight request

    gathering_info --> gathering_info: Missing fields → ask user
    gathering_info --> trip_created: create_trip succeeds

    trip_created --> awaiting_quotes: User sends RFQs in Avinode

    awaiting_quotes --> quotes_received: Webhook delivers operator quotes

    quotes_received --> proposal_ready: create_proposal succeeds<br/>(or prepare_proposal_email)

    proposal_ready --> proposal_sent: Email approved & sent<br/>(send_proposal_email or /api/proposal/approve-email)

    proposal_sent --> customer_replied: search_emails finds reply<br/>from customer

    customer_replied --> contract_sent: "Book Flight" UI action<br/>→ /api/contract/send<br/>generates PDF & emails contract

    contract_sent --> payment_received: "Mark Payment Received" UI action<br/>→ /api/contract/{id}/payment<br/>records amount, method, reference

    payment_received --> deal_closed: "Close Deal" or auto-close<br/>after payment confirmed

    deal_closed --> [*]: Deal complete

    %% Error & retry paths
    proposal_sent --> proposal_sent: No reply yet → check again later
    customer_replied --> proposal_ready: Negative reply → revise proposal
    contract_sent --> contract_sent: Awaiting payment
```

## UI Workflow Steps (Frontend Progress Bar)

Maps to `WorkflowStep` constants in `lib/chat/constants/workflow.ts`. The progress bar shows these 10 steps.

```mermaid
stateDiagram-v2
    direction LR

    state "Step 1\nUnderstanding\nRequest" as S1
    state "Step 2\nCreating\nTrip" as S2
    state "Step 3\nRequesting\nQuotes" as S3
    state "Step 4\nAnalyzing\nOptions" as S4
    state "Step 5\nProposal\nReady" as S5
    state "Step 6\nProposal\nSent" as S6
    state "Step 7\nContract\nGenerated" as S7
    state "Step 8\nContract\nSent" as S8
    state "Step 9\nPayment\nPending" as S9
    state "Step 10\nClosed\nWon" as S10

    [*] --> S1
    S1 --> S2
    S2 --> S3
    S3 --> S4
    S4 --> S5
    S5 --> S6
    S6 --> S7
    S7 --> S8
    S8 --> S9
    S9 --> S10
    S10 --> [*]
```

## Contract Status Lifecycle

Tracked in the `contracts` table `status` column (PostgreSQL `contract_status` enum).

```mermaid
stateDiagram-v2
    [*] --> draft: Contract record created

    draft --> sent: Contract PDF generated & emailed<br/>/api/contract/send

    sent --> viewed: Customer opens contract<br/>(tracked via email/link)

    viewed --> signed: Customer signs contract<br/>(signature data recorded)
    sent --> signed: Customer signs without view tracking

    signed --> payment_pending: Awaiting payment

    payment_pending --> paid: Payment received<br/>/api/contract/{id}/payment

    paid --> completed: Deal finalized<br/>(auto or manual close)

    %% Terminal states
    draft --> cancelled: Cancelled before sending
    sent --> cancelled: Cancelled after sending
    sent --> expired: Quote expired
    viewed --> cancelled: Customer declines
    signed --> cancelled: Contract voided

    cancelled --> [*]
    expired --> [*]
    completed --> [*]
```

## RFQ Status Lifecycle

Tracked per-operator quote in Avinode.

```mermaid
stateDiagram-v2
    [*] --> unanswered: RFQ sent to operator

    unanswered --> quoted: Operator submits quote
    unanswered --> declined: Operator declines
    unanswered --> expired: No response in time

    quoted --> quoted: Operator revises quote

    quoted --> [*]: Quote accepted for proposal
    declined --> [*]
    expired --> [*]
```

## Request Status Lifecycle

Tracked in `requests.status` column (PostgreSQL enum with 16 values).

```mermaid
stateDiagram-v2
    [*] --> draft: New request created

    draft --> pending: Request submitted
    pending --> analyzing: Agent analyzing request

    analyzing --> fetching_client_data: Need client info
    fetching_client_data --> searching_flights: Client data loaded

    analyzing --> searching_flights: Client data already available
    searching_flights --> trip_created: Avinode trip created

    trip_created --> awaiting_user_action: Deep link displayed
    awaiting_user_action --> avinode_session_active: User opens Avinode

    avinode_session_active --> monitoring_for_quotes: RFQs sent
    monitoring_for_quotes --> awaiting_quotes: Polling for responses

    awaiting_quotes --> analyzing_proposals: Quotes received
    analyzing_proposals --> generating_email: Proposal created
    generating_email --> sending_proposal: Email prepared

    sending_proposal --> completed: Proposal sent

    %% Terminal states
    draft --> cancelled: User cancels
    pending --> cancelled: User cancels
    awaiting_quotes --> failed: All quotes expired
    sending_proposal --> failed: Email delivery failed

    completed --> [*]
    cancelled --> [*]
    failed --> [*]
```

## ISO Agent Onboarding Status Lifecycle

Tracked in `iso_agents.onboarding_status` column (PostgreSQL `onboarding_status` enum). Existing agents are grandfathered as `completed`.

```mermaid
stateDiagram-v2
    [*] --> pending: Clerk sign-up webhook<br/>creates iso_agents row

    pending --> profile_complete: User submits onboarding form<br/>POST /api/onboarding/register<br/>(personal info + commission ack)

    profile_complete --> contract_sent: Employment contract PDF generated<br/>POST /api/onboarding/generate-contract<br/>+ emailed with secure token<br/>POST /api/onboarding/send-contract

    contract_sent --> contract_signed: User clicks email link<br/>/onboarding/contract-review/[token]<br/>validates token, signs contract<br/>POST /api/onboarding/sign-contract

    contract_signed --> completed: Automatic transition<br/>after signature captured

    completed --> [*]: Agent fully onboarded<br/>redirect to /chat

    %% Error recovery paths
    contract_sent --> contract_sent: Token expired → resend<br/>POST /api/onboarding/resend-contract
    pending --> pending: Browser closed → return to /onboarding<br/>resume from current step
```

## Onboarding Token Lifecycle

Tracks the single-use, time-limited contract review tokens in `contract_tokens` table.

```mermaid
stateDiagram-v2
    [*] --> generated: crypto.randomBytes(32)<br/>stored with agent_id, email, expires_at

    generated --> validated: GET /api/onboarding/validate-token/[token]<br/>checks: not expired, not used, email matches

    validated --> used: POST /api/onboarding/sign-contract<br/>sets used_at, captures signature

    used --> [*]: Token consumed (single-use)

    %% Error states
    generated --> expired: 72 hours elapsed
    generated --> invalidated: New token generated<br/>(resend contract)
    validated --> rejected: Email mismatch or<br/>rate limit exceeded

    expired --> [*]
    invalidated --> [*]
    rejected --> [*]
```

## Combined State Transition Table

| From Stage | To Stage | Trigger | Actor |
|---|---|---|---|
| `gathering_info` | `trip_created` | `create_trip` tool succeeds | Agent (MCP) |
| `trip_created` | `awaiting_quotes` | User sends RFQs in Avinode | User (manual) |
| `awaiting_quotes` | `quotes_received` | `get_rfq` returns flights | Agent (MCP) |
| `quotes_received` | `proposal_ready` | `prepare_proposal_email` succeeds | Agent (MCP) |
| `proposal_ready` | `proposal_sent` | `send_proposal_email` or email approved | Agent/User |
| `proposal_sent` | `customer_replied` | `search_emails` finds reply | Agent (Gmail MCP) |
| `customer_replied` | `contract_sent` | "Book Flight" button → `/api/contract/send` | User (UI) |
| `contract_sent` | `payment_received` | "Mark Payment Received" → `/api/contract/{id}/payment` | User (UI) |
| `payment_received` | `deal_closed` | "Close Deal" or auto-close after payment | User/System |

### Onboarding State Transitions

| From Status | To Status | Trigger | Actor |
|---|---|---|---|
| (new) | `pending` | Clerk webhook `user.created` → INSERT iso_agents | System (Clerk) |
| `pending` | `profile_complete` | Submit onboarding form → POST /api/onboarding/register | User (UI) |
| `profile_complete` | `contract_sent` | Generate PDF + email with token → POST /api/onboarding/send-contract | System |
| `contract_sent` | `contract_signed` | Review + sign contract → POST /api/onboarding/sign-contract | User (email link) |
| `contract_signed` | `completed` | Automatic after signature captured | System |
