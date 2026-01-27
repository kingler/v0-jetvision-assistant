# JetvisionAgent Conversational Intelligence Analysis

**Date**: 2026-01-27
**Author**: Claude Code Analysis
**Scope**: Context management, trip creation logic, conversation persistence

---

## Executive Summary

The JetvisionAgent demonstrates **mature conversational intelligence** with sophisticated context management through a well-designed system prompt architecture. However, there are several areas where gaps exist between the intended behavior (documented in prompts) and actual implementation.

### Overall Assessment

| Capability | Status | Score |
|------------|--------|-------|
| Context Management | ✅ Good | 8/10 |
| Intent Detection | ✅ Good | 8/10 |
| Multi-Turn Handling | ⚠️ Partial | 6/10 |
| Field Validation | ⚠️ Prompt-Only | 5/10 |
| Conversation Persistence | ✅ Good | 8/10 |
| Trip Creation Logic | ⚠️ LLM-Dependent | 6/10 |

---

## 1. Context Management & Trip Creation

### Current State: ✅ IMPLEMENTED

The agent maintains context through several mechanisms:

#### 1.1 AgentContext Interface
**Location**: `agents/jetvision-agent/types.ts`

```typescript
interface AgentContext {
  sessionId: string;      // Unique session identifier
  userId: string;         // Clerk user ID
  isoAgentId: string;     // ISO agent reference
  requestId?: string;     // Current flight request ID
  conversationHistory?: ConversationMessage[];
  metadata?: Record<string, unknown>;
}
```

#### 1.2 Conversation History Passed to Agent
**Location**: `app/api/chat/route.ts:204`

```typescript
const result = await agent.execute(message, conversationHistory);
```

The agent receives full conversation history from the frontend on each API call.

#### 1.3 Frontend Conversation History Management
**Location**: `components/chat-interface.tsx:566-569`

```typescript
conversationHistory: existingMessages.map((m) => ({
  role: m.type === "user" ? "user" : "assistant",
  content: m.content,
})),
```

### Issue: New Trip vs. Existing Conversation Detection

**FINDING**: The agent relies entirely on the LLM (via system prompt) to determine when to create a new trip vs. continue an existing conversation. There is **no programmatic validation** before calling `create_trip`.

**Evidence** (`agents/jetvision-agent/index.ts:186-188`):
```typescript
// Capture create_trip params for rfpData
if (name === 'create_trip') {
  createTripParams = params;
}
```

The agent simply captures params when OpenAI decides to call `create_trip` - there's no pre-validation logic.

**System Prompt Guidance** (`lib/prompts/jetvision-system-prompt.ts:86-133`):
- Detailed decision tree for new flight requests
- Progressive disclosure pattern documented
- BUT: This is prompt-only, not code-enforced

---

## 2. Intent Detection & Clarification

### Current State: ✅ IMPLEMENTED

#### 2.1 Intent Detection System
**Location**: `lib/prompts/intent-prompts.ts`

The system detects 10 distinct intents:
1. `create_rfp` - New flight request
2. `get_rfp_status` - Trip/quote lookup
3. `search_flights` - Flight search
4. `get_quotes` - Quote comparison
5. `empty_legs` - Empty leg search
6. `client_lookup` - Client management
7. `generate_proposal` - Proposal creation
8. `send_proposal` - Send proposal to client
9. `operator_message` - Operator communication
10. `view_history` - Request history

#### 2.2 Multi-Turn Intent Continuity
**Location**: `lib/prompts/intent-prompts.ts:385-424`

```typescript
export function detectIntentWithHistory(
  currentMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): string | null {
  // First, try to detect intent from current message
  const currentIntent = detectIntent(currentMessage);
  if (currentIntent) return currentIntent;

  // If no intent detected and message looks like airport clarification,
  // check if we're in the middle of a trip creation flow
  if (isAirportClarificationResponse(currentMessage)) {
    const lastAssistantMsg = [...conversationHistory].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg && isAskingForTripClarification(lastAssistantMsg.content)) {
      return 'create_rfp';
    }
  }
  // ... additional history scanning
}
```

**This is a KEY strength** - the system maintains intent continuity across multi-turn conversations.

#### 2.3 Forced Tool Detection
**Location**: `lib/prompts/jetvision-system-prompt.ts:712-810`

Patterns that force specific tool calls:
- `KTEB to KMCI` → Forces `create_trip`
- `atrip-*` or `arfq-*` → Forces `get_rfq`
- Trip ID patterns (6-char code) → Forces `get_rfq`

**Context-Based Forcing** (`jetvision-system-prompt.ts:838-850`):
```typescript
export function detectForcedToolFromContext(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): string | null {
  // If last assistant message asked for airports AND user provides ICAO codes
  // → Force create_trip
}
```

---

## 3. Required Field Validation for `create_trip`

### Current State: ⚠️ PROMPT-ONLY (No Code Enforcement)

#### 3.1 Required Fields (Tool Definition)
**Location**: `agents/jetvision-agent/tools.ts:18-51`

```typescript
required: ['departure_airport', 'arrival_airport', 'departure_date', 'passengers'],
```

#### 3.2 System Prompt Validation Guidance
**Location**: `lib/prompts/jetvision-system-prompt.ts:179-185`

```
**Required Fields** (ALL must be present before calling create_trip):
- Departure airport (ICAO code)
- Arrival airport (ICAO code)
- Departure date (YYYY-MM-DD)
- Number of passengers
```

### Issue: Validation Is LLM-Dependent

**CRITICAL GAP**: There is no programmatic validation in the agent code to verify all required fields are present before calling `create_trip`. The agent trusts OpenAI to follow the system prompt instructions.

**Risk**: If OpenAI hallucates or misinterprets the prompt, it could call `create_trip` with missing fields.

**Evidence** (`agents/jetvision-agent/index.ts:161-198`):
```typescript
for (const tc of toolCalls) {
  const { name, arguments: argsJson } = tc.function;
  let params: Record<string, unknown>;

  try {
    params = JSON.parse(argsJson);
  } catch {
    // Only catches JSON parse errors, not missing fields
    toolResults.push({ name: name as ToolName, success: false, error: 'Invalid arguments' });
    continue;
  }

  // No validation of params.departure_airport, params.arrival_airport, etc.
  const result = await this.toolExecutor.execute(name as ToolName, params);
}
```

---

## 4. Follow-up Question Capability

### Current State: ✅ WELL-DOCUMENTED (Prompt-Based)

#### 4.1 Progressive Disclosure Pattern
**Location**: `lib/prompts/jetvision-system-prompt.ts:86-133`

The system prompt defines a clear decision tree:
```
Check: Has departure airport?
  |-- No --> Ask for departure airport
  |-- Yes --> Check: Has arrival airport?
                |-- No --> Ask for arrival airport
                |-- Yes --> Check: Has departure date?
                              ...
```

#### 4.2 Conversation Continuity
**Location**: `lib/prompts/jetvision-system-prompt.ts:135-143`

```
**CRITICAL: Multi-Turn Conversation Handling**
- When ANY required field is missing, you MUST:
  1. Ask for the missing information clearly
  2. Acknowledge what you already have
  3. Keep the conversation active
  4. Wait for the user's response before proceeding
  5. Once user provides missing info, check if ALL fields are now complete
  6. Only call create_trip when ALL required fields are present
```

#### 4.3 "Please Continue" Handling
**Location**: `lib/prompts/jetvision-system-prompt.ts:402-429`

Dedicated scenario handler for continuation phrases:
- "please continue"
- "continue"
- "go ahead"
- "yes"
- "ok"

### Issue: Clarification Logic Not Programmatically Enforced

While the system prompt is comprehensive, there's no code-level guarantee that the agent will:
1. Ask for missing fields instead of hallucinating
2. Not prematurely call `create_trip` with partial data

---

## 5. Conversation Persistence

### Current State: ✅ IMPLEMENTED

#### 5.1 Message Saving
**Location**: `app/api/chat/route.ts:165-226`

```typescript
// Save user message
const userMessageId = await saveMessage({
  conversationId,
  senderType: 'iso_agent',
  senderIsoAgentId: isoAgentId,
  content: message,
  contentType: 'text',
});

// ... after agent execution ...

// Save assistant response
const assistantMessageId = await saveMessage({
  conversationId,
  senderType: 'ai_assistant',
  content: result.message,
  contentType: 'text',
  metadata: {
    toolResults: result.toolResults,
    tripId: result.tripId,
    deepLink: result.deepLink,
  },
});
```

#### 5.2 Message Loading
**Location**: `lib/conversation/message-persistence.ts:233-327`

Messages are loaded from the `messages` table and associated with requests:
- Linked via `request_id` foreign key
- Supports filtering by `quote_id` for operator threading
- Soft-delete support

#### 5.3 Session Loading on Page Load
**Location**: `app/page.tsx:51-150`

```typescript
// Fetch chat sessions from API
const response = await fetch('/api/chat-sessions', {...})

// Load messages for each session
const requestsResponse = await fetch('/api/requests?limit=50', {...})
const messagesByRequestId = requestsData.messages || {}

// Map messages to sessions
const sessionsWithMessages = sessions.map((session) => {
  if (!session.requestId) return session
  const messages = messagesMap.get(session.requestId)
  // ... transform messages
})
```

### Verified: Conversation History Properly Persisted

- User messages: ✅ Saved with `sender_type: 'iso_agent'`
- Agent messages: ✅ Saved with `sender_type: 'ai_assistant'`
- Tool results: ✅ Stored in message metadata
- Trip IDs: ✅ Linked to request record

---

## 6. Identified Issues & Breakpoints

### Issue 1: No Pre-Validation Before `create_trip`
**Location**: `agents/jetvision-agent/index.ts:161-198`

**Problem**: The agent executes tool calls immediately without validating that required fields are present.

**Impact**: If OpenAI generates a `create_trip` call with missing fields, it will be executed and likely fail at the Avinode API level.

**Recommendation**: Add pre-validation before tool execution:
```typescript
if (name === 'create_trip') {
  const required = ['departure_airport', 'arrival_airport', 'departure_date', 'passengers'];
  const missing = required.filter(f => !params[f]);
  if (missing.length > 0) {
    toolResults.push({
      name: name as ToolName,
      success: false,
      error: `Missing required fields: ${missing.join(', ')}`,
    });
    continue;
  }
}
```

### Issue 2: Airport Code Resolution Not Enforced
**Location**: `lib/prompts/jetvision-system-prompt.ts:144-154`

**Problem**: The system prompt instructs the agent to call `search_airports` for city names, but there's no code to enforce this.

**Impact**: Agent might call `create_trip` with city names ("Kansas City") instead of ICAO codes ("KMCI").

**Recommendation**: Add airport code format validation:
```typescript
if (name === 'create_trip') {
  const icaoPattern = /^[A-Z]{4}$/;
  if (!icaoPattern.test(params.departure_airport as string)) {
    // Return error or force search_airports
  }
}
```

### Issue 3: Conversation History Size Unbounded
**Location**: `app/api/chat/route.ts:30-36`

**Problem**: `conversationHistory` array has no size limit in the schema.

```typescript
const ChatRequestSchema = z.object({
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
});
```

**Impact**: Long conversations could exceed OpenAI's context window or cause performance issues.

**Recommendation**: Add truncation or summarization for long histories.

### Issue 4: No State Machine for RFP Flow
**Location**: `lib/conversation/rfp-flow.ts` (exists but not integrated)

**Problem**: The `RFPFlow` state machine exists but is **not used** in the main agent execution path.

**Evidence**: Searching the codebase shows no imports of `RFPFlow` in `agents/jetvision-agent/index.ts`.

**Impact**: The progressive disclosure pattern relies entirely on LLM behavior, not programmatic state tracking.

**Recommendation**: Integrate `RFPFlow` into the agent to track which fields have been collected.

### Issue 5: Intent Detection May Miss Edge Cases
**Location**: `lib/prompts/intent-prompts.ts:265-321`

**Problem**: Intent patterns are regex-based and may miss natural language variations.

**Examples that might not match**:
- "Can you book me a jet?" (missing "trip/flight/charter" keywords)
- "I want to go from New York to LA" (no "book/request/fly" keywords)

**Recommendation**: Consider adding embeddings-based intent classification or more comprehensive patterns.

---

## 7. Recommendations Summary

### High Priority

1. **Add Pre-Validation for `create_trip`**
   - File: `agents/jetvision-agent/index.ts`
   - Add required field validation before executing the tool

2. **Integrate RFPFlow State Machine**
   - Files: `agents/jetvision-agent/index.ts`, `lib/conversation/rfp-flow.ts`
   - Track collected fields programmatically, not just via LLM

3. **Add Airport Code Validation**
   - File: `agents/jetvision-agent/index.ts`
   - Validate ICAO format before calling `create_trip`

### Medium Priority

4. **Bound Conversation History Size**
   - File: `app/api/chat/route.ts`
   - Add max history length (e.g., last 20 messages)

5. **Improve Intent Detection**
   - File: `lib/prompts/intent-prompts.ts`
   - Add more pattern variations or use embeddings

### Low Priority

6. **Add Logging for Intent Detection**
   - Track which intents are detected vs. missed for analytics

7. **Add Unit Tests for Multi-Turn Scenarios**
   - Test conversation continuity edge cases

---

## 8. Code Location Reference

| Component | File | Key Functions |
|-----------|------|---------------|
| Agent Entry | `agents/jetvision-agent/index.ts` | `JetvisionAgent.execute()` |
| Tool Definitions | `agents/jetvision-agent/tools.ts` | `AVINODE_TOOLS`, `ALL_TOOLS` |
| Tool Executor | `agents/jetvision-agent/tool-executor.ts` | `ToolExecutor.execute()` |
| System Prompt | `lib/prompts/jetvision-system-prompt.ts` | `buildCompleteSystemPrompt()` |
| Intent Prompts | `lib/prompts/intent-prompts.ts` | `detectIntentWithHistory()` |
| Message Persistence | `lib/conversation/message-persistence.ts` | `saveMessage()`, `loadMessages()` |
| RFP State Machine | `lib/conversation/rfp-flow.ts` | `RFPFlow` class (unused) |
| Chat API | `app/api/chat/route.ts` | `POST` handler |
| Chat UI | `components/chat-interface.tsx` | `ChatInterface` component |

---

## Appendix: System Prompt Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMPLETE SYSTEM PROMPT                      │
├─────────────────────────────────────────────────────────────────┤
│ IDENTITY (~40 lines)                                            │
│ - Role: AI assistant for ISO agents                             │
│ - Behavioral guidelines (concise, professional, proactive)      │
│ - UI awareness (avoid redundancy)                               │
├─────────────────────────────────────────────────────────────────┤
│ TOOL_REFERENCE (~40 lines)                                      │
│ - 8 Avinode tools                                               │
│ - 12 Database tools                                             │
│ - 3 Gmail tools                                                 │
├─────────────────────────────────────────────────────────────────┤
│ SCENARIO_HANDLERS (~350 lines)                                  │
│ - 12 decision trees for different intents                       │
│ - Multi-turn handling instructions                              │
│ - Airport code resolution                                       │
│ - "Please continue" handling                                    │
├─────────────────────────────────────────────────────────────────┤
│ RESPONSE_FORMATS (~100 lines)                                   │
│ - Templates for each scenario type                              │
│ - UI awareness guidelines                                       │
├─────────────────────────────────────────────────────────────────┤
│ CONTEXT_RULES (~50 lines)                                       │
│ - Track active trip                                             │
│ - Remember client context                                       │
│ - Maintain intent continuity                                    │
│ - Handle relative references                                    │
├─────────────────────────────────────────────────────────────────┤
│ ERROR_HANDLING (~30 lines)                                      │
│ - Error types and recovery actions                              │
├─────────────────────────────────────────────────────────────────┤
│ AIRPORT_REFERENCE (~30 lines)                                   │
│ - Common US airport ICAO codes                                  │
└─────────────────────────────────────────────────────────────────┘
             │
             │ Intent detected → Append intent-specific prompt
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ INTENT_PROMPTS[intent] (e.g., create_rfp)                       │
│ - Task-specific checklist                                       │
│ - Multi-turn extraction guidance                                │
│ - Response template                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

*Generated by Claude Code Analysis - 2026-01-27*
