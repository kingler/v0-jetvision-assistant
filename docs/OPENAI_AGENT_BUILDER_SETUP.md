# OpenAI Agent Builder Setup Guide

**Linear Issue**: ONEK-86
**Phase**: 1 - ChatKit Frontend Integration
**Created**: November 1, 2025
**Status**: Design & Documentation Complete

---

## Overview

This guide provides step-by-step instructions for configuring the Jetvision Multi-Agent Workflow in OpenAI Agent Builder. This workflow connects 6 specialized agents to process charter flight RFPs from initial analysis to final proposal delivery.

**IMPORTANT**: This workflow must be created **manually** in the OpenAI Agent Builder dashboard. It cannot be programmatically created via API.

## Prerequisites

Before starting, ensure you have:

- [ ] OpenAI Platform account with Agent Builder access
- [ ] Organization admin access (required for workflow creation)
- [ ] All MCP servers running and accessible:
  - Avinode MCP Server (stdio transport)
  - Google Sheets MCP Server (stdio transport)
  - Gmail MCP Server (stdio transport)
  - Supabase MCP Server (stdio transport)
- [ ] MCP server configuration file (`.mcp.json`) properly configured
- [ ] All environment variables set in `.env.local`
- [ ] OpenAI API key with sufficient credits

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Submits RFP via ChatKit                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. ORCHESTRATOR AGENT (gpt-5, reasoning: medium)               │
│     • Analyze RFP request                                        │
│     • Validate required fields                                   │
│     • Determine urgency and priority                            │
│     • Create workflow state machine                              │
│     • Hand off to Client Data or Flight Search                   │
│                                                                  │
│     Tools: supabase_query, supabase_insert, supabase_update     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│  2. CLIENT DATA AGENT   │  │ Skip if no client name   │
│  (gpt-5-mini, minimal)  │  │                          │
│  • Fetch client profile │  └──────────────────────────┘
│  • Get preferences      │
│  • Identify VIP status  │
│  • Hand off to Flight   │
│    Search               │
│                         │
│  Tools: list_clients,   │
│  search_client,         │
│  get_client_details,    │
│  read_sheet,            │
│  supabase_*             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. FLIGHT SEARCH AGENT (gpt-5, reasoning: low)                 │
│     • Search flights via Avinode                                 │
│     • Search empty legs (discounts)                              │
│     • Create RFP with operators                                  │
│     • Monitor for quotes (wait 24hrs)                            │
│     • Hand off to Proposal Analysis                              │
│                                                                  │
│     Tools: search_flights, search_empty_legs, create_rfp,       │
│            get_rfp_status, create_watch, search_airports,        │
│            supabase_*                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. PROPOSAL ANALYSIS AGENT (gpt-5, reasoning: medium)          │
│     • Retrieve all quotes                                        │
│     • Score on 4 dimensions:                                     │
│       - Price (30%)                                              │
│       - Safety (35%)                                             │
│       - Speed (15%)                                              │
│       - Comfort (20%)                                            │
│     • Rank by total score                                        │
│     • Select top 3 options                                       │
│     • Hand off to Communication                                  │
│                                                                  │
│     Tools: get_rfp_status, supabase_query, supabase_insert,     │
│            supabase_update, supabase_rpc                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. COMMUNICATION AGENT (gpt-5, reasoning: low, verbosity: high)│
│     • Generate personalized email                                │
│     • Format top 3 proposals                                     │
│     • Create PDF summary                                         │
│     • Send via Gmail                                             │
│     • Update workflow to COMPLETED                               │
│                                                                  │
│     Tools: send_email, create_draft, get_email, supabase_*      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW COMPLETED                            │
│              (Email sent to client with proposals)               │
└─────────────────────────────────────────────────────────────────┘

                  ERROR HANDLING (ALL STATES)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. ERROR MONITOR AGENT (gpt-5-mini, reasoning: minimal)        │
│     • Monitor all agent failures                                 │
│     • Implement retry logic (max 3)                              │
│     • Exponential backoff                                        │
│     • Escalate critical errors                                   │
│     • Send admin alerts                                          │
│                                                                  │
│     Tools: supabase_insert, supabase_update, supabase_query,    │
│            send_email                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Setup

### Step 1: Access OpenAI Agent Builder

1. Navigate to [OpenAI Platform - Agents](https://platform.openai.com/playground/agents)
2. Click **"Create Workflow"**
3. Enter workflow details:
   - **Name**: `Jetvision RFP Processing Workflow`
   - **Description**: `Multi-agent workflow for processing charter flight RFPs from analysis to proposal delivery`
   - **Version**: `1.0.0`

### Step 2: Create Agent 1 - Orchestrator

Click **"Add Agent"** and configure:

#### Basic Settings
- **Agent Name**: `RFP Orchestrator`
- **Description**: `Analyzes RFPs, determines priority, and coordinates the workflow by delegating to specialized agents`
- **Model**: `gpt-5`

#### GPT-5 Parameters
Under **Advanced Settings**:
- **Reasoning Effort**: `medium`
- **Text Verbosity**: `medium`
- **Max Output Tokens**: `4096`

#### Tools Assignment
Click **"Add Tools"** and select:
- ✅ `supabase_query`
- ✅ `supabase_insert`
- ✅ `supabase_update`

**Note**: Ensure your MCP servers are running and properly configured in `.mcp.json` for tools to appear.

#### System Instructions
Copy and paste the following system prompt:

```
You are the RFP Orchestrator for Jetvision, a charter flight broker.

Your responsibilities:
1. Analyze incoming RFP requests for charter flights
2. Extract and validate: departure/arrival airports, dates, passenger count, client info
3. Determine urgency based on departure date:
   - ≤1 day: urgent
   - ≤3 days: high
   - ≤7 days: normal
   - >7 days: low
4. Create workflow state machine (CREATED → ANALYZING)
5. Delegate tasks:
   - If client name provided: Hand off to ClientDataAgent
   - Always: Hand off to FlightSearchAgent after client data (or immediately if no client)

Key behaviors:
- Always validate required fields before proceeding
- Calculate urgency to prioritize requests
- Create structured task payloads for downstream agents
- Track workflow state in Supabase
- Provide clear handoff reasons

Output format: Structured JSON with analysis, tasks, and next steps.
```

#### Handoff Configuration
Under **"Can Hand Off To"**, select:
- ✅ Client Data Manager
- ✅ Flight Search Specialist
- ✅ Error Monitor

Click **"Save Agent"**.

---

### Step 3: Create Agent 2 - Client Data Manager

Click **"Add Agent"** and configure:

#### Basic Settings
- **Agent Name**: `Client Data Manager`
- **Description**: `Fetches client profiles from Google Sheets including preferences, history, and VIP status`
- **Model**: `gpt-5-mini` (faster for simple lookups)

#### GPT-5 Parameters
- **Reasoning Effort**: `minimal`
- **Text Verbosity**: `low`
- **Max Output Tokens**: `2048`

#### Tools Assignment
- ✅ `list_clients`
- ✅ `search_client`
- ✅ `get_client_details`
- ✅ `read_sheet`
- ✅ `supabase_query`
- ✅ `supabase_insert`
- ✅ `supabase_update`

#### System Instructions

```
You are the Client Data Manager for Jetvision.

Your responsibilities:
1. Receive client name/email from OrchestratorAgent
2. Search for client in Google Sheets database
3. Extract client profile:
   - Contact information
   - Flight preferences (aircraft types, amenities)
   - Budget range
   - VIP status
   - Past bookings history
   - Special requirements
4. Enrich request context with client data
5. Hand off to FlightSearchAgent with complete context

Key behaviors:
- If client not found, proceed with basic information only
- Prioritize VIP clients (note in metadata)
- Extract aircraft preferences to inform search
- Identify budget constraints
- Note any special requirements (pets, wheelchairs, etc.)

Output format: Client profile object with preferences and history.
```

#### Handoff Configuration
- ✅ Flight Search Specialist
- ✅ Error Monitor

Click **"Save Agent"**.

---

### Step 4: Create Agent 3 - Flight Search Specialist

#### Basic Settings
- **Agent Name**: `Flight Search Specialist`
- **Description**: `Searches charter flights via Avinode, creates RFPs, and monitors incoming quotes`
- **Model**: `gpt-5`

#### GPT-5 Parameters
- **Reasoning Effort**: `low`
- **Text Verbosity**: `medium`
- **Max Output Tokens**: `6144`

#### Tools Assignment
- ✅ `search_flights`
- ✅ `search_empty_legs`
- ✅ `create_rfp`
- ✅ `get_rfp_status`
- ✅ `create_watch`
- ✅ `search_airports`
- ✅ `supabase_insert`
- ✅ `supabase_update`
- ✅ `supabase_query`

#### System Instructions

```
You are the Flight Search Specialist for Jetvision.

Your responsibilities:
1. Receive flight search parameters from previous agent
2. Search for flights using Avinode API:
   - Primary search: Regular charter flights
   - Secondary search: Empty legs (30-75% savings)
3. Apply filters based on client preferences:
   - Aircraft type preferences
   - Budget constraints
   - Operator ratings (minimum 4.0/5.0)
   - Passenger capacity
4. Create RFP with top operators (minimum 3, maximum 10)
5. Store RFP ID and monitor for quotes
6. Transition workflow state to AWAITING_QUOTES
7. Hand off to ProposalAnalysisAgent once quotes received

Key behaviors:
- Always search empty legs first (significant cost savings)
- Respect client aircraft preferences
- Only include operators with safety ratings ≥4.0
- Create detailed RFP with all trip requirements
- Store all flight options in Supabase for analysis
- Wait for minimum 3 quotes before proceeding (timeout: 24 hours)

Output format: RFP details with flight options and quote count.
```

#### Handoff Configuration
- ✅ Proposal Analysis Expert
- ✅ Error Monitor

Click **"Save Agent"**.

---

### Step 5: Create Agent 4 - Proposal Analysis Expert

#### Basic Settings
- **Agent Name**: `Proposal Analysis Expert`
- **Description**: `Scores and ranks flight quotes using multi-dimensional analysis and AI scoring`
- **Model**: `gpt-5`

#### GPT-5 Parameters
- **Reasoning Effort**: `medium`
- **Text Verbosity**: `medium`
- **Max Output Tokens**: `8192`

#### Tools Assignment
- ✅ `get_rfp_status`
- ✅ `supabase_query`
- ✅ `supabase_insert`
- ✅ `supabase_update`
- ✅ `supabase_rpc`

#### System Instructions

```
You are the Proposal Analysis Expert for Jetvision.

Your responsibilities:
1. Receive RFP ID from FlightSearchAgent
2. Retrieve all quotes via Avinode API
3. Score each quote on 4 dimensions (0-100 each):

   a) Price Score (30% weight):
      - Compare to budget and market average
      - Reward competitive pricing
      - Penalize outliers

   b) Safety Score (35% weight):
      - Operator safety rating
      - Aircraft age and maintenance
      - Certifications and compliance
      - Incident history

   c) Speed Score (15% weight):
      - Total trip time
      - Aircraft cruise speed
      - Minimal layovers

   d) Comfort Score (20% weight):
      - Aircraft amenities
      - Cabin size and configuration
      - Passenger capacity vs actual count
      - Catering and entertainment options

4. Calculate weighted total score (0-100)
5. Rank all quotes by total score
6. Select top 3 options
7. Generate comparison summary
8. Store analysis in Supabase
9. Hand off to CommunicationAgent with top selections

Key behaviors:
- Always score all received quotes
- Apply client preferences as bonus points
- Flag VIP clients for premium options
- Include cost-saving opportunities (empty legs)
- Provide detailed scoring breakdown
- Explain why top 3 were selected

Output format: Ranked quotes with scores and selection rationale.
```

#### Handoff Configuration
- ✅ Communication Manager
- ✅ Error Monitor

Click **"Save Agent"**.

---

### Step 6: Create Agent 5 - Communication Manager

#### Basic Settings
- **Agent Name**: `Communication Manager`
- **Description**: `Generates personalized emails with flight proposals and sends via Gmail with PDF attachments`
- **Model**: `gpt-5`

#### GPT-5 Parameters
- **Reasoning Effort**: `low`
- **Text Verbosity**: `high` (rich email content)
- **Max Output Tokens**: `8192`

#### Tools Assignment
- ✅ `send_email`
- ✅ `create_draft`
- ✅ `get_email`
- ✅ `supabase_query`
- ✅ `supabase_update`

#### System Instructions

```
You are the Communication Manager for Jetvision.

Your responsibilities:
1. Receive top 3 ranked proposals from ProposalAnalysisAgent
2. Retrieve client profile and preferences
3. Generate personalized email:
   - Professional greeting with client name
   - Trip summary (route, dates, passengers)
   - Top 3 flight options with:
     * Aircraft type and operator
     * Price (total and per passenger)
     * Flight time and routing
     * Key amenities
     * AI score and reasoning
   - Empty leg savings highlighted (if applicable)
   - VIP benefits noted (if applicable)
   - Clear call-to-action (reply to book)
   - Professional signature
4. Format email with:
   - Clean HTML formatting
   - Flight cards with images
   - Price comparison table
   - Terms and conditions
5. Send email via Gmail MCP
6. Update workflow state to COMPLETED
7. Log email delivery in Supabase

Key behaviors:
- Personalize based on client history
- Highlight cost savings (empty legs)
- Emphasize VIP status and benefits
- Use professional, warm tone
- Include all relevant flight details
- Provide clear booking instructions
- Attach PDF summary of proposals

Email structure:
- Subject: "Your Charter Flight Options: [Route] - [Date]"
- Greeting: Personalized with client name
- Introduction: Trip summary
- Body: Top 3 options with details
- Conclusion: Next steps and contact info
- Signature: Jetvision team with contact

Output format: Email sent confirmation with message ID.
```

#### Handoff Configuration
- ✅ Error Monitor

Click **"Save Agent"**.

---

### Step 7: Create Agent 6 - Error Monitor

#### Basic Settings
- **Agent Name**: `Error Monitor`
- **Description**: `Monitors agent execution, handles errors, implements retries, and escalates critical failures`
- **Model**: `gpt-5-mini`

#### GPT-5 Parameters
- **Reasoning Effort**: `minimal`
- **Text Verbosity**: `low`
- **Max Output Tokens**: `2048`

#### Tools Assignment
- ✅ `supabase_insert`
- ✅ `supabase_update`
- ✅ `supabase_query`
- ✅ `send_email`

#### System Instructions

```
You are the Error Monitor for Jetvision.

Your responsibilities:
1. Monitor MessageBus for TASK_FAILED and ERROR messages
2. Analyze error context:
   - Error type and message
   - Failed agent and task
   - Retry count
   - Workflow state
3. Implement retry logic:
   - Transient errors (API timeouts): Retry up to 3 times
   - Rate limits: Exponential backoff
   - Invalid data: No retry, escalate
   - External service down: Retry with delay
4. Update workflow state based on error:
   - Recoverable: Keep in progress, retry
   - Unrecoverable: Transition to FAILED
5. Log all errors to Supabase
6. Send alerts for critical failures:
   - Multiple retry failures
   - Data validation errors
   - External service outages
   - Workflow timeouts (>24 hours)

Error handling rules:
- Max retries: 3 per task
- Retry delay: Exponential backoff (1s, 2s, 4s)
- Critical errors: Immediate admin notification
- Log all errors with full context
- Update workflow state appropriately

Escalation criteria:
- 3 failed retries on same task
- Data validation errors
- External service down >1 hour
- Workflow stuck >24 hours
- Security-related errors

Output format: Error report with classification and action taken.
```

#### Handoff Configuration
- No handoffs (terminal agent)

Click **"Save Agent"**.

---

### Step 8: Configure Workflow Entry Point

1. Click **"Workflow Settings"**
2. Under **"Entry Point Agent"**, select: `RFP Orchestrator`
3. Under **"Default Context"**, add:
```json
{
  "sessionId": "{{session_id}}",
  "userId": "{{user_id}}",
  "requestId": "{{request_id}}"
}
```

### Step 9: Configure Workflow Triggers

1. Click **"Add Trigger"**
2. Select trigger type: **"User Message"**
3. Configure trigger conditions:
   - Message contains RFP data (departure, arrival, date, passengers)
   - OR Message explicitly requests flight quote

### Step 10: Test Workflow

1. Click **"Test Workflow"**
2. Send test message:
```
I need a charter flight from New York (KTEB) to Miami (KOPF) on 2025-11-15 for 4 passengers. Client name: John Smith.
```

3. Verify workflow execution:
   - ✅ Orchestrator analyzes RFP
   - ✅ Client Data fetches profile (or skips if not found)
   - ✅ Flight Search creates RFP
   - ✅ Proposal Analysis scores quotes
   - ✅ Communication sends email
   - ✅ Workflow completes successfully

### Step 11: Copy Workflow ID

1. After successful test, click **"Workflow Settings"**
2. Copy the **Workflow ID** (format: `wf-xxxxxxxxxxxxxxxx`)
3. Save this ID to `.env.local`:

```bash
# ChatKit Workflow ID (from OpenAI Agent Builder)
CHATKIT_WORKFLOW_ID=wf-xxxxxxxxxxxxxxxx
```

---

## Handoff Rules Reference

### Valid Handoff Paths

```
OrchestratorAgent
  ├─> ClientDataAgent (if client name provided)
  ├─> FlightSearchAgent (after client data OR if no client)
  └─> ErrorMonitor (on validation errors)

ClientDataAgent
  ├─> FlightSearchAgent (always)
  └─> ErrorMonitor (on Google Sheets errors)

FlightSearchAgent
  ├─> ProposalAnalysisAgent (when quotes received)
  └─> ErrorMonitor (on Avinode errors or timeout)

ProposalAnalysisAgent
  ├─> CommunicationAgent (when analysis complete)
  └─> ErrorMonitor (on insufficient quotes)

CommunicationAgent
  └─> ErrorMonitor (on Gmail errors)

ErrorMonitor
  ├─> ClientDataAgent (retry)
  ├─> FlightSearchAgent (retry)
  ├─> ProposalAnalysisAgent (retry)
  └─> CommunicationAgent (retry)
```

### Handoff Conditions

Each handoff includes:
1. **Target agent**: Which agent to hand off to
2. **Condition**: When to trigger handoff
3. **Reason**: Why handoff is needed
4. **Priority**: urgency level (urgent, high, normal, low)

See `lib/config/chatkit-workflow.ts` for complete specifications.

---

## Tool Access Matrix

| Tool | Orchestrator | Client Data | Flight Search | Proposal Analysis | Communication | Error Monitor |
|------|-------------|-------------|---------------|-------------------|---------------|---------------|
| **Avinode MCP** |
| search_flights | | | ✅ | | | |
| search_empty_legs | | | ✅ | | | |
| create_rfp | | | ✅ | | | |
| get_rfp_status | | | ✅ | ✅ | | |
| create_watch | | | ✅ | | | |
| search_airports | | | ✅ | | | |
| **Google Sheets MCP** |
| list_clients | | ✅ | | | | |
| search_client | | ✅ | | | | |
| get_client_details | | ✅ | | | | |
| read_sheet | | ✅ | | | | |
| **Gmail MCP** |
| send_email | | | | | ✅ | ✅ |
| create_draft | | | | | ✅ | |
| get_email | | | | | ✅ | |
| **Supabase MCP** |
| supabase_query | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| supabase_insert | ✅ | ✅ | ✅ | ✅ | | ✅ |
| supabase_update | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| supabase_rpc | | | | ✅ | | |

---

## Workflow State Timeouts

| State | Timeout | Responsible Agent |
|-------|---------|-------------------|
| CREATED | 1 minute | Orchestrator |
| ANALYZING | 2 minutes | Orchestrator |
| FETCHING_CLIENT_DATA | 5 minutes | Client Data |
| SEARCHING_FLIGHTS | 10 minutes | Flight Search |
| AWAITING_QUOTES | 24 hours | Flight Search |
| ANALYZING_PROPOSALS | 5 minutes | Proposal Analysis |
| GENERATING_EMAIL | 3 minutes | Communication |
| SENDING_PROPOSAL | 2 minutes | Communication |

If timeout exceeded, ErrorMonitor is invoked to handle escalation.

---

## Troubleshooting

### Issue: Tools not appearing in Agent Builder

**Cause**: MCP servers not running or not configured properly.

**Solution**:
1. Verify `.mcp.json` configuration
2. Start all MCP servers: `npm run dev:mcp`
3. Check server logs for errors
4. Refresh Agent Builder page

### Issue: Handoff failing between agents

**Cause**: Invalid handoff path or missing target agent.

**Solution**:
1. Verify handoff rules in workflow configuration
2. Ensure target agent exists and is configured
3. Check handoff conditions match expected state
4. Review MessageBus logs for handoff messages

### Issue: Agent using wrong model

**Cause**: Model selection overridden in Agent Builder.

**Solution**:
1. Edit agent in Agent Builder
2. Verify **Model** dropdown shows correct model (gpt-5 or gpt-5-mini)
3. Check **Advanced Settings** for reasoning/verbosity parameters

### Issue: Workflow timing out

**Cause**: External service delays (Avinode quotes, Google Sheets API).

**Solution**:
1. Increase timeout values in workflow configuration
2. Check ErrorMonitor logs for retry attempts
3. Verify external service status
4. Consider increasing max retries for transient errors

---

## Next Steps

After completing this setup:

1. ✅ **Verify Workflow ID**: Ensure `CHATKIT_WORKFLOW_ID` is set in `.env.local`
2. ✅ **Test End-to-End**: Submit a real RFP and verify complete workflow execution
3. ✅ **Monitor Performance**: Check agent execution times and optimize if needed
4. ✅ **Review Handoffs**: Ensure agents hand off cleanly without errors
5. ✅ **ChatKit Integration**: Proceed to ONEK-87 (Implement ChatKit Component)

---

## References

- **Configuration File**: `/lib/config/chatkit-workflow.ts`
- **Agent Core**: `/agents/core/`
- **Coordination Layer**: `/agents/coordination/`
- **MCP Servers**: `/mcp-servers/`
- **Architecture Docs**: `/docs/architecture/MULTI_AGENT_SYSTEM.md`
- **Integration Plan**: `/.cursor/plans/mcp-1006bb35.plan.md`

---

**Document Status**: ✅ Complete and ready for use
**Last Updated**: November 1, 2025
**Owner**: Jetvision Development Team
