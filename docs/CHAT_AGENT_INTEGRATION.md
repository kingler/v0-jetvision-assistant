# Chat-Agent Integration Guide

**Complete guide to integrating the chat interface with the Main Agent Orchestrator**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Core Components](#core-components)
5. [Usage Examples](#usage-examples)
6. [Advanced Topics](#advanced-topics)
7. [API Reference](#api-reference)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The chat-agent integration provides a natural language interface for users to interact with the JetVision multi-agent system. Instead of filling out forms, users can simply describe their flight requirements in plain language, and the AI agents handle the rest.

### Key Features

- **Natural Language Processing**: Users interact via conversational chat
- **Intent Classification**: Automatically detects what the user wants to do
- **Entity Extraction**: Extracts flight details from user messages
- **Real-time Updates**: Live workflow and quote status updates
- **Multi-Agent Coordination**: Seamless handoffs between specialized agents
- **Structured Responses**: Rich data display (quotes, proposals, workflow status)

---

## Architecture

### High-Level Flow

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Chat UI    │────────▶│  Chat Service    │────────▶│  Orchestrator   │
│  Component  │         │                  │         │  Agent          │
│             │◀────────│  - Intent Class  │◀────────│                 │
│  (React)    │         │  - Entity Extract│         │  (AI)           │
└─────────────┘         │  - Response      │         └─────────────────┘
                        │    Formatting    │                  │
                        └──────────────────┘                  │
                                  │                           ▼
                                  │              ┌─────────────────────┐
                                  │              │  Specialized Agents │
                                  │              ├─────────────────────┤
                                  └──────────────│ • Client Data       │
                                                 │ • Flight Search     │
                                                 │ • Proposal Analysis │
                                                 │ • Communication     │
                                                 └─────────────────────┘
```

### Component Layers

1. **UI Layer** (`components/chat-interface.tsx`)
   - React components
   - User input handling
   - Message display
   - Response rendering

2. **Hook Layer** (`hooks/use-chat-agent.ts`)
   - React integration
   - State management
   - Subscription handling

3. **Service Layer** (`lib/services/chat-agent-service.ts`)
   - Chat-agent communication
   - Intent classification
   - Entity extraction
   - Response formatting

4. **Agent Layer** (`agents/implementations/`)
   - Orchestrator agent
   - Specialized agents
   - Tool execution

---

## Quick Start

### 1. Install Dependencies

```bash
npm install openai uuid eventemitter3
npm install -D @types/uuid
```

### 2. Set Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-your-key-here
```

### 3. Basic Usage in React Component

```tsx
import { useChatAgent } from '@/hooks/use-chat-agent'

export function ChatComponent() {
  const { messages, sendMessage, isProcessing } = useChatAgent({
    sessionId: 'session-123',
    userId: 'user-456',
  })

  const handleSend = async () => {
    await sendMessage("Book a flight from JFK to LAX on Dec 15 for 4 passengers")
  }

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={handleSend} disabled={isProcessing}>
        Send
      </button>
    </div>
  )
}
```

---

## Core Components

### 1. ChatAgentService

**Location**: `lib/services/chat-agent-service.ts`

**Purpose**: Main service layer for chat-agent communication

**Key Methods**:

```typescript
class ChatAgentService {
  // Send message to orchestrator
  async sendMessage(request: ChatAgentRequest): Promise<ChatAgentResponse>

  // Get workflow status
  async getWorkflowStatus(workflowId: string): Promise<WorkflowState>

  // Subscribe to real-time updates
  subscribeToWorkflow(workflowId: string, callback: Function): UnsubscribeFn
  subscribeToQuotes(rfpId: string, callback: Function): UnsubscribeFn

  // Session management
  async createSession(userId: string): Promise<ChatSession>
  async getSessionHistory(sessionId: string): Promise<ChatSession>
}
```

**Example**:

```typescript
import { chatAgentService } from '@/lib/services/chat-agent-service'

// Send a message
const response = await chatAgentService.sendMessage({
  sessionId: 'session-123',
  userId: 'user-456',
  messageId: 'msg-001',
  content: 'Book a flight from JFK to LAX',
  context: {
    previousMessages: [],
  },
})

console.log(response.content) // Agent's response
console.log(response.intent)  // ChatIntent.CREATE_RFP
console.log(response.data)     // Structured data (RFP, workflow, etc.)
```

### 2. useChatAgent Hook

**Location**: `hooks/use-chat-agent.ts`

**Purpose**: React integration for chat-agent service

**API**:

```typescript
const {
  // State
  messages,         // ChatMessage[] - All messages in conversation
  isProcessing,     // boolean - Is agent processing?
  currentWorkflow,  // WorkflowState | null - Current RFP workflow
  session,          // ChatSession | null - Current session

  // Actions
  sendMessage,      // (content: string, intent?: ChatIntent) => Promise<void>
  clearMessages,    // () => void
  loadSession,      // (sessionId: string) => Promise<void>
  createNewSession, // () => Promise<void>
} = useChatAgent({
  sessionId: 'session-123',
  userId: 'user-456',
  onWorkflowUpdate: (workflow) => console.log(workflow),
  onQuotesUpdate: (quotes) => console.log(quotes),
  onError: (error) => console.error(error),
})
```

### 3. Type Definitions

**Location**: `lib/types/chat-agent.ts`

**Key Types**:

```typescript
// Chat intents
enum ChatIntent {
  CREATE_RFP = 'create_rfp',
  GET_RFP_STATUS = 'get_rfp_status',
  SEARCH_FLIGHTS = 'search_flights',
  GET_QUOTES = 'get_quotes',
  // ... more intents
}

// Chat message
interface ChatMessage {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  intent?: ChatIntent
  responseType?: ChatResponseType
  data?: ChatResponseData      // Structured data
  suggestedActions?: SuggestedAction[]
}

// Agent response data
interface ChatResponseData {
  rfp?: RFPData               // Created/updated RFP
  quotes?: QuoteData[]        // Received quotes
  workflowState?: WorkflowState  // Workflow status
  searchResults?: SearchResult[] // Search results
  clientInfo?: ClientData     // Client information
}
```

---

## Usage Examples

### Example 1: Basic RFP Creation

```tsx
import { useChatAgent } from '@/hooks/use-chat-agent'

export function CreateRFPExample() {
  const { sendMessage, messages, isProcessing } = useChatAgent({
    sessionId: 'demo-session',
    userId: 'user-123',
  })

  const handleQuickRFP = async () => {
    await sendMessage(
      "I need to book a flight for my client John Smith from " +
      "New York (JFK) to Los Angeles (LAX) on December 15th for 4 passengers"
    )
  }

  return (
    <div>
      <button onClick={handleQuickRFP} disabled={isProcessing}>
        Create RFP
      </button>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-${msg.type}`}>
            <p>{msg.content}</p>

            {/* Show RFP data if present */}
            {msg.data?.rfp && (
              <div className="rfp-card">
                <h4>RFP Created: {msg.data.rfp.id}</h4>
                <p>Route: {msg.data.rfp.departureAirport} → {msg.data.rfp.arrivalAirport}</p>
                <p>Passengers: {msg.data.rfp.passengers}</p>
              </div>
            )}

            {/* Show workflow if present */}
            {msg.data?.workflowState && (
              <WorkflowDisplay workflow={msg.data.workflowState} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Example 2: Real-time Workflow Updates

```tsx
import { useChatAgent } from '@/hooks/use-chat-agent'
import { useState } from 'react'
import type { WorkflowState } from '@/lib/types/chat-agent'

export function WorkflowTrackingExample() {
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowState | null>(null)

  const { sendMessage } = useChatAgent({
    sessionId: 'workflow-session',
    userId: 'user-123',
    onWorkflowUpdate: (workflow) => {
      console.log('Workflow updated:', workflow.currentStage)
      setCurrentWorkflow(workflow)
    },
  })

  return (
    <div>
      {currentWorkflow && (
        <div className="workflow-status">
          <h3>Workflow Progress</h3>
          <div className="progress-bar">
            <div style={{ width: `${currentWorkflow.progress}%` }} />
          </div>
          <p>Current Stage: {currentWorkflow.currentStage}</p>
          <p>Est. Time Remaining: {currentWorkflow.estimatedTimeRemaining}s</p>
        </div>
      )}
    </div>
  )
}
```

### Example 3: Quote Comparison

```tsx
import { useChatAgent } from '@/hooks/use-chat-agent'
import { useState } from 'react'
import type { QuoteData } from '@/lib/types/chat-agent'

export function QuoteComparisonExample() {
  const [quotes, setQuotes] = useState<QuoteData[]>([])

  const { sendMessage, messages } = useChatAgent({
    sessionId: 'quotes-session',
    userId: 'user-123',
    onQuotesUpdate: (newQuotes) => {
      console.log('Received quotes:', newQuotes.length)
      setQuotes(newQuotes)
    },
  })

  return (
    <div>
      <h3>Available Quotes</h3>
      <div className="quotes-grid">
        {quotes.map((quote) => (
          <div key={quote.id} className="quote-card">
            <h4>{quote.operatorName}</h4>
            <p>{quote.aircraftType}</p>
            <p className="price">${quote.price.toLocaleString()}</p>
            <p className="ai-score">AI Score: {quote.aiScore}/100</p>
            {quote.isRecommended && <span className="badge">Recommended</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Example 4: Multi-turn Conversation

```tsx
import { useChatAgent } from '@/hooks/use-chat-agent'

export function MultiTurnConversation() {
  const { sendMessage, messages, isProcessing } = useChatAgent({
    sessionId: 'conversation-session',
    userId: 'user-123',
  })

  // User: "Book a flight to Miami"
  // Agent: "I'd be happy to help! Could you provide the departure airport?"
  // User: "JFK"
  // Agent: "Great! When would you like to depart?"
  // User: "December 15th"
  // Agent: "How many passengers?"
  // User: "4 passengers"
  // Agent: "Perfect! Creating RFP..."

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-${msg.type}`}>
            {msg.content}

            {/* Show suggested actions if agent provides them */}
            {msg.suggestedActions && msg.suggestedActions.length > 0 && (
              <div className="quick-actions">
                {msg.suggestedActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => sendMessage(action.label, action.intent)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input area */}
      <input
        type="text"
        placeholder="Type your message..."
        disabled={isProcessing}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            sendMessage(e.currentTarget.value)
            e.currentTarget.value = ''
          }
        }}
      />
    </div>
  )
}
```

---

## Advanced Topics

### Custom Intent Classification

You can override the default intent classification:

```typescript
const { sendMessage } = useChatAgent({ ... })

// Explicitly set intent
await sendMessage(
  "Show me flights",
  ChatIntent.SEARCH_FLIGHTS  // Bypass auto-classification
)
```

### Handling Different Response Types

```typescript
messages.forEach((msg) => {
  switch (msg.responseType) {
    case ChatResponseType.RFP_CREATED:
      // Show RFP creation success
      renderRFPCreated(msg.data.rfp)
      break

    case ChatResponseType.QUOTES_RECEIVED:
      // Show quote comparison
      renderQuotes(msg.data.quotes)
      break

    case ChatResponseType.WORKFLOW_UPDATE:
      // Show workflow progress
      renderWorkflow(msg.data.workflowState)
      break

    case ChatResponseType.CLARIFICATION_NEEDED:
      // Show clarification questions
      renderClarification(msg.clarificationQuestions)
      break

    case ChatResponseType.ERROR:
      // Show error message
      renderError(msg.content)
      break
  }
})
```

### Session Persistence

```typescript
// Save session to localStorage
useEffect(() => {
  if (messages.length > 0) {
    localStorage.setItem(
      `chat-session-${sessionId}`,
      JSON.stringify({ messages, currentWorkflow })
    )
  }
}, [messages, currentWorkflow, sessionId])

// Load session on mount
useEffect(() => {
  const saved = localStorage.getItem(`chat-session-${sessionId}`)
  if (saved) {
    const { messages: savedMessages } = JSON.parse(saved)
    // Restore messages
  }
}, [sessionId])
```

---

## API Reference

### ChatAgentService

#### `sendMessage(request: ChatAgentRequest): Promise<ChatAgentResponse>`

Sends a user message to the agent orchestrator.

**Parameters**:
- `request.sessionId` (string) - Unique session identifier
- `request.userId` (string) - User identifier
- `request.messageId` (string) - Unique message ID
- `request.content` (string) - User's message content
- `request.intent` (ChatIntent, optional) - Explicit intent
- `request.entities` (ExtractedEntities, optional) - Pre-extracted entities
- `request.context` (object, optional) - Conversation context

**Returns**: `ChatAgentResponse` with agent's reply, intent, and structured data

**Example**:
```typescript
const response = await chatAgentService.sendMessage({
  sessionId: 'session-123',
  userId: 'user-456',
  messageId: 'msg-001',
  content: 'Book a flight from JFK to LAX',
})
```

#### `subscribeToWorkflow(workflowId: string, callback: Function): UnsubscribeFn`

Subscribe to real-time workflow updates.

**Parameters**:
- `workflowId` (string) - Workflow identifier
- `callback` (Function) - Called when workflow updates

**Returns**: Unsubscribe function

**Example**:
```typescript
const unsubscribe = chatAgentService.subscribeToWorkflow(
  'workflow-123',
  (workflow) => console.log('Stage:', workflow.currentStage)
)

// Later: unsubscribe()
```

---

## Testing

### Unit Tests

```typescript
// __tests__/unit/chat-agent-service.test.ts
import { chatAgentService } from '@/lib/services/chat-agent-service'
import { ChatIntent } from '@/lib/types/chat-agent'

describe('ChatAgentService', () => {
  it('classifies intent correctly', async () => {
    const response = await chatAgentService.sendMessage({
      sessionId: 'test-session',
      userId: 'test-user',
      messageId: 'test-msg',
      content: 'Book a flight from JFK to LAX',
    })

    expect(response.intent).toBe(ChatIntent.CREATE_RFP)
  })

  it('extracts entities from message', async () => {
    const response = await chatAgentService.sendMessage({
      sessionId: 'test-session',
      userId: 'test-user',
      messageId: 'test-msg',
      content: 'Flight from KJFK to KLAX on 2025-12-15 for 4 passengers',
    })

    expect(response.data?.rfp?.departureAirport).toBe('KJFK')
    expect(response.data?.rfp?.arrivalAirport).toBe('KLAX')
    expect(response.data?.rfp?.passengers).toBe(4)
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/chat-workflow.test.ts
import { chatAgentService } from '@/lib/services/chat-agent-service'

describe('Chat Workflow Integration', () => {
  it('completes full RFP creation flow', async () => {
    const sessionId = `test-${Date.now()}`

    // Step 1: Create RFP
    const response1 = await chatAgentService.sendMessage({
      sessionId,
      userId: 'test-user',
      messageId: 'msg-1',
      content: 'Book flight JFK to LAX Dec 15 for 4 passengers',
    })

    expect(response1.intent).toBe(ChatIntent.CREATE_RFP)
    expect(response1.data?.rfp).toBeDefined()

    // Step 2: Check status
    const response2 = await chatAgentService.sendMessage({
      sessionId,
      userId: 'test-user',
      messageId: 'msg-2',
      content: 'What is the status?',
    })

    expect(response2.intent).toBe(ChatIntent.GET_RFP_STATUS)
    expect(response2.data?.workflowState).toBeDefined()
  })
})
```

---

## Troubleshooting

### Common Issues

#### 1. "Intent classification returns UNKNOWN"

**Cause**: Message doesn't match any intent patterns

**Solution**:
- Add more keywords to intent classification
- Explicitly pass intent parameter
- Improve NLP model (future enhancement)

```typescript
// Explicit intent
await sendMessage("Show flights", ChatIntent.SEARCH_FLIGHTS)
```

#### 2. "Entities not extracted correctly"

**Cause**: Entity extraction regex patterns don't match

**Solution**:
- Use standardized formats (ICAO codes, ISO dates)
- Enhance extraction patterns in `chat-agent-service.ts`

```typescript
// Good format
"Flight from KJFK to KLAX on 2025-12-15"

// Bad format
"Flight from new york to la tomorrow"
```

#### 3. "Workflow updates not received"

**Cause**: Not subscribed to workflow updates

**Solution**:
- Ensure `onWorkflowUpdate` callback is provided
- Check workflow ID is correct

```typescript
const { currentWorkflow } = useChatAgent({
  sessionId: 'session-123',
  userId: 'user-456',
  onWorkflowUpdate: (workflow) => {
    console.log('Workflow update:', workflow)  // Add logging
  },
})
```

#### 4. "Agent response takes too long"

**Cause**: OpenAI API latency or complex processing

**Solution**:
- Add loading indicators
- Implement timeout handling
- Use streaming responses (future enhancement)

```typescript
const [timeout, setTimeout] = useState(false)

useEffect(() => {
  if (isProcessing) {
    const timer = setTimeout(() => setTimeout(true), 30000) // 30s timeout
    return () => clearTimeout(timer)
  }
}, [isProcessing])
```

---

## Next Steps

1. **Implement Streaming**: Add support for streaming responses for faster feedback
2. **Enhanced NLP**: Integrate more sophisticated NER (Named Entity Recognition)
3. **Voice Input**: Add speech-to-text for voice commands
4. **Rich Media**: Support image uploads, PDFs in chat
5. **Multi-language**: Add support for multiple languages

---

**For more information**:
- [Multi-Agent System Documentation](./MULTI_AGENT_SYSTEM.md)
- [PRD - Product Requirements](./PRD.md)
- [API Reference](./API_REFERENCE.md)
