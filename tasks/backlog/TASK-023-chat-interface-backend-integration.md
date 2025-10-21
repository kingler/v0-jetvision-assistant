# Chat Interface Backend Integration

**Task ID**: TASK-023
**Created**: 2025-10-20
**Assigned To**: Frontend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 10 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Connect the existing chat UI to API routes, implement message streaming with Server-Sent Events (SSE), integrate workflow visualization updates, proposal display, and replace all mock data with real API calls for the JetVision AI Assistant.

### User Story
**As an** ISO agent
**I want** the chat interface to communicate with real agents and show live workflow progress
**So that** I can submit flight requests and receive actual proposals through natural conversation

### Business Value
The chat interface is the primary user interaction point. Connecting it to real backend services transforms the MVP from a prototype to a functional system, enabling end-to-end automation of the RFP workflow and delivering immediate business value.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL connect chat to request creation API
- POST message to /api/agents/orchestrator
- Parse user input for flight details
- Create flight_request record
- Initiate workflow

**FR-2**: System SHALL implement message streaming
- Use Server-Sent Events (SSE) for agent responses
- Stream workflow updates in real-time
- Display typing indicators during processing
- Handle stream interruption and reconnection

**FR-3**: System SHALL integrate workflow visualization
- Update workflow stepper based on request status
- Show current step with progress percentage
- Display time spent on each step
- Highlight completed and active steps

**FR-4**: System SHALL display proposals in chat
- Show proposals as formatted cards
- Display aircraft details, pricing, operator info
- Provide action buttons (Accept, Decline)
- Link to full proposal PDF

**FR-5**: System SHALL handle quote updates
- Poll or subscribe to quote arrivals
- Display quote count (e.g., "3/5 quotes received")
- Show quote details in expandable cards
- Update UI when all quotes received

**FR-6**: System SHALL replace mock data
- Remove all hardcoded mock responses
- Fetch conversation history from database
- Load request details from API
- Display real quote and proposal data

**FR-7**: System SHALL implement error handling
- Show error messages in chat
- Provide retry options for failed requests
- Handle API timeouts gracefully
- Log errors for debugging

### Acceptance Criteria

- [ ] **AC-1**: User can submit flight request via chat
- [ ] **AC-2**: Agent responses stream in real-time
- [ ] **AC-3**: Workflow visualization updates with actual status
- [ ] **AC-4**: Quotes display as they arrive
- [ ] **AC-5**: Proposals render correctly with all details
- [ ] **AC-6**: All mock data removed from codebase
- [ ] **AC-7**: Error states handled gracefully
- [ ] **AC-8**: Loading indicators show during processing
- [ ] **AC-9**: Chat history persists across page reloads
- [ ] **AC-10**: Integration tests verify end-to-end flow
- [ ] **AC-11**: Test coverage >70% for chat components
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: Messages stream with <500ms latency
- **Reliability**: SSE reconnects automatically on failure
- **User Experience**: Smooth animations, no UI jank
- **Accessibility**: Chat accessible via keyboard and screen readers

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files**:
```
__tests__/components/chat/ChatInterface.test.tsx
__tests__/components/chat/MessageList.test.tsx
__tests__/components/chat/WorkflowStepper.test.tsx
__tests__/components/chat/ProposalCard.test.tsx
__tests__/integration/chat-workflow.test.tsx
__tests__/e2e/chat-submission.spec.ts
```

**Example Tests**:
```typescript
// __tests__/components/chat/ChatInterface.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ChatInterface from '@/components/chat/ChatInterface'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn()
  }
}))

describe('ChatInterface', () => {
  it('should submit message to API', async () => {
    const user = userEvent.setup()
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ id: 'msg-123', content: 'Processing...' })

    render(<ChatInterface requestId="req-123" />)

    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'I need a flight from TEB to VNY for 4 passengers')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(mockPost).toHaveBeenCalledWith(
      '/api/agents/orchestrator',
      expect.objectContaining({
        message: 'I need a flight from TEB to VNY for 4 passengers',
        requestId: 'req-123'
      })
    )
  })

  it('should display streamed response', async () => {
    const user = userEvent.setup()

    // Mock SSE stream
    const mockEventSource = {
      addEventListener: vi.fn(),
      close: vi.fn()
    }
    global.EventSource = vi.fn(() => mockEventSource) as any

    render(<ChatInterface requestId="req-123" />)

    // Send message
    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'Test message')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    // Simulate SSE events
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1]

    await act(() => {
      messageHandler({ data: JSON.stringify({ content: 'I understand' }) })
    })

    await waitFor(() => {
      expect(screen.getByText('I understand')).toBeInTheDocument()
    })
  })

  it('should show typing indicator during processing', async () => {
    const user = userEvent.setup()
    render(<ChatInterface requestId="req-123" />)

    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'Test')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })

  it('should handle API errors', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'))

    render(<ChatInterface requestId="req-123" />)

    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'Test')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})

// __tests__/components/chat/WorkflowStepper.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import WorkflowStepper from '@/components/chat/WorkflowStepper'

describe('WorkflowStepper', () => {
  it('should display all workflow steps', () => {
    render(
      <WorkflowStepper
        currentStatus="SEARCHING_FLIGHTS"
        currentStep={2}
        totalSteps={5}
      />
    )

    expect(screen.getByText('Understanding')).toBeInTheDocument()
    expect(screen.getByText('Searching')).toBeInTheDocument()
    expect(screen.getByText('Requesting')).toBeInTheDocument()
    expect(screen.getByText('Analyzing')).toBeInTheDocument()
    expect(screen.getByText('Proposing')).toBeInTheDocument()
  })

  it('should highlight current step', () => {
    render(
      <WorkflowStepper
        currentStatus="SEARCHING_FLIGHTS"
        currentStep={2}
        totalSteps={5}
      />
    )

    const searchingStep = screen.getByText('Searching').closest('div')
    expect(searchingStep).toHaveClass('active')
  })

  it('should show completed steps', () => {
    render(
      <WorkflowStepper
        currentStatus="ANALYZING_PROPOSALS"
        currentStep={4}
        totalSteps={5}
      />
    )

    const understandingStep = screen.getByText('Understanding').closest('div')
    expect(understandingStep).toHaveClass('completed')
  })

  it('should display progress percentage', () => {
    render(
      <WorkflowStepper
        currentStatus="REQUESTING"
        currentStep={3}
        totalSteps={5}
      />
    )

    expect(screen.getByText('60%')).toBeInTheDocument()
  })
})

// __tests__/integration/chat-workflow.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import ChatPage from '@/app/(dashboard)/chat/[id]/page'

describe('Chat Workflow Integration', () => {
  it('should complete end-to-end request submission', async () => {
    const user = userEvent.setup()

    render(<ChatPage params={{ id: 'new' }} />)

    // Type and send message
    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'I need a flight from TEB to VNY on Nov 15 for 4 passengers')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    // Wait for workflow to start
    await waitFor(() => {
      expect(screen.getByText(/analyzing request/i)).toBeInTheDocument()
    })

    // Verify workflow visualization appears
    expect(screen.getByText('Understanding')).toBeInTheDocument()

    // Simulate workflow progress
    await waitFor(() => {
      expect(screen.getByText('Searching')).toHaveClass('active')
    }, { timeout: 5000 })
  })
})

// __tests__/e2e/chat-submission.spec.ts (Playwright)
import { test, expect } from '@playwright/test'

test('submit flight request through chat', async ({ page }) => {
  await page.goto('/chat/new')

  // Type message
  await page.fill('[placeholder="Type a message..."]',
    'I need a flight from TEB to VNY on November 15 for 4 passengers')

  // Send
  await page.click('button:has-text("Send")')

  // Wait for agent response
  await expect(page.locator('text=/analyzing/i')).toBeVisible({ timeout: 10000 })

  // Verify workflow stepper appears
  await expect(page.locator('text=Understanding')).toBeVisible()

  // Wait for quotes
  await expect(page.locator('text=/quotes received/i')).toBeVisible({ timeout: 60000 })

  // Verify proposal appears
  await expect(page.locator('text=/proposal/i')).toBeVisible()
})
```

### Step 2: Implement Integration (Green Phase)

**Chat Interface with API Integration**:
```typescript
// components/chat/ChatInterface.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRequest } from '@/lib/api-client/hooks'
import { useRealtimeQuotes } from '@/lib/realtime/hooks'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import WorkflowStepper from './WorkflowStepper'
import QuoteStatus from './QuoteStatus'
import ProposalCard from './ProposalCard'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatInterface({ requestId }: { requestId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const { data: request, isLoading } = useRequest(requestId)
  const { quotes, newQuoteCount } = useRealtimeQuotes(requestId)

  // Handle message submission
  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Start SSE stream
      setIsStreaming(true)

      const eventSource = new EventSource(
        `/api/agents/orchestrator/stream?requestId=${requestId}&message=${encodeURIComponent(content)}`
      )

      eventSourceRef.current = eventSource

      let assistantMessage = ''

      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'content') {
          assistantMessage += data.content
          setMessages(prev => [
            ...prev.slice(0, -1),
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: assistantMessage,
              timestamp: new Date()
            }
          ])
        } else if (data.type === 'done') {
          eventSource.close()
          setIsStreaming(false)
        }
      })

      eventSource.addEventListener('error', () => {
        eventSource.close()
        setIsStreaming(false)
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }])
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsStreaming(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workflow Stepper */}
      {request && (
        <WorkflowStepper
          currentStatus={request.status}
          currentStep={request.current_step}
          totalSteps={request.total_steps}
        />
      )}

      {/* Quote Status */}
      {quotes.length > 0 && (
        <QuoteStatus quotes={quotes} newCount={newQuoteCount} />
      )}

      {/* Messages */}
      <MessageList messages={messages} isStreaming={isStreaming} />

      {/* Input */}
      <MessageInput onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  )
}
```

**SSE API Route**:
```typescript
// app/api/agents/orchestrator/stream/route.ts
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { orchestratorAgent } from '@/agents/orchestrator'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const requestId = searchParams.get('requestId')
  const message = searchParams.get('message')

  if (!requestId || !message) {
    return new Response('Missing parameters', { status: 400 })
  }

  // Set up SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Process with agent
        await orchestratorAgent.process({
          requestId,
          message,
          onStream: (content: string) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
            )
          }
        })

        // Send done event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Processing failed' })}\n\n`)
        )
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

**Workflow Stepper**:
```typescript
// components/chat/WorkflowStepper.tsx
'use client'

import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface Step {
  name: string
  status: string[]
}

const WORKFLOW_STEPS: Step[] = [
  { name: 'Understanding', status: ['CREATED', 'ANALYZING'] },
  { name: 'Searching', status: ['SEARCHING_FLIGHTS'] },
  { name: 'Requesting', status: ['AWAITING_QUOTES'] },
  { name: 'Analyzing', status: ['ANALYZING_PROPOSALS'] },
  { name: 'Proposing', status: ['GENERATING_EMAIL', 'SENDING_PROPOSAL', 'COMPLETED'] }
]

export default function WorkflowStepper({
  currentStatus,
  currentStep,
  totalSteps
}: {
  currentStatus: string
  currentStep: number
  totalSteps: number
}) {
  const getCurrentStepIndex = () => {
    return WORKFLOW_STEPS.findIndex(step => step.status.includes(currentStatus))
  }

  const activeIndex = getCurrentStepIndex()
  const progress = ((currentStep / totalSteps) * 100).toFixed(0)

  return (
    <div className="bg-white border-b p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Workflow Progress</h3>
        <span className="text-sm text-gray-500">{progress}% Complete</span>
      </div>

      <div className="flex items-center justify-between">
        {WORKFLOW_STEPS.map((step, index) => (
          <div key={step.name} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              {index < activeIndex ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : index === activeIndex ? (
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              ) : (
                <Circle className="h-6 w-6 text-gray-300" />
              )}
              <span className={`text-xs mt-1 ${
                index <= activeIndex ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>
                {step.name}
              </span>
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${
                index < activeIndex ? 'bg-green-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 4-11. STANDARD SECTIONS

[Following template structure]

**Dependencies**:
- TASK-018: Complete API Routes Layer
- TASK-021: API Client & Data Fetching Layer
- TASK-022: Supabase Realtime Integration

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
