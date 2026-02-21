# Avinode Sandbox Integration Test

Test the complete charter flight lifecycle end-to-end using Chrome browser automation: flight request, trip creation, RFP exchange, quote verification, proposal generation and send, contract generation and send, payment confirmation, deal closure, and archival. Simulates both ISO Agent and Operator roles in a single session.

## Parameters

- **Phase** (optional): Run a specific phase only
  - `1` - Login to Avinode Sandbox
  - `2` - ISO Agent: Enter flight request in Jetvision, handle clarification if needed, create trip & send RFP
  - `3` - Switch to Operator role & submit quote
  - `4` - Switch back to ISO Agent & verify quote received
  - `5` - Proposal generation & send (human-in-the-loop email approval)
  - `6` - Contract generation & send
  - `7` - Payment confirmation
  - `8` - Deal closure & archival
  - `9` - Full verification summary (database + UI checks across all tables)
  - `1-4` - RFP flow only (original test scope)
  - `5-8` - Post-quote flow only (proposal through close)
  - `all` - Full workflow (default)
- **Scenario** (optional): Which flight request to test
  - `A` - One-way full info (default): `I need a one way flight from KLGA to KVNY for 4 passengers on March 25, 2026 at 4:00pm EST`
  - `B` - Round trip full info: `I need a round trip flight from EGGW to KVNY for 4 passengers on March 2, 2026 at 9:00am EST`
  - `C` - Multi-city full info: `I need a multi-city trip: KTEB to London Luton (EGGW), then London Luton to Paris Le Bourget (LFPB), then Paris Le Bourget back to KTEB. March 10-15, 4 passengers`
  - `D1` - Ambiguous (vague cities): `Book a flight for tomorrow for three people from New York to Canada`
  - `D2` - Ambiguous (states): `I need a flight from Florida to California tomorrow`
  - `D3` - Ambiguous (vague date): `I need a round trip flight from New York to Kansas for 4 passengers in March`
- Usage: `/avinode-sandbox-test [phase] [scenario]`

## Prerequisites

1. Chrome browser open with Claude-in-Chrome extension active
2. Jetvision dev server running (`npm run dev:app`)
3. Valid Avinode Sandbox credentials (resets every Monday)
4. Gmail MCP server configured (for proposal/contract email phases)

## Actions to Execute

**IMPORTANT:** You MUST invoke the `avinode-sandbox-test` skill using the Skill tool BEFORE taking any action. The skill contains the full phase-by-phase workflow with browser automation steps.

```txt
Skill: avinode-sandbox-test
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.

### Phase Summary

| Phase | Action | Where |
|-------|--------|-------|
| 1 | Login to Avinode Sandbox marketplace | Avinode tab |
| 2 | Enter flight request in Jetvision chat (with clarification for D scenarios), create trip, send RFP | Jetvision + Avinode tabs |
| 3 | Switch to Operator via header dropdown, find RFP, submit $45K quote | Avinode tab |
| 4 | Switch back to ISO Agent, verify quote in Avinode + Jetvision UI | Both tabs |
| 5 | Ask agent to generate proposal from quote, review EmailPreviewCard, approve send | Jetvision tab |
| 6 | Ask agent to generate contract, verify PDF and ContractSentConfirmation card | Jetvision tab |
| 7 | Tell agent payment received ($45K wire), verify PaymentConfirmedCard | Jetvision tab |
| 8 | Verify ClosedWonConfirmation card, archive session, check Archive tab | Jetvision tab |
| 9 | Query Supabase (webhook_events, quotes, requests, proposals, contracts, messages) | Supabase MCP |

### Flight Request Scenarios

| Scenario | Type | Request | Agent Behavior |
|----------|------|---------|----------------|
| A (default) | One-way, full info | KTEB to KVNY, 4 pax, Mar 25, 4pm | Creates trip immediately |
| B | Round trip, full info | KTEB to KVNY roundtrip, 4 pax, Mar 2, 9am | Creates trip immediately |
| C | Multi-city, full info | KTEB to EGGW to LFPB to KTEB, 4 pax, Mar 10-15 | Creates trip immediately |
| D1 | Ambiguous cities | "New York to Canada", 3 pax, tomorrow | Asks: which airports? what time? |
| D2 | Ambiguous states | "Florida to California", tomorrow | Asks: which airports? pax count? trip type? |
| D3 | Vague date | "New York to Kansas", 4 pax, "in March" | Asks: which airports? date? time? |

## Sandbox Credentials

```txt
URL: https://marketplace.avinode.com
Email: kingler@me.com
Password: 2FRhgGZK3wSy8SY
```

## Success Indicators

### Phases 1-4 (RFP Flow)

- Login successful, marketplace dashboard visible
- Flight request entered in Jetvision chat
- (Scenarios D1-D3) Agent asked clarifying questions and did NOT create trip prematurely
- Trip created with valid deep link
- RFP sent to Sandbox Seller
- Operator received and responded to RFP
- Quote appears in both Avinode UI and Jetvision app
- Webhook event stored in `avinode_webhook_events` table

### Phase 5 (Proposal)

- Proposal generated with PROP-YYYY-NNN number and PDF
- Agent used `prepare_proposal_email` (human-in-the-loop), NOT `send_proposal_email`
- EmailPreviewCard displayed with subject, body, recipient, attachment
- Email approved and sent successfully
- Proposal status updated to "sent" in `proposals` table

### Phase 6 (Contract)

- Contract generated with CONTRACT-YYYY-NNN number and PDF
- ContractSentConfirmation card displayed with pricing breakdown
- Contract PDF accessible and contains quote summary + terms + CC auth form
- Contract email sent to client
- Contract status "sent" in `contracts` table

### Phase 7 (Payment)

- Payment recorded ($45,000 wire WT-2026-SANDBOX-001)
- PaymentConfirmedCard displayed with amount, method, reference
- Contract status updated to "paid" in `contracts` table

### Phase 8 (Close & Archive)

- ClosedWonConfirmation card with deal timeline
- Session archived, chat input disabled (read-only)
- Session visible in sidebar Archive tab
- `session_status` = "archived" in `requests` table

## Troubleshooting

### Chrome Extension Not Responding

- Ensure Claude-in-Chrome extension is installed and active
- Check that Chrome is running and accessible
- Try `mcp__claude-in-chrome__tabs_context_mcp` to test connection

### Login Fails

- API key resets every Monday morning
- Run `/avinode-sandbox-reset` if stale data is present
- Verify credentials haven't changed

### Agent Not Asking Clarifying Questions (Scenario D)

- If the agent creates a trip immediately for a vague request, this is a **FAIL**
- Check that the NLP parser correctly identifies missing fields
- Verify the system prompt instructs the agent to ask before assuming

### Webhook Not Received

- Check that the Jetvision dev server is running on port 3000
- Verify the webhook URL is configured in Avinode Sandbox settings
- Check the Next.js console for webhook endpoint logs
- Wait 15-30 seconds and retry — sandbox webhooks can be delayed

### Proposal Email Fails

- Check Gmail MCP server is running and OAuth tokens are valid
- Verify `USE_MOCK_EMAIL` env var is not set (or set to false) for real email
- Check `lib/services/email-service.ts` for configuration issues

### Contract PDF Issues

- Verify Supabase storage bucket "contracts" exists and is public
- Check `lib/pdf/contract-generator.ts` for rendering errors
- Ensure quote data has complete pricing information

### Payment Not Recording

- Verify contract exists and is in a valid state for payment
- Check `/api/contract/[id]/payment` route handler
- Include amount, method, and reference explicitly in chat message

### Archival Not Working

- Archive button only appears for terminal states (completed, closed_won, cancelled)
- Verify deal is fully closed before attempting archive
- Check `/api/requests` PATCH handler for archive action

## Related Commands

- `/avinode-test` - API connectivity testing (no browser needed)
- `/avinode-sandbox-reset` - Should be run when the avinode sandbox api key resets. Clean up stale sandbox data if needed; the api key has been reset by avinode late sunday night eastern standard time
