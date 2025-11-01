# OpenAI Responses API, Agents SDK, and ChatKit Integration

**Implementation Summary and Guide**

---

## Executive Summary

This document summarizes the implementation of OpenAI's modern AI technologies into the Jetvision Assistant project:

1. **Responses API with Streaming**: Real-time token-by-token AI responses using Server-Sent Events
2. **Tool Call Indicators**: Visual progress tracking for MCP server and function invocations
3. **Client-Side Streaming**: React hook for consuming SSE streams with abort control
4. **Future Integrations**: ChatKit UI components and hosted MCP servers

---

## Research Findings

### 1. OpenAI Responses API (Released May 2025)

**Purpose**: Stateful primitive replacing Assistants API with streaming and hosted MCP server support

**Key Features**:
- ✅ **Streaming**: Built-in SSE for real-time token delivery
- ✅ **Hosted MCP Tools**: Direct integration with MCP servers on OpenAI infrastructure
- ✅ **Lower Latency**: Fewer round-trips compared to Assistants API
- ✅ **Same Pricing**: No additional costs beyond token usage
- ✅ **Model Support**: GPT-4o series, GPT-4.1 series, o-series

**vs Assistants API**:
| Feature | Responses API | Assistants API |
|---------|---------------|----------------|
| Streaming | ✅ Native | ✅ Available |
| MCP Integration | ✅ Hosted | ❌ Manual |
| Latency | ⚡ Lower | Standard |
| Pricing | 💰 Token-only | 💰 Tokens + Tools |
| Future | ✅ Active | ⚠️ Sunset H1 2026 |

### 2. OpenAI Agents SDK (TypeScript)

**Purpose**: Lightweight framework for multi-agent orchestration

**Key Primitives**:
- **Handoffs**: Transfer control between agents
- **Guardrails**: Parallel input/output validation
- **Sessions**: Context management with dependency injection
- **Tracing**: Built-in observability
- **MCP Native**: First-class Model Context Protocol support

**Compatibility**: Works alongside existing Jetvision BaseAgent architecture

### 3. OpenAI ChatKit (React)

**Purpose**: Production-ready embeddable chat UI

**Features**:
- 🎨 **Theming**: Light/dark modes, custom colors, spacing
- ⚡ **Streaming Display**: Real-time token rendering
- 🔧 **Tool Visualization**: Built-in tool call indicators
- 🔐 **Secure Sessions**: Server-side session management
- 📱 **Responsive**: Works on all devices

---

## Implementation Status

### ✅ Phase 1: Research & Planning (COMPLETE)
- [x] Research OpenAI Responses API
- [x] Research Agents SDK for TypeScript
- [x] Research ChatKit React components
- [x] Create implementation plan
- [x] Create Linear issues (ONEK-52 to ONEK-58)

### ✅ Phase 2a: Streaming API Endpoint (COMPLETE)
- [x] **File**: `app/api/chat/respond/route.ts`
- [x] Server-Sent Events (SSE) streaming
- [x] OpenAI Chat Completions with streaming
- [x] Tool call detection and progress tracking
- [x] Clerk authentication integration
- [x] Error handling and abort support

**What It Does**:
```typescript
POST /api/chat/respond
{
  "sessionId": "session-123",
  "messageId": "msg-456",
  "content": "Book a flight from JFK to LAX",
  "intent": "create_rfp",
  "context": { /* ... */ }
}

// Returns SSE stream:
data: {"type":"token","data":{"token":"I"}}
data: {"type":"token","data":{"token":"'ll"}}
data: {"type":"tool_call_start","data":{"toolCallId":"call_123","toolName":"create_rfp"}}
data: {"type":"tool_call_complete","data":{...}}
data: {"type":"complete","data":{...}}
```

### ✅ Phase 2b: Client-Side Streaming Hook (COMPLETE)
- [x] **File**: `hooks/use-streaming-response.ts`
- [x] SSE connection management
- [x] Token-by-token state updates
- [x] Abort controller for "stop generating"
- [x] Tool call event handling
- [x] Automatic reconnection logic

**Usage Example**:
```typescript
import { useStreamingResponse } from '@/hooks/use-streaming-response';

function ChatComponent() {
  const {
    content,           // Accumulated response text
    isStreaming,       // Boolean: currently streaming?
    toolCalls,         // Array of tool invocations
    stopStreaming,     // Function to abort
    startStreaming,    // Function to initiate
  } = useStreamingResponse({
    endpoint: '/api/chat/respond',
    onToken: (token) => console.log(token),
    onComplete: () => console.log('Done!'),
  });

  const handleSend = () => {
    startStreaming({
      sessionId: 'session-123',
      messageId: `msg-${Date.now()}`,
      content: userInput,
    });
  };

  return (
    <div>
      <div>{content}</div>
      {isStreaming && (
        <button onClick={stopStreaming}>Stop Generating</button>
      )}
    </div>
  );
}
```

### ✅ Phase 2c: Tool Call Indicators (COMPLETE)
- [x] **File**: `components/tool-call-indicator.tsx`
- [x] Lucide icon mapping for tool types
- [x] Progress states: starting, in-progress, complete, error
- [x] Collapsible details (arguments, results)
- [x] Compact and full views
- [x] Dark mode support

**Tool Icon Mapping**:
| Tool | Icon | Color |
|------|------|-------|
| `create_rfp` | FileText | Blue |
| `search_flights` | Plane | Purple |
| `get_rfp_status` | Clock | Blue |
| `search_clients` | Users | Green |
| `send_email` | Mail | Orange |
| `analyze_quotes` | TrendingUp | Purple |

**Usage Example**:
```typescript
import { ToolCallIndicator, ToolCallList } from '@/components/tool-call-indicator';

function ChatMessage({ toolCalls }) {
  return (
    <div>
      <ToolCallList
        toolCalls={toolCalls}
        showDetails={true}
      />
    </div>
  );
}
```

### 🚧 Phase 3: Hosted MCP Servers (PENDING - ONEK-55)
**Goal**: Convert stdio MCP servers to HTTP+SSE for hosting

**Next Steps**:
1. Convert `mcp-servers/supabase-mcp-server` to HTTP transport
2. Add Express endpoints: `/tools/list`, `/tools/call`
3. Deploy to Vercel Edge Functions
4. Update API route to use hosted MCP tools
5. Repeat for Google Sheets, Gmail, Avinode servers

**Hosted Tool Configuration**:
```typescript
{
  type: 'mcp',
  mcp: {
    server: 'supabase-mcp',
    connector: {
      url: 'https://jetvision-mcp-supabase.vercel.app',
      headers: {
        'Authorization': 'Bearer ${MCP_AUTH_TOKEN}'
      }
    }
  }
}
```

### 🚧 Phase 4: BaseAgent Update (PENDING - ONEK-57)
**Goal**: Add Responses API support to BaseAgent

**Planned Changes**:
```typescript
// agents/core/base-agent.ts

protected async createResponse(
  input: string,
  context?: AgentContext,
  streaming?: boolean
): Promise<ResponsesAPIResponse> {
  // Call OpenAI Responses API
  // Support streaming mode
  // Handle hosted MCP tools
}

// agents/core/types.ts
interface AgentConfig {
  // ... existing fields

  responsesAPI?: {
    enabled: boolean;
    streaming?: boolean;
    hostedMCP?: {
      servers: string[];
      authToken?: string;
    };
  };
}
```

### 🚧 Phase 5: ChatKit Integration (PENDING - ONEK-56)
**Goal**: Integrate OpenAI ChatKit React components

**Planned Implementation**:
1. Install `@openai/chatkit-react`
2. Create Agent Builder workflow (get workflow_id)
3. Create `/api/chatkit/session` endpoint
4. Integrate `<ChatKit />` component
5. Custom theming for Jetvision brand
6. Feature flag for A/B testing

**Endpoint Structure**:
```typescript
// app/api/chatkit/session/route.ts
export async function POST(req: NextRequest) {
  const { deviceId } = await req.json();

  const session = await openai.chatkit.sessions.create({
    workflow: { id: process.env.CHATKIT_WORKFLOW_ID },
    user: deviceId,
  });

  return NextResponse.json({
    client_secret: session.client_secret,
  });
}
```

**Component Usage**:
```typescript
import { ChatKit, useChatKit } from '@openai/chatkit-react';

export function ChatInterfaceChatKit() {
  const { control } = useChatKit({
    api: {
      async getClientSecret() {
        const res = await fetch('/api/chatkit/session', {
          method: 'POST',
          body: JSON.stringify({ deviceId }),
        });
        const { client_secret } = await res.json();
        return client_secret;
      },
    },
    theme: {
      primaryColor: '#0066cc', // Jetvision blue
      borderRadius: '12px',
    },
  });

  return <ChatKit control={control} className="h-[600px]" />;
}
```

### 🚧 Phase 6: Testing (PENDING - ONEK-58)
**Goal**: Comprehensive test coverage

**Test Plan**:
- [ ] Unit tests: SSE parsing, streaming hook, tool indicators
- [ ] Integration tests: End-to-end RFP creation
- [ ] E2E tests: Full user journey with Playwright
- [ ] Performance benchmarks: Latency, memory usage

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│                                                              │
│  ┌──────────────────┐        ┌────────────────────┐        │
│  │ Chat UI          │◄───────│ useStreamingResponse│        │
│  │ Component        │        │ Hook                │        │
│  └────────┬─────────┘        └─────────┬──────────┘        │
│           │                             │                    │
│           │  Send Message               │  SSE Stream        │
│           ▼                             ▼                    │
│  ┌────────────────────────────────────────────────┐         │
│  │         Tool Call Indicators                    │         │
│  │  • create_rfp → FileText icon                  │         │
│  │  • search_flights → Plane icon                 │         │
│  │  • Progress states with animations             │         │
│  └────────────────────────────────────────────────┘         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTPS POST + SSE
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Server (Next.js API Routes)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  POST /api/chat/respond                                │ │
│  │  • Clerk authentication                                 │ │
│  │  • OpenAI streaming integration                        │ │
│  │  • SSE message formatting                              │ │
│  │  • Tool call detection                                 │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  OpenAI Chat Completions API (streaming)               │ │
│  │  • model: gpt-4o                                       │ │
│  │  • stream: true                                         │ │
│  │  • tools: [function definitions]                       │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ (Future: Hosted MCP)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Hosted MCP Servers (Phase 3)                    │
│  • Supabase MCP → Vercel Edge Function                      │
│  • Google Sheets MCP → Vercel Edge Function                 │
│  • Gmail MCP → Vercel Edge Function                         │
│  • Avinode MCP → Vercel Edge Function                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration with Existing Code

### Chat Interface Integration

**Current State**: `components/chat-interface.tsx` uses mock workflow simulation

**Integration Steps**:
1. Replace `simulateWorkflowProgress` with `useStreamingResponse` hook
2. Display tool calls using `<ToolCallList />` component
3. Add "Stop Generating" button connected to `stopStreaming()`

**Example**:
```typescript
// components/chat-interface.tsx (updated)
import { useStreamingResponse } from '@/hooks/use-streaming-response';
import { ToolCallList } from '@/components/tool-call-indicator';

export function ChatInterface({ activeChat, ... }) {
  const {
    content,
    isStreaming,
    toolCalls,
    stopStreaming,
    startStreaming,
  } = useStreamingResponse({
    onToken: (token) => {
      // Update message in real-time
    },
    onComplete: () => {
      // Mark workflow as complete
    },
  });

  const handleSendMessage = async () => {
    await startStreaming({
      sessionId: activeChat.id,
      messageId: `msg-${Date.now()}`,
      content: inputValue,
    });
  };

  return (
    <div>
      {/* Messages */}
      {messages.map((msg) => (
        <div key={msg.id}>
          <p>{msg.content}</p>

          {/* Show tool calls for this message */}
          {msg.toolCalls && (
            <ToolCallList toolCalls={msg.toolCalls} />
          )}
        </div>
      ))}

      {/* Current streaming message */}
      {isStreaming && (
        <div>
          <p>{content}</p>
          <ToolCallList toolCalls={toolCalls} />
          <button onClick={stopStreaming}>Stop Generating</button>
        </div>
      )}
    </div>
  );
}
```

### Agent Service Integration

**Current State**: `lib/services/chat-agent-service.ts` uses mock responses

**Integration Steps**:
1. Keep existing intent classification logic
2. Replace `handleCreateRFP()` etc. with actual API calls
3. Use streaming endpoint for all agent responses

**Example**:
```typescript
// lib/services/chat-agent-service.ts (updated)
async sendMessage(request: ChatAgentRequest): Promise<ChatAgentResponse> {
  // Step 1: Classify intent (keep existing logic)
  const intent = await this.classifyIntent(request.content);

  // Step 2: NEW - Call streaming endpoint
  // (Client-side will use useStreamingResponse hook instead)
  // This method can return initial response metadata

  return {
    messageId: request.messageId,
    content: '', // Will be populated by streaming
    intent: intent.intent,
    responseType: ChatResponseType.STREAMING,
    metadata: {
      streamEndpoint: '/api/chat/respond',
      processingTime: 0,
    },
  };
}
```

---

## Environment Variables

Add to `.env.local`:

```env
# OpenAI (existing)
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION_ID=org-...

# ChatKit (Phase 5)
CHATKIT_WORKFLOW_ID=wf_...

# Hosted MCP Servers (Phase 3)
MCP_AUTH_TOKEN=...
MCP_SUPABASE_URL=https://jetvision-mcp-supabase.vercel.app
MCP_GOOGLE_SHEETS_URL=https://jetvision-mcp-sheets.vercel.app
MCP_GMAIL_URL=https://jetvision-mcp-gmail.vercel.app
MCP_AVINODE_URL=https://jetvision-mcp-avinode.vercel.app
```

---

## Testing Strategy

### Unit Tests

**Streaming Hook** (`__tests__/unit/hooks/use-streaming-response.test.ts`):
```typescript
import { renderHook, act } from '@testing-library/react';
import { useStreamingResponse } from '@/hooks/use-streaming-response';

describe('useStreamingResponse', () => {
  it('accumulates tokens from SSE stream', async () => {
    const { result } = renderHook(() => useStreamingResponse());

    // Mock SSE endpoint
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: mockSSEStream([
        'data: {"type":"token","data":{"token":"Hello"}}\n\n',
        'data: {"type":"token","data":{"token":" World"}}\n\n',
        'data: {"type":"complete","data":{}}\n\n',
      ]),
    });

    await act(async () => {
      await result.current.startStreaming({ content: 'Test' });
    });

    expect(result.current.content).toBe('Hello World');
    expect(result.current.state).toBe('completed');
  });

  it('handles abort controller', async () => {
    const { result } = renderHook(() => useStreamingResponse());

    await act(async () => {
      result.current.startStreaming({ content: 'Test' });
      result.current.stopStreaming(); // Abort mid-stream
    });

    expect(result.current.state).toBe('idle');
  });
});
```

**Tool Call Indicator** (`__tests__/unit/components/tool-call-indicator.test.tsx`):
```typescript
import { render, screen } from '@testing-library/react';
import { ToolCallIndicator } from '@/components/tool-call-indicator';

describe('ToolCallIndicator', () => {
  it('renders starting state', () => {
    render(
      <ToolCallIndicator
        toolCall={{
          id: 'call-1',
          name: 'create_rfp',
          status: 'starting',
        }}
      />
    );

    expect(screen.getByText('Create RFP')).toBeInTheDocument();
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('shows tool arguments when expanded', async () => {
    const { user } = render(
      <ToolCallIndicator
        toolCall={{
          id: 'call-1',
          name: 'create_rfp',
          status: 'complete',
          arguments: { departureAirport: 'JFK', arrivalAirport: 'LAX' },
        }}
      />
    );

    const expandButton = screen.getByLabelText('Expand details');
    await user.click(expandButton);

    expect(screen.getByText(/JFK/)).toBeInTheDocument();
    expect(screen.getByText(/LAX/)).toBeInTheDocument();
  });
});
```

### Integration Tests

**End-to-End RFP Creation** (`__tests__/integration/streaming-rfp-creation.test.ts`):
```typescript
import { chatAgentService } from '@/lib/services/chat-agent-service';

describe('Streaming RFP Creation', () => {
  it('creates RFP with streaming response', async () => {
    const sessionId = `test-${Date.now()}`;

    // Start streaming request
    const response = await fetch('/api/chat/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messageId: 'msg-1',
        content: 'Book flight JFK to LAX on Dec 15 for 4 passengers',
      }),
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let toolCallDetected = false;
    let completionDetected = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      if (chunk.includes('tool_call_start')) toolCallDetected = true;
      if (chunk.includes('complete')) completionDetected = true;
    }

    expect(toolCallDetected).toBe(true);
    expect(completionDetected).toBe(true);
  });
});
```

---

## Performance Benchmarks

**Target Metrics**:
- ⚡ First token latency: < 500ms
- ⚡ Full response: < 5s for typical queries
- ⚡ Tool call invocation: < 1s
- 📊 Memory usage: Stable during long conversations
- 🔄 Reconnection time: < 2s after network error

**Monitoring**:
```typescript
// Add to streaming hook
const startTime = Date.now();

onComplete: () => {
  const latency = Date.now() - startTime;
  console.log(`Response latency: ${latency}ms`);

  // Send to analytics
  analytics.track('streaming_response_complete', { latency });
};
```

---

## Security Considerations

### API Key Protection
✅ All OpenAI API keys stored in server-side environment variables
✅ Never exposed to client-side code
✅ Clerk authentication required for all streaming endpoints

### Rate Limiting
⚠️ **TODO**: Implement per-user rate limiting
```typescript
// app/api/chat/respond/route.ts
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  // Check rate limit
  const { success } = await rateLimit.check(userId, {
    limit: 20, // 20 requests
    window: 60 * 1000, // per minute
  });

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ... rest of handler
}
```

### Input Validation
✅ Request body validation with schema
⚠️ **TODO**: Add input sanitization for prompts
⚠️ **TODO**: Add content filtering for inappropriate requests

---

## Migration Guide

### From Mock Workflow to Streaming

**Step 1**: Update imports
```typescript
// Before
import { ChatInterface } from '@/components/chat-interface';

// After
import { ChatInterface } from '@/components/chat-interface';
import { useStreamingResponse } from '@/hooks/use-streaming-response';
import { ToolCallList } from '@/components/tool-call-indicator';
```

**Step 2**: Replace simulation with streaming
```typescript
// Before
const simulateWorkflowProgress = async (message) => {
  // Simulated delays...
};

// After
const { startStreaming, content, toolCalls } = useStreamingResponse({
  onToken: (token) => updateMessage(token),
});

const handleSendMessage = async () => {
  await startStreaming({
    sessionId: activeChat.id,
    messageId: `msg-${Date.now()}`,
    content: inputValue,
  });
};
```

**Step 3**: Update UI to display tool calls
```typescript
// Add to message rendering
{msg.toolCalls && (
  <ToolCallList toolCalls={msg.toolCalls} showDetails={true} />
)}
```

---

## Troubleshooting

### Issue: SSE Connection Fails

**Symptoms**: No tokens received, connection drops immediately

**Solutions**:
1. Check API key is set: `echo $OPENAI_API_KEY`
2. Verify Clerk authentication: Check user is logged in
3. Check network tab: Look for 401/403 errors
4. Disable nginx buffering: Add `X-Accel-Buffering: no` header

### Issue: Streaming Stops Mid-Response

**Symptoms**: Partial response, then silence

**Solutions**:
1. Check OpenAI rate limits: Dashboard → Usage
2. Verify timeout settings: Increase to 60s
3. Check network stability: Test with `curl`
4. Review server logs: Look for errors in API route

### Issue: Tool Calls Not Displaying

**Symptoms**: Streaming works but no tool indicators

**Solutions**:
1. Verify tool call events: Check SSE stream in network tab
2. Update tool icon mapping: Add missing tool names
3. Check component imports: Ensure `ToolCallIndicator` imported
4. Debug state: Log `toolCalls` array

---

## Next Steps

### Immediate (This Week)
- [ ] Integrate streaming hook into `chat-interface.tsx`
- [ ] Replace mock workflow with real API calls
- [ ] Test end-to-end RFP creation with streaming
- [ ] Add "Stop Generating" button to UI

### Short-Term (Next 2 Weeks)
- [ ] Convert Supabase MCP server to HTTP+SSE (ONEK-55)
- [ ] Deploy MCP server to Vercel Edge Function
- [ ] Update API route to use hosted MCP tools
- [ ] Write comprehensive test suite (ONEK-58)

### Medium-Term (Next Month)
- [ ] Convert remaining MCP servers to hosted
- [ ] Update BaseAgent for Responses API (ONEK-57)
- [ ] Integrate ChatKit React components (ONEK-56)
- [ ] Implement rate limiting and security hardening
- [ ] Performance benchmarking and optimization

### Long-Term (Next Quarter)
- [ ] Explore OpenAI Agents SDK handoffs
- [ ] Implement guardrails for safety checks
- [ ] Add voice input integration
- [ ] Multi-language support
- [ ] Advanced tracing and observability

---

## Resources

### OpenAI Documentation
- [Responses API Reference](https://platform.openai.com/docs/api-reference/responses)
- [Agents SDK (TypeScript)](https://openai.github.io/openai-agents-js/)
- [ChatKit Documentation](https://openai.github.io/chatkit-js/)
- [MCP Tool Guide](https://cookbook.openai.com/examples/mcp/mcp_tool_guide)

### Related Files
- API Route: [app/api/chat/respond/route.ts](../app/api/chat/respond/route.ts)
- Streaming Hook: [hooks/use-streaming-response.ts](../hooks/use-streaming-response.ts)
- Tool Indicators: [components/tool-call-indicator.tsx](../components/tool-call-indicator.tsx)

### Linear Issues
- [ONEK-52](https://linear.app/designthru-ai/issue/ONEK-52): Streaming API
- [ONEK-53](https://linear.app/designthru-ai/issue/ONEK-53): Streaming Hook
- [ONEK-54](https://linear.app/designthru-ai/issue/ONEK-54): Tool Indicators
- [ONEK-55](https://linear.app/designthru-ai/issue/ONEK-55): Hosted MCP Servers
- [ONEK-56](https://linear.app/designthru-ai/issue/ONEK-56): ChatKit Integration
- [ONEK-57](https://linear.app/designthru-ai/issue/ONEK-57): BaseAgent Update
- [ONEK-58](https://linear.app/designthru-ai/issue/ONEK-58): Testing

---

**Last Updated**: October 27, 2025
**Status**: Phase 2 Complete, Phase 3-5 Pending
**Maintainer**: Development Team
