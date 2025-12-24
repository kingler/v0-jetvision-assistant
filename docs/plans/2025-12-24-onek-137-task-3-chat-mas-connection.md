# ONEK-137 Task 3: Connect Chat Interface to Multi-Agent System

**Date**: 2025-12-24
**Status**: Design Complete
**Priority**: High

---

## Executive Summary

Connect the chat interface (`/api/chat/route.ts`) to the Multi-Agent System by replacing direct OpenAI calls with the OrchestratorAgent. This enables full agent coordination, conversation state management, and proper task delegation to specialized agents.

---

## Current State Analysis

### Problem
`/api/chat/route.ts` bypasses the multi-agent system entirely:
- Uses direct `OpenAI.chat.completions.create()` calls
- Manually defines 7 Avinode tools inline
- No conversation state persistence
- No intent classification
- No agent coordination or handoffs

### Reference Pattern
`/api/requests/route.ts` shows the correct pattern:
```typescript
const factory = AgentFactory.getInstance()
const orchestrator = await factory.createAndInitialize({
  type: AgentType.ORCHESTRATOR,
  name: 'RFP Orchestrator',
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
})
await orchestrator.execute(context)
```

---

## Architecture Design

### Target Flow

```
┌─────────────────┐
│  chat-interface │
│      .tsx       │
└────────┬────────┘
         │ POST /api/chat
         ▼
┌─────────────────┐
│  /api/chat      │
│  route.ts       │
│  (SSE stream)   │
└────────┬────────┘
         │ AgentFactory.createAndInitialize()
         ▼
┌─────────────────────────────────────────────┐
│           OrchestratorAgent                  │
│  • IntentParser                             │
│  • DataExtractor                            │
│  • QuestionGenerator                        │
│  • ConversationState tracking               │
└────────┬────────────────┬───────────────────┘
         │                │
    ┌────▼────┐     ┌─────▼─────┐
    │ Flight  │     │ Client    │
    │ Search  │     │ Data      │
    │ Agent   │     │ Agent     │
    └─────────┘     └───────────┘
```

---

## New SSE Response Format

### Current Format (Limited)
```typescript
interface CurrentResponse {
  content: string
  done: boolean
  tool_calls?: Array<{ name: string; result: unknown }>
  trip_data?: unknown
  rfq_data?: unknown
  mock_mode: boolean
}
```

### New Format (Agent-Aware)
```typescript
interface AgentStreamResponse {
  // Backward compatible fields
  content: string
  done: boolean
  tool_calls?: Array<{ name: string; result: unknown }>
  trip_data?: TripData | null
  rfq_data?: RFQData | null
  mock_mode: boolean

  // Agent metadata fields
  agent: {
    intent: UserIntent
    conversationState: {
      phase: ConversationPhase
      extractedData: Partial<RFPData>
      pendingQuestions: string[]
    }
    nextActions?: ActionButton[]
    workflowState?: WorkflowState
  }
}

type UserIntent =
  | 'RFP_CREATION'
  | 'INFORMATION_QUERY'
  | 'GENERAL_CONVERSATION'
  | 'CONFIRMATION'
  | 'CLARIFICATION'

type ConversationPhase =
  | 'greeting'
  | 'gathering_info'
  | 'confirming'
  | 'processing'
  | 'complete'

interface ActionButton {
  label: string
  action: string
  priority: 'primary' | 'secondary'
}
```

---

## Implementation Plan

### Step 1: Create OrchestratorAgent Session Manager

```typescript
// lib/agents/orchestrator-session.ts
import { AgentFactory, AgentType } from '@agents/core'

const orchestratorCache = new Map<string, OrchestratorAgent>()

export async function getOrCreateOrchestrator(sessionId: string) {
  if (orchestratorCache.has(sessionId)) {
    return orchestratorCache.get(sessionId)!
  }

  const factory = AgentFactory.getInstance()
  const orchestrator = await factory.createAndInitialize({
    type: AgentType.ORCHESTRATOR,
    name: 'Chat Orchestrator',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  })

  orchestratorCache.set(sessionId, orchestrator)
  return orchestrator
}

export function clearOrchestratorSession(sessionId: string) {
  orchestratorCache.delete(sessionId)
}
```

### Step 2: Modify /api/chat/route.ts

Replace direct OpenAI calls with OrchestratorAgent:

```typescript
// BEFORE: Direct OpenAI
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages,
  tools: AVINODE_TOOLS,
})

// AFTER: Via OrchestratorAgent
const orchestrator = await getOrCreateOrchestrator(sessionId)
const result = await orchestrator.execute({
  sessionId,
  userId,
  metadata: {
    userMessage: message,
    conversationHistory,
    context,
  },
})
```

### Step 3: Create SSE Stream Adapter

```typescript
// lib/agents/stream-adapter.ts
import { AgentResult } from '@agents/core/types'

export function createAgentSSEStream(
  result: AgentResult,
  mockMode: boolean
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      const response: AgentStreamResponse = {
        content: result.response || result.metadata?.response || '',
        done: true,
        mock_mode: mockMode,
        tool_calls: result.toolCalls?.map(tc => ({
          name: tc.name,
          result: tc.result,
        })),
        trip_data: result.metadata?.tripData || null,
        rfq_data: result.metadata?.rfqData || null,
        agent: {
          intent: result.metadata?.intent || 'GENERAL_CONVERSATION',
          conversationState: result.metadata?.conversationState || {
            phase: 'gathering_info',
            extractedData: {},
            pendingQuestions: [],
          },
          nextActions: result.metadata?.nextActions,
          workflowState: result.metadata?.workflowState,
        },
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(response)}\n\n`)
      )
      controller.close()
    },
  })
}
```

### Step 4: Update chat-interface.tsx

Handle new agent metadata in response:

```typescript
// Enhanced response handler
const handleStreamData = (data: AgentStreamResponse) => {
  // Existing content handling
  if (data.content) {
    setCurrentMessage(prev => prev + data.content)
  }

  // NEW: Agent metadata handling
  if (data.agent) {
    // Update workflow visualization
    if (data.agent.workflowState) {
      setWorkflowStatus(data.agent.workflowState)
    }

    // Show action buttons
    if (data.agent.nextActions?.length) {
      setActionButtons(data.agent.nextActions)
    }

    // Display extraction progress
    if (data.agent.conversationState?.extractedData) {
      setExtractedData(data.agent.conversationState.extractedData)
    }

    // Show pending questions indicator
    if (data.agent.conversationState?.pendingQuestions?.length) {
      setHasPendingQuestions(true)
    }
  }

  // Existing tool call handling
  if (data.tool_calls) { ... }
  if (data.trip_data) { ... }
}
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `/api/chat/route.ts` | Major | Replace OpenAI with OrchestratorAgent |
| `/lib/agents/orchestrator-session.ts` | New | Session-based orchestrator management |
| `/lib/agents/stream-adapter.ts` | New | Convert AgentResult to SSE format |
| `/lib/types/chat.ts` | New | AgentStreamResponse type definitions |
| `/components/chat-interface.tsx` | Moderate | Handle new agent metadata |

---

## Testing Strategy

### Unit Tests
- `orchestrator-session.test.ts` - Session management
- `stream-adapter.test.ts` - SSE format conversion

### Integration Tests
- `chat-api-agent.test.ts` - API → OrchestratorAgent flow
- `chat-interface-agent.test.ts` - Frontend handles agent responses

### E2E Tests
- `chat-rfp-flow.spec.ts` - Full RFP conversation flow

---

## Migration Notes

### Backward Compatibility
The new format is **additive** - all existing fields remain:
- `content`, `done`, `tool_calls`, `trip_data`, `rfq_data`, `mock_mode`

New `agent` object is optional on the frontend during transition.

### Rollback Plan
If issues arise, revert to commit before changes. The existing `/api/chat/route.ts` with direct OpenAI calls will continue working.

---

## Success Criteria

1. ✅ Chat routes through OrchestratorAgent
2. ✅ Intent classification visible in responses
3. ✅ Conversation state persists across messages
4. ✅ FlightSearchAgent triggered for flight searches
5. ✅ All existing Avinode tools work
6. ✅ SSE streaming maintains <100ms first byte
7. ✅ Existing UI functionality preserved

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Session manager | 1 hour |
| API route modification | 2 hours |
| Stream adapter | 1 hour |
| Type definitions | 30 min |
| Frontend updates | 2 hours |
| Testing | 2 hours |
| **Total** | **~8.5 hours** |
