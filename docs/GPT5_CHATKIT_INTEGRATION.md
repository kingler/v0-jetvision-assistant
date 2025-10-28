# GPT-5 and ChatKit Integration Guide

Complete guide for integrating GPT-5 Responses API with agents and ChatKit for frontend.

---

## GPT-5 Agent Configuration

### Recommended Settings by Agent Type

| Agent | Model | Reasoning Effort | Verbosity | Use Case |
|-------|-------|------------------|-----------|----------|
| **OrchestratorAgent** | `gpt-5` | `medium` | `medium` | RFP analysis, task planning, workflow orchestration |
| **ClientDataAgent** | `gpt-5-mini` | `minimal` | `low` | Simple data fetching from Google Sheets |
| **FlightSearchAgent** | `gpt-5` | `low` | `medium` | Flight search, data filtering, RFP creation |
| **ProposalAnalysisAgent** | `gpt-5` | `medium` | `medium` | Multi-criteria scoring, ranking logic |
| **CommunicationAgent** | `gpt-5` | `low` | `high` | Email generation with detailed content |
| **ErrorMonitorAgent** | `gpt-5-mini` | `minimal` | `low` | Error classification, retry logic |

### Configuration Examples

#### OrchestratorAgent (Complex Reasoning)

```typescript
const orchestrator = await factory.createAndInitialize({
  type: AgentType.ORCHESTRATOR,
  name: 'RFP Orchestrator',
  model: 'gpt-5',
  reasoning: {
    effort: 'medium'  // Balance between speed and thoroughness
  },
  text: {
    verbosity: 'medium'
  },
  maxOutputTokens: 4096,
})
```

#### ClientDataAgent (Fast, Simple Queries)

```typescript
const clientData = await factory.createAndInitialize({
  type: AgentType.CLIENT_DATA,
  name: 'Client Data Manager',
  model: 'gpt-5-mini',  // Cost-optimized
  reasoning: {
    effort: 'minimal'  // Fastest response
  },
  text: {
    verbosity: 'low'  // Concise output
  },
  maxOutputTokens: 2048,
})
```

#### CommunicationAgent (High Verbosity for Email Content)

```typescript
const communication = await factory.createAndInitialize({
  type: AgentType.COMMUNICATION,
  name: 'Communication Manager',
  model: 'gpt-5',
  reasoning: {
    effort: 'low'  // Fast email generation
  },
  text: {
    verbosity: 'high'  // Detailed, professional emails
  },
  maxOutputTokens: 8192,  // Longer emails
})
```

---

## GPT-5 API Changes

### Deprecated Parameters

⚠️ **Not supported in GPT-5:**
- ❌ `temperature`
- ❌ `top_p`
- ❌ `logprobs`

### New GPT-5 Parameters

✅ **Use instead:**
- `reasoning.effort` → `'minimal' | 'low' | 'medium' | 'high'`
- `text.verbosity` → `'low' | 'medium' | 'high'`
- `max_output_tokens` → Replaces `max_tokens`

### Responses API vs Chat Completions

**Before (Chat Completions):**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [...],
  temperature: 0.7,
  max_tokens: 4096,
})
```

**After (Responses API with GPT-5):**
```typescript
const response = await openai.responses.create({
  model: 'gpt-5',
  input: 'Your prompt here',
  reasoning: { effort: 'medium' },
  text: { verbosity: 'medium' },
  max_output_tokens: 4096,
})
```

---

## ChatKit Frontend Integration

### Overview

ChatKit is OpenAI's embeddable chat UI for agentic experiences. It provides:
- Pre-built chat widgets
- Chain-of-thought visualization
- File attachments support
- Tool invocation display
- Customizable themes

### Implementation Steps

#### 1. Create Agent Workflow

Use [Agent Builder](https://platform.openai.com/agent-builder) to create a workflow that connects your agents. You'll get a `workflow_id`.

#### 2. Server-Side Session Endpoint

Create an API endpoint to generate ChatKit sessions:

```typescript
// app/api/chatkit/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { deviceId } = await req.json()

    const session = await openai.chatkit.sessions.create({
      workflow: { id: process.env.CHATKIT_WORKFLOW_ID },
      user: deviceId,
    })

    return NextResponse.json({
      client_secret: session.client_secret,
    })
  } catch (error) {
    console.error('ChatKit session creation failed:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
```

#### 3. Install ChatKit React

```bash
npm install @openai/chatkit-react
```

#### 4. Add ChatKit Script

Add to `app/layout.tsx` or `pages/_document.tsx`:

```html
<script
  src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
  async
></script>
```

#### 5. Render ChatKit Component

```typescript
// components/ChatInterface.tsx
'use client'

import { ChatKit, useChatKit } from '@openai/chatkit-react'
import { useState, useEffect } from 'react'

export function ChatInterface() {
  const [deviceId, setDeviceId] = useState<string>('')

  useEffect(() => {
    // Generate or retrieve device ID
    const id = localStorage.getItem('deviceId') || crypto.randomUUID()
    localStorage.setItem('deviceId', id)
    setDeviceId(id)
  }, [])

  const { control } = useChatKit({
    api: {
      async getClientSecret(existing) {
        if (existing) {
          // Implement session refresh if needed
          return existing
        }

        const res = await fetch('/api/chatkit/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        })

        const { client_secret } = await res.json()
        return client_secret
      },
    },
  })

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <ChatKit
        control={control}
        className="h-[600px] w-[400px] rounded-lg shadow-xl"
      />
    </div>
  )
}
```

#### 6. Custom Theming (Optional)

```typescript
const { control } = useChatKit({
  api: { getClientSecret },
  theme: {
    primaryColor: '#0066cc',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    borderRadius: '12px',
  },
})
```

---

## Environment Variables

Add to `.env.local`:

```env
# GPT-5 API
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION_ID=org-...

# ChatKit
CHATKIT_WORKFLOW_ID=wf_...

# Existing vars
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Chain of Thought (CoT) Passing

GPT-5's key advantage: passing reasoning between turns reduces latency and improves intelligence.

### Multi-Turn Conversations

```typescript
// First turn
const response1 = await openai.responses.create({
  model: 'gpt-5',
  input: 'Analyze this RFP...',
  reasoning: { effort: 'medium' },
})

// Save response ID
const responseId = response1.id

// Second turn - passes CoT automatically
const response2 = await openai.responses.create({
  model: 'gpt-5',
  input: 'Based on the analysis, create tasks',
  previous_response_id: responseId,  // ← Chain of thought
  reasoning: { effort: 'low' },
})
```

### In BaseAgent

The `createResponse` method already supports this:

```typescript
protected async createResponse(input: string, context?: AgentContext) {
  const response = await (this.openai as any).responses.create({
    model: this.config.model || 'gpt-5',
    input,
    reasoning: { effort: this.config.reasoning?.effort || 'medium' },
    text: { verbosity: this.config.text?.verbosity || 'medium' },
    // Automatically pass previous CoT if available
    ...(context?.metadata?.previousResponseId && {
      previous_response_id: context.metadata.previousResponseId,
    }),
  })
  return response
}
```

---

## Tool Calling with GPT-5

### Custom Tools (Freeform Input)

GPT-5 supports sending raw text to tools (not just JSON):

```typescript
{
  type: 'custom',
  custom: {
    name: 'code_exec',
    description: 'Executes arbitrary Python code',
  }
}
```

### Allowed Tools (Subset Control)

Restrict which tools can be used in a specific context:

```typescript
tool_choice: {
  type: 'allowed_tools',
  mode: 'auto',  // or 'required'
  tools: [
    { type: 'function', name: 'search_flights' },
    { type: 'function', name: 'create_rfp' },
  ]
}
```

---

## Migration Checklist

- [ ] Update `AgentConfig` types with GPT-5 parameters
- [ ] Update `BaseAgent` with `createResponse()` method
- [ ] Configure each agent with appropriate reasoning/verbosity
- [ ] Remove `temperature` and `top_p` from agent configs
- [ ] Create ChatKit workflow in Agent Builder
- [ ] Implement `/api/chatkit/session` endpoint
- [ ] Install `@openai/chatkit-react`
- [ ] Add ChatKit script to layout
- [ ] Render ChatKit component in frontend
- [ ] Test GPT-5 agents with Responses API
- [ ] Test ChatKit integration with agents
- [ ] Update documentation and examples

---

## Benefits

### GPT-5 for Agents
✅ Better reasoning for complex tasks
✅ Optimized for coding and tool calling
✅ Chain of thought reduces latency
✅ Lower cost with mini/nano variants
✅ Customizable reasoning depth

### ChatKit for Frontend
✅ Pre-built chat UI (no reinventing)
✅ Chain of thought visualization
✅ Tool invocation display
✅ File attachments support
✅ Customizable themes
✅ OpenAI-hosted backend (optional)

---

## Resources

**GPT-5:**
- [GPT-5 Documentation](https://platform.openai.com/docs/guides/gpt-5)
- [Responses API Guide](https://platform.openai.com/docs/api-reference/responses)
- [GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)

**ChatKit:**
- [ChatKit Documentation](https://openai.github.io/chatkit-python)
- [ChatKit React SDK](https://github.com/openai/chatkit-js)
- [ChatKit Demo (chatkit.world)](https://chatkit.world)
- [Widget Builder](https://widgets.chatkit.studio)
- [Starter App](https://github.com/openai/openai-chatkit-starter-app)

**Agent Builder:**
- [Agent Builder Guide](https://platform.openai.com/docs/guides/agent-builder)
- [Agent Workflow Design](https://platform.openai.com/agent-builder)
