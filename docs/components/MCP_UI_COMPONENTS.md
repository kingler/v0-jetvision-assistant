# MCP UI Components

Reference documentation for the Tool UI Registry system that maps Jetvision agent tool calls to React UI components rendered inline in the chat thread.

---

## Architecture Overview

```
User Message
    ↓
/api/chat/route.ts
    ↓
JetvisionAgent.execute()
    ↓
Tool Executor → MCP Servers (Avinode, Supabase, Gmail)
    ↓
Tool Results (SSE stream)
    ↓
ChatInterface receives tool_results
    ↓
ToolUIRenderer checks TOOL_UI_REGISTRY
    ├── Match found → Render visual component
    └── No match → Render as markdown text
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/mcp-ui/tool-ui-registry.ts` | Central registry mapping tool names to components + prop extractors |
| `components/mcp-ui/ToolUIRenderer.tsx` | Renders the correct component for a tool result, with error boundary |
| `lib/mcp-ui/action-handler.ts` | Routes `UIActionResult` callbacks from components back to the chat |

---

## ToolUIRenderer

**File**: `components/mcp-ui/ToolUIRenderer.tsx`

The renderer is the bridge between agent tool results and visual UI. It:

1. Looks up the tool name in `TOOL_UI_REGISTRY`
2. If found, calls `extractProps(toolInput, toolResult, onAction)` to transform raw data into component props
3. Renders the component wrapped in a `ToolUIErrorBoundary`
4. Returns `null` for text-only tools (no registry entry)

```tsx
<ToolUIRenderer
  toolName="create_trip"
  toolInput={{ departure_airport: 'KTEB', arrival_airport: 'KVNY', ... }}
  toolResult={{ trip_id: 'trp123', deep_link: 'https://...', ... }}
  onAction={handleUIAction}
/>
```

---

## Action Handler

**File**: `lib/mcp-ui/action-handler.ts`

All interactive tool UI components dispatch `UIActionResult` actions via the `onAction` callback. The action handler routes these to the appropriate behavior:

| Action Type | Behavior | Example |
|-------------|----------|---------|
| `tool` | Invokes another tool via chat message | `{ type: 'tool', payload: { toolName: 'create_proposal', params: { quote_id: 'q1' } } }` |
| `prompt` | Injects text into the chat | `{ type: 'prompt', payload: { prompt: 'Show full thread for q1' } }` |
| `link` | Opens URL in new browser tab | `{ type: 'link', payload: { url: 'https://avinode.com/...' } }` |
| `intent` | Sends structured intent to chat | `{ type: 'intent', payload: { intent: 'book_flight', params: {...} } }` |
| `notify` | Shows a toast notification (sonner) | `{ type: 'notify', payload: { message: 'Trip ID copied' } }` |

---

## Tool UI Registry

**File**: `lib/mcp-ui/tool-ui-registry.ts`

11 of the agent's 26 tools have visual components. The remaining 15 tools return text-only results rendered as markdown.

### Registered Tools (11 with visual UI)

#### 1. `create_trip` → TripCreatedUI

| | |
|---|---|
| **Component** | `components/mcp-ui/composites/TripCreatedUI.tsx` |
| **Sub-components** | `TripSummaryCard`, `AvinodeDeepLinks` |
| **Purpose** | Displays the created trip with route, dates, and Avinode deep link |
| **Trip types** | `single_leg`, `round_trip`, `multi_city` |
| **Actions** | Copy trip ID (notify), Open in Avinode (link) |

**Props** (extracted from tool input + result):

| Prop | Type | Source |
|------|------|--------|
| `tripId` | `string` | `result.trip_id` |
| `deepLink` | `string` | `result.deep_link` |
| `departureAirport` | `{ icao, name, city }` | Normalized from `result.segments[0]` or `input.departure_airport` |
| `arrivalAirport` | `{ icao, name, city }` | Normalized from last segment or `input.arrival_airport` |
| `departureDate` | `string` | `result.segments[0].departure_date` or `input.departure_date` |
| `passengers` | `number` | `input.passengers` or `result.passengers` |
| `tripType` | `string` | `result.trip_type` (authoritative) or derived from `return_date` |
| `returnDate` | `string?` | Second segment date or `input.return_date` |
| `segments` | `TripSegmentUI[]?` | Normalized from `result.segments` |

---

#### 2. `get_rfq` → RfqResultsUI

| | |
|---|---|
| **Component** | `components/mcp-ui/composites/RfqResultsUI.tsx` |
| **Sub-components** | `RFQFlightCard` (per flight) |
| **Purpose** | Lists flight quotes received from operators |
| **Actions** | Generate Proposal (tool: `create_proposal`), View Chat (prompt) |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `flights` | `RFQFlight[]` | `result.flights` |

---

#### 3. `get_quote` → RfqQuoteDetailsCard

| | |
|---|---|
| **Component** | `components/avinode/rfq-quote-details-card.tsx` |
| **Purpose** | Detailed view of a single operator quote |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `rfqId` | `string` | `result.rfqId` or `result.rfq_id` |
| `quoteId` | `string` | `result.quoteId` or `result.quote_id` |
| `operator` | `{ name, rating }` | `result.operatorName`, `result.operatorRating` |
| `aircraft` | `{ type, tail, category, maxPassengers }` | `result.aircraftType`, `result.tailNumber`, etc. |
| `price` | `{ amount, currency }` | `result.totalPrice`, `result.currency` |
| `flightDetails` | `{ flightTimeMinutes, distanceNm }` | `result.flightTimeMinutes`, `result.distanceNm` |
| `status` | `string` | `result.rfqStatus` or `result.status` |

---

#### 4. `get_trip_messages` → OperatorChatInline

| | |
|---|---|
| **Component** | `components/message-components/operator-chat-inline.tsx` |
| **Purpose** | Inline operator message thread within the chat |
| **Actions** | View Full Thread (prompt), Reply (prompt) |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `flightContext` | `{ quoteId, operatorName }` | `input.request_id` |
| `messages` | `Array<{ id, content, timestamp, type, sender }>` | `result.messages[]` mapped |

---

#### 5. `list_requests` → PipelineDashboard

| | |
|---|---|
| **Component** | `components/message-components/pipeline-dashboard.tsx` |
| **Purpose** | Dashboard showing all active flight requests with stats |
| **Actions** | View Request (prompt), Refresh (tool: `list_requests`) |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `stats` | `{ totalRequests, pendingRequests, completedRequests, totalQuotes, activeWorkflows }` | Computed from `result.requests` |
| `requests` | `Array<{ id, departureAirport, arrivalAirport, departureDate, passengers, status, createdAt, clientName }>` | `result.requests[]` mapped |

---

#### 6. `get_quotes` → QuoteComparisonUI

| | |
|---|---|
| **Component** | `components/mcp-ui/composites/QuoteComparisonUI.tsx` |
| **Sub-components** | `QuoteComparison` |
| **Purpose** | Side-by-side comparison of multiple operator quotes |
| **Actions** | Select Quote (tool: `create_proposal`) |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `quotes` | `Array<{ id, operatorName, aircraftType, price, departureTime, arrivalTime, flightDuration, score?, isRecommended?, legType?, legSequence? }>` | `result.quotes[]` mapped |

---

#### 7. `create_proposal` / `get_proposal` → ProposalPreview

| | |
|---|---|
| **Component** | `components/message-components/proposal-preview.tsx` |
| **Purpose** | Preview of a generated proposal document |
| **Actions** | View PDF (link), Send Email (tool: `send_proposal_email`) |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `proposal.id` | `string` | `result.id` or `result.proposal_id` |
| `proposal.title` | `string` | `result.title` or `result.proposal_number` |
| `proposal.flightDetails` | `{ route, date, passengers, tripType, returnDate, segments }` | Computed from result |
| `proposal.selectedQuote` | `{ operatorName, aircraftType, price }` | `result.operator_name`, etc. |
| `proposal.summary` | `string?` | `result.summary` |

---

#### 8. `prepare_proposal_email` → EmailApprovalUI

| | |
|---|---|
| **Component** | `components/mcp-ui/composites/EmailApprovalUI.tsx` |
| **Sub-components** | `EmailPreviewCard` |
| **Purpose** | Human-in-the-loop email review and approval before sending |
| **Actions** | Send Email (tool: `send_proposal_email`), Cancel (notify) |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `proposalId` | `string` | `result.proposal_id` |
| `proposalNumber` | `string?` | `result.proposal_number` |
| `to` | `{ email, name }` | `result.to` |
| `subject` | `string` | `result.subject` |
| `body` | `string` | `result.body` |
| `attachments` | `Array<{ name, url, size? }>` | `result.attachments` |
| `flightDetails` | `{ departureAirport, arrivalAirport, departureDate, passengers, tripType, returnDate, segments }` | `result.flight_details` or flat fields |
| `pricing` | `{ subtotal, total, currency }?` | `result.pricing` |
| `generatedAt` | `string?` | `result.generated_at` |
| `requestId` | `string?` | `result.request_id` |

---

#### 9. `book_flight` → ContractSentConfirmation

| | |
|---|---|
| **Component** | `components/contract/contract-sent-confirmation.tsx` |
| **Purpose** | Confirmation card after contract generation |
| **Statuses** | `draft`, `sent`, `signed`, `payment_pending`, `paid`, `completed` |
| **Actions** | View Contract PDF (link), Mark Payment Received (tool: `mark_payment`) |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `contractId` | `string` | `result.contract_id` |
| `contractNumber` | `string` | `result.contract_number` |
| `customerName` | `string` | `result.customer_name` |
| `customerEmail` | `string` | `result.customer_email` |
| `flightRoute` | `string` | `result.flight_route` or computed |
| `departureDate` | `string` | `result.departure_date` |
| `totalAmount` | `number` | `result.total_amount` or `result.total_price` |
| `currency` | `string` | `result.currency` (default: `'USD'`) |
| `pdfUrl` | `string?` | `result.pdf_url` |
| `status` | `string` | `result.status` (default: `'sent'`) |
| `tripType` | `string?` | `result.trip_type` |
| `returnDate` | `string?` | `result.return_date` |
| `segments` | `Array<{ departureAirport, arrivalAirport, departureDate }>?` | `result.segments` |

---

#### 10. `send_proposal_email` → ProposalSentConfirmation

| | |
|---|---|
| **Component** | `components/proposal/proposal-sent-confirmation.tsx` |
| **Purpose** | Confirmation after proposal email is sent to client |
| **Actions** | View Full Proposal PDF (link), Edit Margin, Generate Contract (tool: `book_flight`) |

**Props**:

| Prop | Type | Source |
|------|------|--------|
| `flightDetails` | `{ departureAirport, arrivalAirport, departureDate, tripType, returnDate, segments }` | Mapped from result |
| `client` | `{ name, email }` | `result.customer_name`, `result.customer_email` |
| `pdfUrl` | `string` | `result.pdf_url` or `result.file_url` |
| `fileName` | `string?` | `result.file_name` |
| `proposalId` | `string?` | `result.proposal_id` |
| `pricing` | `{ total, currency }?` | `result.pricing` or `result.total_amount` |

---

## Text-Only Tools (15 without visual UI)

These tools return text processed by the agent and rendered as markdown. No registry entry needed.

| Tool | MCP Server | Purpose |
|------|-----------|---------|
| `cancel_trip` | Avinode | Cancel an active trip |
| `send_trip_message` | Avinode | Send message to operator |
| `search_airports` | Avinode | Search airports by ICAO/name |
| `search_empty_legs` | Avinode | Find empty leg flights |
| `get_client` | Supabase | Fetch client profile |
| `list_clients` | Supabase | List all clients |
| `create_client` | Supabase | Create new client |
| `update_client` | Supabase | Update client record |
| `get_request` | Supabase | Fetch request details |
| `update_quote_status` | Supabase | Update quote status |
| `get_operator` | Supabase | Fetch operator details |
| `list_preferred_operators` | Supabase | List preferred operators |
| `send_email` | Gmail | Send generic email |
| `send_quote_email` | Gmail | Send quote to client |
| `confirm_payment` | Supabase | Confirm payment received |

---

## Component Dependency Tree

```
TOOL_UI_REGISTRY
├── TripCreatedUI (composite)
│   ├── TripSummaryCard          ← components/avinode/trip-summary-card.tsx
│   └── AvinodeDeepLinks         ← components/avinode/avinode-deep-links.tsx
│
├── RfqResultsUI (composite)
│   └── RFQFlightCard            ← components/avinode/rfq-flight-card.tsx
│
├── RfqQuoteDetailsCard          ← components/avinode/rfq-quote-details-card.tsx (direct)
│
├── OperatorChatInline           ← components/message-components/operator-chat-inline.tsx (direct)
│
├── PipelineDashboard            ← components/message-components/pipeline-dashboard.tsx (direct)
│
├── QuoteComparisonUI (composite)
│   └── QuoteComparison          ← components/message-components/quote-comparison.tsx
│
├── ProposalPreview              ← components/message-components/proposal-preview.tsx (direct)
│
├── EmailApprovalUI (composite)
│   └── EmailPreviewCard         ← components/email/email-preview-card.tsx
│
├── ContractSentConfirmation     ← components/contract/contract-sent-confirmation.tsx (direct)
│   └── Uses: Card, Badge, Button (shadcn/ui)
│
└── ProposalSentConfirmation     ← components/proposal/proposal-sent-confirmation.tsx (direct)
    └── Uses: Card, Button (shadcn/ui)
```

---

## Composite vs Direct Components

The registry uses two patterns:

### Composite Components (`components/mcp-ui/composites/`)

Thin wrappers that compose existing components and wire up `UIActionResult` callbacks. These translate between the registry's `onAction` pattern and the underlying component's specific callback props.

| Composite | Wraps | Maps Actions |
|-----------|-------|-------------|
| `TripCreatedUI` | `TripSummaryCard` + `AvinodeDeepLinks` | Copy → notify, Link click → link |
| `RfqResultsUI` | `RFQFlightCard` (per flight) | Generate Proposal → tool call, View Chat → prompt |
| `QuoteComparisonUI` | `QuoteComparison` | Select Quote → tool call (`create_proposal`) |
| `EmailApprovalUI` | `EmailPreviewCard` | Send → tool call (`send_proposal_email`) + notify, Cancel → notify |

### Direct Components

Used directly from the registry without a composite wrapper. Their `extractProps` functions handle all data transformation inline.

| Component | File |
|-----------|------|
| `RfqQuoteDetailsCard` | `components/avinode/rfq-quote-details-card.tsx` |
| `OperatorChatInline` | `components/message-components/operator-chat-inline.tsx` |
| `PipelineDashboard` | `components/message-components/pipeline-dashboard.tsx` |
| `ProposalPreview` | `components/message-components/proposal-preview.tsx` |
| `ContractSentConfirmation` | `components/contract/contract-sent-confirmation.tsx` |
| `ProposalSentConfirmation` | `components/proposal/proposal-sent-confirmation.tsx` |

---

## Helper: Airport Normalization

The `normalizeAirport()` helper in the registry converts ICAO codes or airport objects into a standard `{ icao, name, city }` shape, using `getAirportByIcao()` from `lib/airports/airport-database.ts` for enrichment.

```typescript
normalizeAirport('KTEB')
// → { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro' }

normalizeAirport({ icao: 'KVNY', name: 'Van Nuys' })
// → { icao: 'KVNY', name: 'Van Nuys', city: 'Van Nuys' }
```

---

## Adding a New Tool UI Component

1. Create the component (composite in `components/mcp-ui/composites/` or direct)
2. Import it in `lib/mcp-ui/tool-ui-registry.ts`
3. Write an `extractProps` function to transform `(toolInput, toolResult, onAction)` into component props
4. Add the entry to `TOOL_UI_REGISTRY`:

```typescript
my_new_tool: {
  component: MyNewToolUI,
  extractProps: extractMyNewToolProps,
},
```

5. Use `UIActionResult` helpers from `@mcp-ui/server` for callbacks:
   - `uiActionResultToolCall(toolName, params)` — invoke another tool
   - `uiActionResultPrompt(text)` — inject chat message
   - `uiActionResultLink(url)` — open URL
   - `uiActionResultNotification(message)` — show toast

---

## Workflow Sequences

### Flight Search → Proposal → Email → Contract

```
create_trip          → TripCreatedUI (deep link to Avinode)
                         ↓ user opens Avinode, operators respond
get_rfq              → RfqResultsUI (list quotes)
                         ↓ user clicks "Generate Proposal"
create_proposal      → ProposalPreview
                         ↓ user clicks "Send Email"
prepare_proposal_email → EmailApprovalUI (human reviews email)
                         ↓ user clicks "Send"
send_proposal_email  → ProposalSentConfirmation
                         ↓ user clicks "Generate Contract"
book_flight          → ContractSentConfirmation
                         ↓ user clicks "Mark Payment"
confirm_payment      → (text-only confirmation)
```

### Quote Comparison Flow

```
get_quotes           → QuoteComparisonUI (side-by-side)
                         ↓ user selects a quote
create_proposal      → ProposalPreview
```

### Operator Communication

```
get_trip_messages    → OperatorChatInline
                         ↓ user clicks "Reply"
send_trip_message    → (text-only confirmation)
```
