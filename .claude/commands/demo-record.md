# Demo Recording

Record video demos of the Jetvision charter flight lifecycle using Playwright browser automation. Produces MP4/WebM recordings of each scenario for sprint demos, stakeholder reviews, and documentation.

## Parameters

### Trip-Type Flags (primary — pick one or more)

| Flag | Route | Payment | Description |
|------|-------|---------|-------------|
| `--one-way` | KTEB → KVNY | $45,000 | One-way full lifecycle (9 steps) |
| `--round-trip` | EGGW ↔ KVNY | $62,000 | Round-trip full lifecycle (9 steps) |
| `--multi-city` | KTEB → EGGW → LFPB → KTEB | $95,000 | Multi-city full lifecycle (9 steps) |
| `--ambiguous` | — | — | 3 ambiguous request clarification flows |
| `--all` | — | — | All 3 lifecycles + ambiguous (30 scenarios) |

**Default (no flags):** Runs all 3 lifecycles (27 scenarios, no ambiguous).

### Partial Lifecycle

| Flag | Values | Description |
|------|--------|-------------|
| `--start-at` | milestone name | Skip earlier steps, start from this milestone |

**9 milestones:** `request` → `marketplace` → `rfq` → `approve` → `switch-back` → `quotes` → `proposal` → `contract` → `payment`

### Mode Flags

| Flag | Description |
|------|-------------|
| `--headless` | Run headless (default, faster) |
| `--headed` | Run with visible browser (for watching live) |
| `--interactive` | Use Claude-in-Chrome for manual step-through with GIF recording |

### Output Flags

| Flag | Values | Description |
|------|--------|-------------|
| `--convert` | `mp4`, `gif` | Post-processing: `mp4` converts WebM→MP4; `gif` converts to both MP4 and GIF |
| `--output-dir` | path | Override default recording output directory |

### Usage

```bash
# === Full lifecycles (default = all 3) ===
/demo-record                                        # All 3 lifecycles, headless
/demo-record --headed                               # All 3 lifecycles, visible browser
/demo-record --convert gif                          # All 3 lifecycles + convert to MP4 & GIF

# === Single trip type ===
/demo-record --one-way                              # One-way: KTEB → KVNY ($45K)
/demo-record --round-trip                           # Round-trip: EGGW ↔ KVNY ($62K)
/demo-record --multi-city                           # Multi-city: KTEB → EGGW → LFPB → KTEB ($95K)

# === Combinations ===
/demo-record --one-way --round-trip                 # Two lifecycles
/demo-record --all                                  # All 3 lifecycles + ambiguous
/demo-record --ambiguous                            # Ambiguous scenarios only

# === Partial lifecycle ===
/demo-record --round-trip --start-at proposal       # Round-trip from proposal onward
/demo-record --one-way --start-at payment           # One-way payment + close only
/demo-record --multi-city --start-at rfq            # Multi-city from RFQ send onward

# === With mode and output flags ===
/demo-record --round-trip --headed                  # Visible browser
/demo-record --one-way --headed --convert gif       # Headed + GIF conversion
/demo-record --multi-city --interactive             # Interactive (Claude-in-Chrome)
/demo-record --round-trip --convert mp4 --output-dir ./demos/sprint-5
```

---

## Lifecycle Overview

Each trip type follows the same 9-step lifecycle. The only differences are the chat input, route, and payment details.

### 9-Step Lifecycle

| Step | Milestone | What Happens | Where |
|------|-----------|-------------|-------|
| 1 | `request` | Submit flight request in chat, TripRequestCard appears | Jetvision |
| 2 | `marketplace` | Click "Open in Avinode Marketplace" on the card, new browser tab with prefilled search | Jetvision → Avinode |
| 3 | `rfq` | Filter to Sandbox Dev Operator, select flights, send RFQ | Avinode |
| 4 | `approve` | Switch to operator account, approve quote | Avinode |
| 5 | `switch-back` | Switch back to Jetvision LLC (buyer account), reset for next test | Avinode |
| 6 | `quotes` | Switch to Jetvision tab, click "Update RFQ", quotes populate | Jetvision |
| 7 | `proposal` | Generate & send proposal to ABC Corp | Jetvision |
| 8 | `contract` | Book flight, send contract | Jetvision |
| 9 | `payment` | Click "Mark Payment Received" → PaymentConfirmationModal → fill details → confirm → deal auto-closes & archives | Jetvision |

### Trip-Type Parameters

| Parameter | One-Way | Round-Trip | Multi-City |
|-----------|---------|------------|------------|
| **Route** | KTEB → KVNY | EGGW → KVNY → EGGW | KTEB → EGGW → LFPB → KTEB |
| **Legs** | 1 | 2 | 3 |
| **Payment amount** | $45,000 | $62,000 | $95,000 |
| **Payment reference** | WT-2026-TEST-001 | WT-2026-TEST-002 | WT-2026-TEST-003 |
| **Screenshot folder** | `one-way-lifecycle/` | `round-trip-lifecycle/` | `multi-city-lifecycle/` |
| **Payment UI** | Click "Mark Payment Received" → modal: $45,000 / Wire Transfer / WT-2026-TEST-001 | Click "Mark Payment Received" → modal: $62,000 / Wire Transfer / WT-2026-TEST-002 | Click "Mark Payment Received" → modal: $95,000 / Wire Transfer / WT-2026-TEST-003 |

**IMPORTANT:** Each lifecycle runs in its own chat session. Start a new chat session before beginning each trip type.

---

## Full Scenario Map (30 scenarios)

### One-Way Lifecycle (Scenarios 1-9)

| # | Milestone | Scenario | Trigger |
|---|-----------|----------|---------|
| 1 | `request` | Create one-way trip | Chat input → TripRequestCard + deep link |
| 2 | `marketplace` | Click deep link → Avinode opens | Click "Open in Avinode Marketplace" |
| 3 | `rfq` | Filter → select → Send RFQ | Sandbox Dev Operator → Send RFQ |
| 4 | `approve` | Operator approves quote | Switch account → Selling → Approve |
| 5 | `switch-back` | Switch back to Jetvision LLC | Avatar → Switch company |
| 6 | `quotes` | Pull quotes into Jetvision | Click "View RFQs" button on FlightSearchProgress |
| 7 | `proposal` | Generate & send proposal | Click "Generate Proposal" |
| 8 | `contract` | Book flight & send contract | Click "Book Flight" |
| 9 | `payment` | Confirm $45K → auto-close | Click "Mark Payment Received" → PaymentConfirmationModal → confirm → archive |

### Round-Trip Lifecycle (Scenarios 10-18)

| # | Milestone | Scenario | Trigger |
|---|-----------|----------|---------|
| 10 | `request` | Create round-trip | Chat input → TripRequestCard + deep link |
| 11 | `marketplace` | Click deep link → Avinode opens | Click "Open in Avinode Marketplace" |
| 12 | `rfq` | Filter → select → Send RFQ | Sandbox Dev Operator → Send RFQ |
| 13 | `approve` | Operator approves quote | Switch account → Selling → Approve |
| 14 | `switch-back` | Switch back to Jetvision LLC | Avatar → Switch company |
| 15 | `quotes` | Pull quotes into Jetvision | Click "Update RFQ" |
| 16 | `proposal` | Generate & send proposal | Click "Generate Proposal" |
| 17 | `contract` | Book flight & send contract | Click "Book Flight" |
| 18 | `payment` | Confirm $62K → auto-close | Click "Mark Payment Received" → PaymentConfirmationModal → confirm → archive |

### Multi-City Lifecycle (Scenarios 19-27)

| # | Milestone | Scenario | Trigger |
|---|-----------|----------|---------|
| 19 | `request` | Create multi-city trip | Chat input → TripRequestCard + deep link |
| 20 | `marketplace` | Click deep link → Avinode opens | Click "Open in Avinode Marketplace" |
| 21 | `rfq` | Filter → select → Send RFQ | Sandbox Dev Operator → Send RFQ |
| 22 | `approve` | Operator approves quote | Switch account → Selling → Approve |
| 23 | `switch-back` | Switch back to Jetvision LLC | Avatar → Switch company |
| 24 | `quotes` | Pull quotes into Jetvision | Click "Update RFQ" |
| 25 | `proposal` | Generate & send proposal | Click "Generate Proposal" |
| 26 | `contract` | Book flight & send contract | Click "Book Flight" |
| 27 | `payment` | Confirm $95K → auto-close | Click "Mark Payment Received" → PaymentConfirmationModal → confirm → archive |

### Ambiguous Requests (Scenarios 28-30 — extras)

| # | Scenario | Chat Input |
|---|----------|-----------|
| 28 | Tomorrow to Canada | "Book a flight for tomorrow for three people from New York to Canada" |
| 29 | Florida to California | "I need a flight from Florida to California tomorrow" |
| 30 | Round trip vague date | "I need a round trip flight from New York to Kansas for 4 passengers in March" |

---

## Chat Inputs

**One-way:**
```
I need a one way flight from KTEB to KVNY for 4 passengers on March 25, 2026 at 4:00pm EST
```

**Round-trip:**
```
I need a round trip flight from EGGW to KVNY for 4 passengers. Departing March 2, 2026 at 9:00am EST, returning March 5, 2026 at 2:00pm EST
```

**Multi-city:**
```
I need a multi-city trip for 4 passengers: Leg 1: KTEB to EGGW on March 10, 2026 at 8:00am EST. Leg 2: EGGW to LFPB on March 12, 2026 at 10:00am GMT. Leg 3: LFPB to KTEB on March 15, 2026 at 2:00pm CET.
```

**IMPORTANT:** The above chat inputs are the ONLY valid text to type into the Jetvision chat during the entire lifecycle. Steps 2-9 are driven exclusively by button clicks and UI modal interactions. See the PROHIBITED section in `/e2e-test` for the full list of inputs that must NEVER be typed into chat (hardcoded IDs, tool invocations, payment messages, proposal instructions, etc.).

---

## Actions to Execute

**IMPORTANT:** You MUST invoke the `demo-record` skill using the Skill tool BEFORE taking any action. The skill contains the full recording workflow, troubleshooting, and conversion steps.

```txt
Skill: demo-record
Args: $ARGUMENTS
```

Follow the skill's instructions exactly.

---

## Underlying Playwright Commands

| Command | What it does |
|---------|-------------|
| `npm run test:e2e:demo` | Record all 3 lifecycles headless |
| `npm run test:e2e:demo:headed` | Record all 3 lifecycles with visible browser |
| `npx playwright test --project=demo oneway-lifecycle` | One-way lifecycle only |
| `npx playwright test --project=demo roundtrip-lifecycle` | Round-trip lifecycle only |
| `npx playwright test --project=demo multicity-lifecycle` | Multi-city lifecycle only |
| `npx playwright test --project=demo ambiguous` | Ambiguous scenarios only |
| `bash scripts/convert-recordings.sh` | Convert WebM to MP4 |
| `bash scripts/convert-recordings.sh --gif` | Convert to MP4 + GIF |

---

## Mode 1: Playwright Recording (Automated)

### Run by Trip Type

```bash
# One-way lifecycle
npx playwright test --project=demo oneway-lifecycle --timeout 300000

# Round-trip lifecycle
npx playwright test --project=demo roundtrip-lifecycle --timeout 300000

# Multi-city lifecycle
npx playwright test --project=demo multicity-lifecycle --timeout 300000

# Ambiguous scenarios
npx playwright test --project=demo ambiguous --timeout 120000
```

### Run with Headed Browser

Append `--headed` to any command:

```bash
npx playwright test --project=demo oneway-lifecycle --headed --timeout 300000
```

### View Test Report

```bash
npx playwright show-report
```

### Convert Recordings

After tests complete, WebM files are in `test-results/`:

```bash
# Convert to MP4
bash scripts/convert-recordings.sh

# Convert to MP4 + GIF
bash scripts/convert-recordings.sh --gif

# Convert to custom output directory
bash scripts/convert-recordings.sh --output-dir ./demo-videos
```

---

## Mode 2: Interactive Recording (Claude-in-Chrome)

For step-by-step recording with manual control:

### Start Recording

```txt
Tool: mcp__claude-in-chrome__gif_creator
Action: start_recording
tabId: <tab-id>
```

### Execute Scenario Steps

Follow the lifecycle steps from `/e2e-test` for any trip type. Between steps, capture extra frames for smooth playback.

### Stop and Export

```txt
Tool: mcp__claude-in-chrome__gif_creator
Action: stop_recording / export
filename: "one-way-lifecycle.gif"
```

---

## Recording Best Practices

### Scroll the Chat Thread (Required)

Before every screenshot and during recordings, scroll the Jetvision chat thread from **top to bottom** so the full conversation is captured.

**Per-step procedure:**
1. After each agent response settles, scroll to the **top** of the chat thread
2. Slowly scroll **down** through the entire conversation
3. Pause at key UI components (TripRequestCard, RFQFlightsList, ProposalPreview, etc.)
4. Take the screenshot or let the recording capture the full scroll

**Interactive mode (Claude-in-Chrome):**
```javascript
// Scroll to top
document.querySelector('[data-testid="chat-messages"]')?.scrollTo({ top: 0, behavior: 'smooth' });

// Scroll to bottom
const el = document.querySelector('[data-testid="chat-messages"]');
el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
```

---

## Recording Output Directory

```
e2e-recordings/
├── one-way-lifecycle/            # Scenarios 1-9
│   ├── 01-request.mp4
│   ├── 02-marketplace.mp4
│   ├── 03-rfq.mp4
│   ├── 04-approve.mp4
│   ├── 05-switch-back.mp4
│   ├── 06-quotes.mp4
│   ├── 07-proposal.mp4
│   ├── 08-contract.mp4
│   └── 09-payment.mp4
├── round-trip-lifecycle/         # Scenarios 10-18
│   ├── 10-request.mp4
│   └── ...
├── multi-city-lifecycle/         # Scenarios 19-27
│   ├── 19-request.mp4
│   └── ...
├── ambiguous/                    # Scenarios 28-30
│   ├── 28-canada.mp4
│   ├── 29-florida.mp4
│   └── 30-vague-date.mp4
└── full-demo/                    # Concatenated full-length recordings
    ├── full-demo-all.mp4
    ├── one-way-lifecycle.mp4
    ├── round-trip-lifecycle.mp4
    └── multi-city-lifecycle.mp4
```

---

## Demo Spec Files

Located in `__tests__/e2e/demo/`:

| File | Scenarios | Description |
|------|-----------|-------------|
| `oneway-lifecycle.demo.spec.ts` | 1-9 | One-way full lifecycle |
| `roundtrip-lifecycle.demo.spec.ts` | 10-18 | Round-trip full lifecycle |
| `multicity-lifecycle.demo.spec.ts` | 19-27 | Multi-city full lifecycle |
| `ambiguous-requests.demo.spec.ts` | 28-30 | Ambiguous clarification flows |

---

## Per-Trip-Type Verification

| Check | One-Way | Round-Trip | Multi-City |
|-------|---------|------------|------------|
| TripRequestCard legs | 1: KTEB → KVNY | 2: EGGW → KVNY, KVNY → EGGW | 3: KTEB → EGGW, EGGW → LFPB, LFPB → KTEB |
| Airport codes | KTEB, KVNY | EGGW, KVNY | KTEB, EGGW, LFPB |
| Quote cards | Standard one-way pricing | Round-trip or per-leg pricing | Per-leg quotes (up to 3 groups) |
| Proposal PDF route | KTEB → KVNY | EGGW ↔ KVNY | KTEB → EGGW → LFPB → KTEB |
| Contract amount | ~$45,000 | ~$62,000 | ~$95,000 |
| DB payment_reference | WT-2026-TEST-001 | WT-2026-TEST-002 | WT-2026-TEST-003 |

---

## ID Traceability

Every lifecycle captures and verifies tripID/quoteID continuity:

```
request (avinode_trip_id, avinode_rfp_id)
  -> quote (avinode_quote_id)
    -> proposal (request_id, quote_id)
      -> contract (request_id, proposal_id)
```

### `data-*` Attributes

| Component | Attribute | Source |
|-----------|-----------|--------|
| `FlightSearchProgress` | `data-trip-id` | `tripId` prop |
| `RFQFlightCard` | `data-quote-id`, `data-flight-id` | `quoteId`, `flight.id` props |
| `ProposalSentConfirmation` | `data-proposal-id` | `proposalId` prop |
| `ContractSentConfirmation` | `data-contract-id`, `data-contract-number` | `contractId`, `contractNumber` props |
| `BookFlightModal` | `data-quote-id` | `flight.quoteId` prop |

---

## Test Customer Profile

| Field | Value |
|-------|-------|
| Company | ABC Corp |
| Contact | Willy Bercy |
| Email | kingler@me.com |
| Role | Recipient for proposal and contract emails |

**Note:** Same customer used across all 3 lifecycles. CustomerSelectionDialog only appears on first "Generate Proposal" click per lifecycle.

---

## Avinode Sandbox Credentials

| Field | Value |
|-------|-------|
| Marketplace URL | https://marketplace.avinode.com |
| Email | kingler@me.com |
| Password | 2FRhgGZK3wSy8SY |

Sandbox API key resets every Monday. Run `/avinode-sandbox-reset` if needed.

---

## Prerequisites

1. Chrome browser open with Claude-in-Chrome extension active
2. Jetvision dev server running (`npm run dev:app`) at `http://localhost:3000`
3. Valid Clerk test credentials in `.env.local`
4. Playwright browsers installed (`npx playwright install chromium`)
5. ffmpeg installed for conversion (`brew install ffmpeg`)
6. Valid Avinode Sandbox credentials (for all lifecycle steps)
7. Gmail MCP server configured (for proposal/contract email)
8. Recording directories created:

```bash
mkdir -p e2e-screenshots/{auth,one-way-lifecycle,round-trip-lifecycle,multi-city-lifecycle,ambiguous}
mkdir -p e2e-recordings/{one-way-lifecycle,round-trip-lifecycle,multi-city-lifecycle,ambiguous,full-demo}
```

---

## Browser Tab Management

| Step | Milestone | Active Tab |
|------|-----------|-----------|
| 1 | `request` | Jetvision (localhost:3000) |
| 2 | `marketplace` | Avinode Marketplace (NEW tab) |
| 3 | `rfq` | Avinode Marketplace |
| 4 | `approve` | Avinode Marketplace (switch to operator) |
| 5 | `switch-back` | Avinode Marketplace (switch back to buyer) |
| 6 | `quotes` | Jetvision (switch BACK) |
| 7 | `proposal` | Jetvision + PDF tab |
| 8 | `contract` | Jetvision + PDF tab (auto-opens) |
| 9 | `payment` | Jetvision |

**Between lifecycles:** Close Avinode and PDF tabs. Start a new Jetvision chat session.

---

## Key Component Reference

| Component | File Path | Used In |
|-----------|-----------|---------|
| `TripRequestCard` | `components/avinode/trip-request-card.tsx` | request |
| `AvinodeSearchCard` | `components/avinode/avinode-search-card.tsx` | request |
| `FlightSearchProgress` | `components/avinode/flight-search-progress.tsx` | request |
| `AvinodeDeepLinks` | `components/avinode/avinode-deep-links.tsx` | marketplace |
| `RFQFlightsList` | `components/avinode/rfq-flights-list.tsx` | quotes, proposal, contract |
| `RFQFlightCard` | `components/avinode/rfq-flight-card.tsx` | quotes, proposal, contract |
| `CustomerSelectionDialog` | `components/customer-selection-dialog.tsx` | proposal |
| `ProposalPreview` | `components/message-components/proposal-preview.tsx` | proposal |
| `ProposalSentConfirmation` | `components/proposal/proposal-sent-confirmation.tsx` | proposal |
| `BookFlightModal` | `components/avinode/book-flight-modal.tsx` | contract |
| `ContractSentConfirmation` | `components/contract/contract-sent-confirmation.tsx` | contract |
| `PaymentConfirmedCard` | `components/contract/payment-confirmed-card.tsx` | payment |
| `ClosedWonConfirmation` | `components/contract/closed-won-confirmation.tsx` | payment |

---

## Ordering Dependencies

Each lifecycle is self-contained. Within a lifecycle, steps run in order. The three lifecycles are independent.

```
One-Way:    1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
Round-Trip: 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18
Multi-City: 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27
Ambiguous:  28, 29, 30 (independent, any order)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Clerk login fails | Verify `CLERK_SECRET_KEY` in `.env.local` |
| Avinode login page after deep link | Session expired. Login with sandbox credentials. |
| Avinode opens as wrong account | Switch to Jetvision LLC: K avatar → "Switch company". |
| Agent not responding | Check `npm run dev:app` is running. |
| No deep link generated | Check Avinode MCP server + API key. |
| Trip creation fails | API key may have reset (Monday). Run `/avinode-sandbox-reset`. |
| No WebM files after test | Tests failed before completion. Check `test-results/` for errors. |
| Video too fast | Verify `--project=demo` (has `slowMo: 500`). |
| ffmpeg not found | `brew install ffmpeg`. |
| GIF too large | `--gif` flag scales to 800px width. |
| Round-trip return date prompt | Provide: `Return on March 5, 2026 at 2:00pm EST` |
| Multi-city date clarification | Provide per-leg dates: Mar 10, Mar 12, Mar 15. |
| Session conflicts between lifecycles | Start a NEW chat session per lifecycle. |

---

## Output Files

| Type | Location | Format |
|------|----------|--------|
| Video recordings | `test-results/*/video.webm` | WebM (Playwright native) |
| Screenshots | `e2e-screenshots/<lifecycle>/` | PNG |
| Converted video | `e2e-recordings/<lifecycle>/` | MP4 and/or GIF |
| HTML report | `playwright-report/index.html` | HTML |

---

## Next Step: Generate Presentation

After recording, generate a branded slide deck:

```bash
/demo-presentation [--one-way|--round-trip|--multi-city] [--title "Sprint Demo"]
```

See the `demo-presentation` skill for details.

---

## Related Commands

- `/demo-presentation` — Generate PPTX from recorded demos
- `/e2e-test` — E2E test runbook (same 30 scenarios, detailed step-by-step instructions)
- `/avinode-sandbox-test` — Interactive Avinode sandbox testing
- `/avinode-sandbox-reset` — Reset sandbox after API key rotation
