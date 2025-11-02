# Agent Handoff Rules Specification

**Linear Issue**: ONEK-86
**Created**: November 1, 2025
**Status**: Design Complete

---

## Overview

This document defines the rules and conditions for agent-to-agent task delegation (handoffs) in the Jetvision Multi-Agent System. Handoff rules are based on the existing MessageBus and HandoffManager patterns and aligned with the WorkflowStateMachine state transitions.

## Handoff Architecture

### Components

1. **HandoffManager** (`agents/coordination/handoff-manager.ts`)
   - Coordinates task delegation between agents
   - Validates handoff paths
   - Tracks pending and completed handoffs
   - Publishes handoff events to MessageBus

2. **MessageBus** (`agents/coordination/message-bus.ts`)
   - Broadcasts `AGENT_HANDOFF` events
   - Enables async communication between agents
   - Maintains message history for audit trail

3. **WorkflowStateMachine** (`agents/coordination/state-machine.ts`)
   - Enforces valid state transitions
   - Maps states to responsible agents
   - Prevents invalid workflow progressions

### Handoff Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Source Agent determines handoff is needed            │
│    - Task complete                                       │
│    - Error requiring specialized agent                   │
│    - Workflow state requires different agent             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Source Agent calls handoffManager.handoff()          │
│    - Validates target agent exists                       │
│    - Creates AgentTask with payload                      │
│    - Sets priority based on urgency                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 3. HandoffManager publishes AGENT_HANDOFF message       │
│    - Message includes task, context, and reason         │
│    - Stores in pending handoffs                          │
│    - Logs handoff to history                             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Target Agent receives handoff notification           │
│    - Subscribes to MessageBus events                     │
│    - Filters for handoffs targeted to self               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Target Agent accepts or rejects handoff              │
│    - Accept: Execute task with provided context         │
│    - Reject: Return error with reason                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Target Agent executes task and reports result        │
│    - Publishes TASK_COMPLETED or TASK_FAILED            │
│    - Updates workflow state                              │
│    - Hands off to next agent if needed                   │
└─────────────────────────────────────────────────────────┘
```

---

## Handoff Rules by Agent

### 1. Orchestrator Agent Handoffs

**State After Execution**: `ANALYZING` → `FETCHING_CLIENT_DATA` or `SEARCHING_FLIGHTS`

#### Rule 1.1: Hand off to Client Data Agent

```typescript
{
  from: AgentType.ORCHESTRATOR,
  to: AgentType.CLIENT_DATA,
  condition: 'Client name or email provided in RFP',
  reason: 'Fetch client profile and preferences before flight search',
  priority: 'high',

  payload: {
    requestId: string,
    sessionId: string,
    clientName?: string,
    clientEmail?: string,
    rfpData: RFPData
  },

  triggerState: 'ANALYZING_COMPLETE',
  nextState: 'FETCHING_CLIENT_DATA'
}
```

**Implementation**:
```typescript
// In OrchestratorAgent.execute()
if (rfpData.clientName || rfpData.clientEmail) {
  await this.handoff(AgentType.CLIENT_DATA, {
    id: `task-client-${Date.now()}`,
    type: 'fetch_client_data',
    payload: {
      requestId: context.requestId,
      sessionId: context.sessionId,
      clientName: rfpData.clientName,
      clientEmail: rfpData.clientEmail,
      rfpData
    },
    priority: 'high',
    status: 'pending',
    createdAt: new Date()
  });
}
```

#### Rule 1.2: Hand off to Flight Search Agent

```typescript
{
  from: AgentType.ORCHESTRATOR,
  to: AgentType.FLIGHT_SEARCH,
  condition: 'No client name provided OR after client data retrieved',
  reason: 'Search for available charter flights and create RFP',
  priority: 'normal',

  payload: {
    requestId: string,
    sessionId: string,
    rfpData: RFPData,
    clientProfile?: ClientProfile
  },

  triggerState: 'ANALYZING_COMPLETE' | 'CLIENT_DATA_COMPLETE',
  nextState: 'SEARCHING_FLIGHTS'
}
```

**Implementation**:
```typescript
// Skip client data if no client identifier
if (!rfpData.clientName && !rfpData.clientEmail) {
  await this.handoff(AgentType.FLIGHT_SEARCH, {
    id: `task-flight-${Date.now()}`,
    type: 'search_flights',
    payload: {
      requestId: context.requestId,
      sessionId: context.sessionId,
      rfpData
    },
    priority: urgency, // urgent | high | normal | low
    status: 'pending',
    createdAt: new Date()
  });
}
```

#### Rule 1.3: Hand off to Error Monitor

```typescript
{
  from: AgentType.ORCHESTRATOR,
  to: AgentType.ERROR_MONITOR,
  condition: 'RFP validation errors or missing required fields',
  reason: 'Handle data validation errors and escalate',
  priority: 'urgent',

  payload: {
    requestId: string,
    sessionId: string,
    errorType: 'validation_error',
    errorMessage: string,
    rfpData: Partial<RFPData>
  },

  triggerState: 'ANALYZING_FAILED',
  nextState: 'FAILED'
}
```

---

### 2. Client Data Agent Handoffs

**State After Execution**: `FETCHING_CLIENT_DATA` → `SEARCHING_FLIGHTS`

#### Rule 2.1: Hand off to Flight Search Agent

```typescript
{
  from: AgentType.CLIENT_DATA,
  to: AgentType.FLIGHT_SEARCH,
  condition: 'Client data retrieved successfully OR client not found',
  reason: 'Proceed with flight search using client preferences (if available)',
  priority: 'normal',

  payload: {
    requestId: string,
    sessionId: string,
    rfpData: RFPData,
    clientProfile?: ClientProfile, // undefined if not found
    clientPreferences?: {
      preferredAircraft: string[],
      budgetRange: { min: number, max: number },
      vipStatus: boolean,
      specialRequirements: string[]
    }
  },

  triggerState: 'CLIENT_DATA_COMPLETE',
  nextState: 'SEARCHING_FLIGHTS'
}
```

**Implementation**:
```typescript
// In ClientDataAgent.execute()
const clientProfile = await this.fetchClientData(clientName);

await this.handoff(AgentType.FLIGHT_SEARCH, {
  id: `task-flight-${Date.now()}`,
  type: 'search_flights',
  payload: {
    requestId: context.requestId,
    sessionId: context.sessionId,
    rfpData: context.metadata?.rfpData,
    clientProfile: clientProfile || undefined,
    clientPreferences: clientProfile ? this.extractPreferences(clientProfile) : undefined
  },
  priority: 'normal',
  status: 'pending',
  createdAt: new Date()
});
```

#### Rule 2.2: Hand off to Error Monitor

```typescript
{
  from: AgentType.CLIENT_DATA,
  to: AgentType.ERROR_MONITOR,
  condition: 'Google Sheets API errors or authentication failures',
  reason: 'Handle external service errors with retry logic',
  priority: 'high',

  payload: {
    requestId: string,
    sessionId: string,
    errorType: 'external_service_error',
    service: 'google_sheets',
    errorMessage: string,
    retryable: boolean
  },

  triggerState: 'CLIENT_DATA_FAILED',
  nextState: 'FETCHING_CLIENT_DATA' // retry or 'FAILED'
}
```

---

### 3. Flight Search Agent Handoffs

**State After Execution**: `SEARCHING_FLIGHTS` → `AWAITING_QUOTES` → `ANALYZING_PROPOSALS`

#### Rule 3.1: Hand off to Proposal Analysis Agent

```typescript
{
  from: AgentType.FLIGHT_SEARCH,
  to: AgentType.PROPOSAL_ANALYSIS,
  condition: 'Minimum 3 quotes received from operators',
  reason: 'Analyze and rank flight proposals using multi-dimensional scoring',
  priority: 'normal',

  payload: {
    requestId: string,
    sessionId: string,
    rfpId: string,
    quotesCount: number,
    rfpData: RFPData,
    clientPreferences?: ClientPreferences
  },

  triggerState: 'QUOTES_RECEIVED',
  nextState: 'ANALYZING_PROPOSALS'
}
```

**Implementation**:
```typescript
// In FlightSearchAgent - monitor RFP status
const rfpStatus = await avinodeClient.getRFPStatus(rfpId);

if (rfpStatus.quotes.length >= 3) {
  await this.handoff(AgentType.PROPOSAL_ANALYSIS, {
    id: `task-analysis-${Date.now()}`,
    type: 'analyze_proposals',
    payload: {
      requestId: context.requestId,
      sessionId: context.sessionId,
      rfpId,
      quotesCount: rfpStatus.quotes.length,
      rfpData: context.metadata?.rfpData,
      clientPreferences: context.metadata?.clientPreferences
    },
    priority: 'normal',
    status: 'pending',
    createdAt: new Date()
  });
}
```

#### Rule 3.2: Hand off to Error Monitor

```typescript
{
  from: AgentType.FLIGHT_SEARCH,
  to: AgentType.ERROR_MONITOR,
  condition: 'Avinode API errors OR no quotes after 24 hours',
  reason: 'Handle flight search failures or timeout',
  priority: 'high',

  payload: {
    requestId: string,
    sessionId: string,
    errorType: 'avinode_error' | 'quote_timeout',
    rfpId?: string,
    errorMessage: string,
    retryable: boolean
  },

  triggerState: 'SEARCHING_FLIGHTS_FAILED' | 'AWAITING_QUOTES_TIMEOUT',
  nextState: 'SEARCHING_FLIGHTS' // retry or 'FAILED'
}
```

---

### 4. Proposal Analysis Agent Handoffs

**State After Execution**: `ANALYZING_PROPOSALS` → `GENERATING_EMAIL`

#### Rule 4.1: Hand off to Communication Agent

```typescript
{
  from: AgentType.PROPOSAL_ANALYSIS,
  to: AgentType.COMMUNICATION,
  condition: 'Top 3 proposals selected and scored',
  reason: 'Generate personalized email with ranked proposals',
  priority: 'normal',

  payload: {
    requestId: string,
    sessionId: string,
    rfpId: string,
    topProposals: [
      {
        rank: number,
        quoteId: string,
        operator: string,
        aircraft: string,
        price: number,
        scores: {
          price: number,
          safety: number,
          speed: number,
          comfort: number,
          total: number
        },
        reasoning: string
      }
    ],
    clientProfile?: ClientProfile,
    rfpData: RFPData
  },

  triggerState: 'ANALYSIS_COMPLETE',
  nextState: 'GENERATING_EMAIL'
}
```

**Implementation**:
```typescript
// In ProposalAnalysisAgent.execute()
const rankedProposals = await this.scoreAndRankProposals(quotes);
const topThree = rankedProposals.slice(0, 3);

await this.handoff(AgentType.COMMUNICATION, {
  id: `task-email-${Date.now()}`,
  type: 'send_proposal_email',
  payload: {
    requestId: context.requestId,
    sessionId: context.sessionId,
    rfpId,
    topProposals: topThree,
    clientProfile: context.metadata?.clientProfile,
    rfpData: context.metadata?.rfpData
  },
  priority: 'normal',
  status: 'pending',
  createdAt: new Date()
});
```

#### Rule 4.2: Hand off to Error Monitor

```typescript
{
  from: AgentType.PROPOSAL_ANALYSIS,
  to: AgentType.ERROR_MONITOR,
  condition: 'Insufficient quotes to analyze (< 3 quotes)',
  reason: 'Handle insufficient data error',
  priority: 'high',

  payload: {
    requestId: string,
    sessionId: string,
    errorType: 'insufficient_data',
    rfpId: string,
    quotesReceived: number,
    minimumRequired: 3
  },

  triggerState: 'ANALYSIS_FAILED',
  nextState: 'FAILED'
}
```

---

### 5. Communication Agent Handoffs

**State After Execution**: `GENERATING_EMAIL` → `SENDING_PROPOSAL` → `COMPLETED`

#### Rule 5.1: Hand off to Error Monitor (Only on Failure)

```typescript
{
  from: AgentType.COMMUNICATION,
  to: AgentType.ERROR_MONITOR,
  condition: 'Gmail API errors or email delivery failures',
  reason: 'Handle email sending failures with retry logic',
  priority: 'urgent',

  payload: {
    requestId: string,
    sessionId: string,
    errorType: 'email_delivery_error',
    recipient: string,
    errorMessage: string,
    retryable: boolean
  },

  triggerState: 'SENDING_PROPOSAL_FAILED',
  nextState: 'GENERATING_EMAIL' // retry or 'FAILED'
}
```

**Note**: Communication Agent typically ends the workflow with `COMPLETED` state. No handoff needed on success.

---

### 6. Error Monitor Agent Handoffs

**State After Execution**: Varies (retry to original agent or mark as `FAILED`)

#### Rule 6.1: Retry Handoff to Client Data Agent

```typescript
{
  from: AgentType.ERROR_MONITOR,
  to: AgentType.CLIENT_DATA,
  condition: 'Recoverable Google Sheets error AND retry count < 3',
  reason: 'Retry client data fetch after exponential backoff',
  priority: 'high',

  payload: {
    requestId: string,
    sessionId: string,
    retryCount: number,
    originalError: string,
    clientName: string
  },

  triggerState: 'ERROR_RETRY',
  nextState: 'FETCHING_CLIENT_DATA'
}
```

#### Rule 6.2: Retry Handoff to Flight Search Agent

```typescript
{
  from: AgentType.ERROR_MONITOR,
  to: AgentType.FLIGHT_SEARCH,
  condition: 'Recoverable Avinode error AND retry count < 3',
  reason: 'Retry flight search after exponential backoff',
  priority: 'high',

  payload: {
    requestId: string,
    sessionId: string,
    retryCount: number,
    originalError: string,
    rfpData: RFPData
  },

  triggerState: 'ERROR_RETRY',
  nextState: 'SEARCHING_FLIGHTS'
}
```

#### Rule 6.3: Retry Handoff to Communication Agent

```typescript
{
  from: AgentType.ERROR_MONITOR,
  to: AgentType.COMMUNICATION,
  condition: 'Recoverable Gmail error AND retry count < 3',
  reason: 'Retry email sending after exponential backoff',
  priority: 'urgent',

  payload: {
    requestId: string,
    sessionId: string,
    retryCount: number,
    originalError: string,
    emailPayload: EmailPayload
  },

  triggerState: 'ERROR_RETRY',
  nextState: 'SENDING_PROPOSAL'
}
```

---

## Handoff Validation Rules

### 1. Target Agent Must Exist

```typescript
// HandoffManager validates target exists
const targetAgent = this.registry.getAgent(toAgent);
if (!targetAgent) {
  throw new Error(`Target agent not found: ${toAgent}`);
}
```

### 2. State Transition Must Be Valid

```typescript
// WorkflowStateMachine enforces valid transitions
const workflow = workflowManager.getWorkflow(requestId);
if (!workflow.canTransition(nextState)) {
  throw new Error(`Invalid state transition: ${workflow.getState()} -> ${nextState}`);
}
```

### 3. Handoff Must Include Required Payload

```typescript
// Required fields for all handoffs
interface AgentHandoff {
  fromAgent: string;  // Source agent ID
  toAgent: string;    // Target agent ID
  task: AgentTask;    // Task with payload
  context: AgentContext; // Session and request context
  reason: string;     // Human-readable reason
}
```

### 4. Priority Must Be Valid

```typescript
type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

// Priority determines queue position
const PRIORITY_LEVELS = {
  urgent: 1,
  high: 2,
  normal: 5,
  low: 10
};
```

---

## Handoff Message Format

All handoffs publish an `AGENT_HANDOFF` message to the MessageBus:

```typescript
{
  id: 'msg-uuid',
  type: MessageType.AGENT_HANDOFF,
  sourceAgent: 'orchestrator-agent-id',
  targetAgent: 'client-data-agent-id',
  timestamp: new Date(),
  payload: {
    handoff: {
      fromAgent: 'orchestrator-agent-id',
      toAgent: 'client-data-agent-id',
      task: {
        id: 'task-123',
        type: 'fetch_client_data',
        payload: { ... },
        priority: 'high',
        status: 'pending',
        createdAt: new Date()
      },
      context: {
        requestId: 'req-456',
        sessionId: 'session-789',
        userId: 'user-abc'
      },
      reason: 'Fetch client profile and preferences before flight search'
    }
  },
  context: {
    requestId: 'req-456',
    sessionId: 'session-789'
  }
}
```

---

## Handoff Statistics

Track handoff metrics for monitoring and optimization:

```typescript
const stats = handoffManager.getStats();

// Returns:
{
  totalHandoffs: number,
  pendingHandoffs: number,
  handoffsByAgent: {
    'orchestrator-agent': { sent: 10, received: 0 },
    'client-data-agent': { sent: 5, received: 10 },
    'flight-search-agent': { sent: 5, received: 5 },
    // ...
  }
}
```

---

## Error Handling

### Handoff Rejection

```typescript
// Target agent rejects handoff
await handoffManager.rejectHandoff(
  taskId,
  agentId,
  'Agent currently processing maximum concurrent tasks'
);

// Publishes TASK_FAILED message
// Error Monitor handles retry or escalation
```

### Handoff Timeout

```typescript
// If target agent doesn't accept within timeout
const HANDOFF_TIMEOUT = 30000; // 30 seconds

setTimeout(() => {
  const handoff = handoffManager.getPendingHandoffs(agentId);
  if (handoff) {
    // Escalate to Error Monitor
    errorMonitor.handleHandoffTimeout(handoff);
  }
}, HANDOFF_TIMEOUT);
```

---

## Testing Handoff Rules

### Unit Tests

```typescript
describe('Handoff Rules', () => {
  it('should hand off from Orchestrator to Client Data when client name provided', async () => {
    const orchestrator = new OrchestratorAgent({ ... });
    const result = await orchestrator.execute({
      metadata: { rfpData: { clientName: 'John Smith', ... } }
    });

    expect(result.data.nextSteps).toContain('fetch_client_data');
    expect(result.data.tasks[0].targetAgent).toBe(AgentType.CLIENT_DATA);
  });

  it('should skip Client Data when no client identifier', async () => {
    const orchestrator = new OrchestratorAgent({ ... });
    const result = await orchestrator.execute({
      metadata: { rfpData: { /* no clientName */ } }
    });

    expect(result.data.tasks[0].targetAgent).toBe(AgentType.FLIGHT_SEARCH);
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Handoff Flow', () => {
  it('should complete full workflow with all handoffs', async () => {
    // Track all handoffs
    const handoffs: AgentBusMessage[] = [];

    messageBus.subscribe(MessageType.AGENT_HANDOFF, (msg) => {
      handoffs.push(msg);
    });

    // Execute workflow
    await processRFP(rfpData);

    // Verify handoff sequence
    expect(handoffs).toHaveLength(5);
    expect(handoffs[0].targetAgent).toBe(AgentType.CLIENT_DATA);
    expect(handoffs[1].targetAgent).toBe(AgentType.FLIGHT_SEARCH);
    expect(handoffs[2].targetAgent).toBe(AgentType.PROPOSAL_ANALYSIS);
    expect(handoffs[3].targetAgent).toBe(AgentType.COMMUNICATION);
  });
});
```

---

## References

- **Configuration**: `/lib/config/chatkit-workflow.ts`
- **HandoffManager**: `/agents/coordination/handoff-manager.ts`
- **MessageBus**: `/agents/coordination/message-bus.ts`
- **WorkflowStateMachine**: `/agents/coordination/state-machine.ts`
- **Agent Types**: `/agents/core/types.ts`

---

**Document Status**: ✅ Complete
**Last Updated**: November 1, 2025
**Owner**: Jetvision Development Team
