# TASK-043: Complete Chat UI Missing Features Per PRD Requirements

**Status**: 🟡 High Priority
**Priority**: HIGH
**Estimated Time**: 12-16 hours
**Assigned To**: Frontend Developer, UX Designer
**Created**: October 22, 2025
**Due Date**: Week 2
**Linear Issue**: DES-125

---

## 1. Task Overview

### Objective
Implement missing features in the chat interface that are explicitly required by the PRD but currently absent from the implementation.

### User Story
```
As an ISO agent
I want all the features promised in the PRD
So that I can efficiently manage flight requests through the chat interface
```

### Business Value
- **PRD Compliance**: Delivers on promised functionality
- **User Productivity**: Search, filters, and time estimates save agent time
- **Professional Quality**: Complete feature set vs half-implemented MVP
- **User Satisfaction**: Meets expectations set by requirements

### Success Metrics
- ✅ All 5 missing features implemented
- ✅ Search/filter finds requests in <500ms
- ✅ Time estimates accurate within ±20%
- ✅ Toast notifications appear within 1 second
- ✅ Workflow timestamps display for all stages

---

## 2. Requirements & Acceptance Criteria

### Missing Features Analysis

From PRD comparison analysis, the following required features are missing:

#### MF-1: Search/Filter Past Requests
**PRD Reference**: User Story 6 (docs/PRD.md:101)
> "As an ISO agent, I want to **search and filter** my past RFP requests"

**Current State**: ❌ ChatSidebar shows all sessions, no search capability
**Required State**: ✅ Search box filters by client name, request ID, date range

#### MF-2: Estimated Completion Time
**PRD Reference**: FR-8.3 (docs/PRD.md:342)
> "System SHALL display **estimated completion time** for the current workflow stage"

**Current State**: ❌ No time estimates shown
**Required State**: ✅ "Estimated time: 2-3 minutes" shown in workflow visualization

#### MF-3: Workflow Stage Timestamps
**PRD Reference**: FR-8.2 (docs/PRD.md:335)
> "System SHALL display **current workflow stage** and elapsed time"

**Current State**: ❌ WorkflowVisualization shows stages but no timestamps
**Required State**: ✅ Each stage shows "Started: 10:23 AM, Duration: 1m 34s"

#### MF-4: Multi-Turn Clarification
**PRD Reference**: FR-2.1 (docs/PRD.md:187)
> "System SHALL support **multi-turn conversations** to gather complete information"

**Current State**: ❓ Partially implemented, needs verification
**Required State**: ✅ AI asks follow-up questions for incomplete requests

#### MF-5: Toast Notifications
**PRD Reference**: FR-10.2 (docs/PRD.md:372)
> "System SHALL provide **toast notifications** for workflow state changes"

**Current State**: ❌ No toast notifications
**Required State**: ✅ Toast appears when: quote received, workflow stage changes, errors occur

### Acceptance Criteria

- [ ] **AC-1**: Search box in ChatSidebar filters sessions by keyword
- [ ] **AC-2**: Date range filter shows requests from selected time period
- [ ] **AC-3**: Search results appear in <500ms
- [ ] **AC-4**: Estimated completion time displays in workflow view
- [ ] **AC-5**: Time estimates accurate within ±20% of actual time
- [ ] **AC-6**: Each workflow stage shows start time and duration
- [ ] **AC-7**: Timestamps update in real-time
- [ ] **AC-8**: AI asks clarifying questions for incomplete requests
- [ ] **AC-9**: Toast notifications appear for key events
- [ ] **AC-10**: Toasts auto-dismiss after 5 seconds
- [ ] **AC-11**: All features accessible via keyboard
- [ ] **AC-12**: Features work on mobile (responsive)

---

## 3. Implementation Steps

### Feature 1: Search/Filter Past Requests

#### Step 1.1: Update ChatSidebar Component

File: `components/chat-sidebar.tsx`

**Add State and Handlers**:
```tsx
'use client'

import { useState, useMemo } from 'react'
import { Search, Calendar, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import type { ChatSession } from '@/lib/types/chat'

export function ChatSidebar({ chatSessions, activeChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })

  // Filter sessions based on search and date range
  const filteredSessions = useMemo(() => {
    return chatSessions.filter((session) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesClient = session.clientName?.toLowerCase().includes(query)
        const matchesId = session.id.toLowerCase().includes(query)
        const matchesTitle = session.title?.toLowerCase().includes(query)

        if (!matchesClient && !matchesId && !matchesTitle) {
          return false
        }
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const sessionDate = new Date(session.createdAt)

        if (dateRange.from && sessionDate < dateRange.from) {
          return false
        }

        if (dateRange.to && sessionDate > dateRange.to) {
          return false
        }
      }

      return true
    })
  }, [chatSessions, searchQuery, dateRange])

  const handleClearFilters = () => {
    setSearchQuery('')
    setDateRange({ from: undefined, to: undefined })
  }

  const hasActiveFilters = searchQuery || dateRange.from || dateRange.to

  return (
    <div className="w-64 border-r bg-gray-900 flex flex-col">
      {/* Search and Filter Section */}
      <div className="p-4 border-b border-gray-700 space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
            aria-label="Search past requests"
          />
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-start text-left font-normal bg-gray-800 border-gray-700 text-gray-300"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-gray-400 hover:text-white"
              aria-label="Clear all filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <p className="text-xs text-gray-400">
            {filteredSessions.length} of {chatSessions.length} requests
          </p>
        )}
      </div>

      {/* Chat Sessions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {hasActiveFilters ? 'No requests match your filters' : 'No requests yet'}
          </div>
        ) : (
          filteredSessions.map((session) => (
            <ChatSessionCard
              key={session.id}
              session={session}
              isActive={session.id === activeChatId}
              onClick={() => onSelectChat(session.id)}
            />
          ))
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-t border-gray-700">
        <Button onClick={onNewChat} className="w-full">
          New Request
        </Button>
      </div>
    </div>
  )
}
```

#### Step 1.2: Add Date Utilities

```bash
npm install date-fns
```

#### Step 1.3: Add Tests

```typescript
// __tests__/unit/components/chat-sidebar-search.test.tsx

describe('ChatSidebar Search and Filter', () => {
  const mockSessions: ChatSession[] = [
    {
      id: 'session-1',
      clientName: 'John Smith',
      title: 'JFK to LAX',
      createdAt: '2025-10-15T10:00:00Z',
    },
    {
      id: 'session-2',
      clientName: 'Jane Doe',
      title: 'MIA to ORD',
      createdAt: '2025-10-20T14:00:00Z',
    },
  ]

  it('filters sessions by search query', () => {
    const { getByPlaceholderText, queryByText } = render(
      <ChatSidebar chatSessions={mockSessions} />
    )

    const searchInput = getByPlaceholderText('Search requests...')
    fireEvent.change(searchInput, { target: { value: 'john' } })

    expect(queryByText('John Smith')).toBeInTheDocument()
    expect(queryByText('Jane Doe')).not.toBeInTheDocument()
  })

  it('filters sessions by date range', () => {
    // Test date range filtering
  })

  it('shows result count when filters applied', () => {
    // Test result count display
  })

  it('clears all filters when clear button clicked', () => {
    // Test clear filters functionality
  })
})
```

---

### Feature 2: Estimated Completion Time

#### Step 2.1: Create Time Estimation Service

File: `lib/services/time-estimation.ts`

```typescript
/**
 * Workflow Time Estimation Service
 *
 * Provides estimated completion times for RFP workflow stages based on:
 * - Historical average times per stage
 * - Current queue depth
 * - Request complexity (passenger count, special requirements)
 * - VIP status (priority processing)
 */

import type { WorkflowState } from '@/agents/coordination/state-machine'

interface TimeEstimate {
  stage: WorkflowState
  estimatedSeconds: number
  confidence: 'high' | 'medium' | 'low'
}

// Historical average times per stage (in seconds)
const STAGE_AVERAGES = {
  ANALYZING: 15,
  FETCHING_CLIENT_DATA: 10,
  SEARCHING_FLIGHTS: 120, // 2 minutes - Avinode search
  AWAITING_QUOTES: 180, // 3 minutes - waiting for operators
  ANALYZING_PROPOSALS: 30,
  GENERATING_EMAIL: 20,
  SENDING_PROPOSAL: 10,
} as const

interface EstimationContext {
  currentStage: WorkflowState
  passengerCount?: number
  isVIP?: boolean
  hasSpecialRequirements?: boolean
  queueDepth?: number
}

export function estimateRemainingTime(context: EstimationContext): {
  totalSeconds: number
  breakdown: TimeEstimate[]
  formattedTime: string
} {
  const { currentStage, passengerCount = 1, isVIP = false, hasSpecialRequirements = false } = context

  // Get remaining stages
  const stageOrder: WorkflowState[] = [
    'ANALYZING',
    'FETCHING_CLIENT_DATA',
    'SEARCHING_FLIGHTS',
    'AWAITING_QUOTES',
    'ANALYZING_PROPOSALS',
    'GENERATING_EMAIL',
    'SENDING_PROPOSAL',
  ]

  const currentIndex = stageOrder.indexOf(currentStage)
  const remainingStages = stageOrder.slice(currentIndex + 1)

  let totalSeconds = 0
  const breakdown: TimeEstimate[] = []

  for (const stage of remainingStages) {
    let estimate = STAGE_AVERAGES[stage] || 30
    let confidence: 'high' | 'medium' | 'low' = 'high'

    // Adjust for complexity
    if (stage === 'SEARCHING_FLIGHTS') {
      // Large groups take longer
      if (passengerCount > 8) {
        estimate *= 1.3
        confidence = 'medium'
      }

      // Special requirements add time
      if (hasSpecialRequirements) {
        estimate *= 1.2
        confidence = 'medium'
      }
    }

    // VIP requests get priority (faster processing)
    if (isVIP) {
      estimate *= 0.8
    }

    totalSeconds += estimate
    breakdown.push({ stage, estimatedSeconds: Math.round(estimate), confidence })
  }

  return {
    totalSeconds: Math.round(totalSeconds),
    breakdown,
    formattedTime: formatDuration(totalSeconds),
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${remainingSeconds}s`
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`
  }

  return `${minutes}m ${remainingSeconds}s`
}

// Get time range for user display
export function getTimeRange(seconds: number): string {
  const low = Math.floor(seconds * 0.8 / 60)
  const high = Math.ceil(seconds * 1.2 / 60)

  if (low === high) {
    return `${low} minute${low !== 1 ? 's' : ''}`
  }

  return `${low}-${high} minutes`
}
```

#### Step 2.2: Update WorkflowVisualization Component

File: `components/workflow-visualization.tsx`

```tsx
import { useEffect, useState } from 'react'
import { estimateRemainingTime, getTimeRange } from '@/lib/services/time-estimation'
import { Clock } from 'lucide-react'

export function WorkflowVisualization({ workflowId, currentStage, requestData }: Props) {
  const [timeEstimate, setTimeEstimate] = useState<ReturnType<typeof estimateRemainingTime> | null>(null)

  useEffect(() => {
    const estimate = estimateRemainingTime({
      currentStage,
      passengerCount: requestData?.passengers,
      isVIP: requestData?.vipStatus !== undefined,
      hasSpecialRequirements: !!requestData?.specialRequirements,
    })

    setTimeEstimate(estimate)
  }, [currentStage, requestData])

  return (
    <div className="space-y-6">
      {/* Time Estimate Card */}
      {timeEstimate && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Estimated Time Remaining
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {getTimeRange(timeEstimate.totalSeconds)}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Based on current progress and request complexity
          </p>
        </div>
      )}

      {/* Workflow Stages */}
      <div className="space-y-4">
        {stages.map((stage) => (
          <WorkflowStageCard
            key={stage.id}
            stage={stage}
            isActive={stage.id === currentStage}
            estimate={timeEstimate?.breakdown.find((e) => e.stage === stage.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

---

### Feature 3: Workflow Stage Timestamps

#### Step 3.1: Update WorkflowStateMachine to Track Timestamps

File: `agents/coordination/state-machine.ts`

```typescript
interface WorkflowStateEntry {
  state: WorkflowState
  enteredAt: Date
  exitedAt?: Date
  duration?: number // milliseconds
  agent: string
}

export class WorkflowStateMachine {
  private stateHistory: WorkflowStateEntry[] = []

  transition(newState: WorkflowState, agent: string): void {
    // Close previous state
    if (this.stateHistory.length > 0) {
      const currentEntry = this.stateHistory[this.stateHistory.length - 1]
      if (!currentEntry.exitedAt) {
        currentEntry.exitedAt = new Date()
        currentEntry.duration = currentEntry.exitedAt.getTime() - currentEntry.enteredAt.getTime()
      }
    }

    // Add new state
    this.stateHistory.push({
      state: newState,
      enteredAt: new Date(),
      agent,
    })

    this.currentState = newState
  }

  getStateHistory(): WorkflowStateEntry[] {
    return this.stateHistory
  }

  getCurrentStateDuration(): number {
    if (this.stateHistory.length === 0) return 0

    const currentEntry = this.stateHistory[this.stateHistory.length - 1]
    return new Date().getTime() - currentEntry.enteredAt.getTime()
  }
}
```

#### Step 3.2: Display Timestamps in UI

File: `components/workflow-stage-card.tsx`

```tsx
import { formatDistanceToNow, format } from 'date-fns'

interface WorkflowStageCardProps {
  stage: WorkflowStage
  isActive: boolean
  stateEntry?: WorkflowStateEntry
}

export function WorkflowStageCard({ stage, isActive, stateEntry }: WorkflowStageCardProps) {
  return (
    <div className={cn(
      'border rounded-lg p-4',
      isActive && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Stage Icon and Name */}
          <StageIcon stage={stage} isActive={isActive} />
          <div>
            <h3 className="font-medium">{stage.name}</h3>
            <p className="text-sm text-muted-foreground">{stage.description}</p>
          </div>
        </div>

        {/* Timestamp Information */}
        {stateEntry && (
          <div className="text-right text-sm">
            {stateEntry.exitedAt ? (
              // Completed stage
              <>
                <p className="text-muted-foreground">
                  {format(stateEntry.enteredAt, 'h:mm a')}
                </p>
                <p className="text-green-600 dark:text-green-400 font-medium">
                  {formatDuration(stateEntry.duration!)}
                </p>
              </>
            ) : (
              // Active stage
              <>
                <p className="text-muted-foreground">
                  Started {formatDistanceToNow(stateEntry.enteredAt, { addSuffix: true })}
                </p>
                <LiveDuration startTime={stateEntry.enteredAt} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Component that updates duration every second
function LiveDuration({ startTime }: { startTime: Date }) {
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(new Date().getTime() - startTime.getTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return (
    <p className="text-blue-600 dark:text-blue-400 font-medium animate-pulse">
      {formatDuration(duration)}
    </p>
  )
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}
```

---

### Feature 4: Multi-Turn Clarification (Verification)

**Note**: This may already be partially implemented. Need to verify and enhance if needed.

#### Step 4.1: Verify Current Implementation

```typescript
// Check components/chat-interface.tsx
// Verify AI asks follow-up questions for incomplete requests
```

#### Step 4.2: Add Test Cases

```typescript
// __tests__/integration/multi-turn-conversation.test.ts

describe('Multi-Turn Conversation', () => {
  it('asks for missing departure airport', async () => {
    const response = await sendChatMessage('Book a flight to Miami on Dec 15')

    expect(response.message).toMatch(/departure|where.*from/i)
  })

  it('asks for missing passenger count', async () => {
    const response = await sendChatMessage('Flight from JFK to LAX on Dec 15')

    expect(response.message).toMatch(/how many|passengers/i)
  })

  it('confirms all details before creating RFP', async () => {
    // Complete conversation
    await sendChatMessage('Flight for John Smith from JFK to LAX')
    await sendChatMessage('December 15th')
    await sendChatMessage('4 passengers')

    const confirmation = await getChatHistory()
    expect(confirmation).toMatch(/confirm|correct|proceed/i)
  })
})
```

---

### Feature 5: Toast Notifications

#### Step 5.1: Install Toast Library

```bash
npm install sonner
```

#### Step 5.2: Add Toast Provider

File: `app/layout.tsx`

```tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </body>
    </html>
  )
}
```

#### Step 5.3: Create Notification Service

File: `lib/services/notifications.ts`

```typescript
import { toast } from 'sonner'
import type { WorkflowState } from '@/agents/coordination/state-machine'

export const notify = {
  // Workflow state changes
  workflowStageChange(stage: WorkflowState) {
    const messages = {
      ANALYZING: 'Analyzing your request...',
      FETCHING_CLIENT_DATA: 'Fetching client information...',
      SEARCHING_FLIGHTS: 'Searching for available flights...',
      AWAITING_QUOTES: 'Waiting for operator quotes...',
      ANALYZING_PROPOSALS: 'Analyzing proposals...',
      GENERATING_EMAIL: 'Generating proposal email...',
      SENDING_PROPOSAL: 'Sending proposal...',
      COMPLETED: 'Request completed successfully!',
    }

    toast.info(messages[stage] || `Workflow: ${stage}`)
  },

  // Quote received
  quoteReceived(operatorName: string, amount: number) {
    toast.success(`New quote received from ${operatorName}: $${amount.toLocaleString()}`, {
      action: {
        label: 'View',
        onClick: () => {
          // Navigate to quote
        },
      },
    })
  },

  // All quotes received
  allQuotesReceived(count: number) {
    toast.success(`All quotes received! ${count} proposals to review`, {
      action: {
        label: 'Review',
        onClick: () => {
          // Navigate to proposals
        },
      },
    })
  },

  // Error occurred
  error(message: string) {
    toast.error(message)
  },

  // Success
  success(message: string) {
    toast.success(message)
  },

  // Info
  info(message: string) {
    toast.info(message)
  },
}
```

#### Step 5.4: Integrate with Workflow

File: `components/chat-interface.tsx`

```tsx
import { useEffect } from 'react'
import { messageBus, MessageType } from '@/agents/coordination'
import { notify } from '@/lib/services/notifications'

export function ChatInterface({ activeChat }: ChatInterfaceProps) {
  useEffect(() => {
    // Subscribe to workflow state changes
    const unsubscribe = messageBus.subscribe(
      MessageType.CONTEXT_UPDATE,
      (message) => {
        if (message.payload.workflowState) {
          notify.workflowStageChange(message.payload.workflowState)
        }
      }
    )

    // Subscribe to quote events
    const unsubscribeQuote = messageBus.subscribe(
      MessageType.TASK_COMPLETED,
      (message) => {
        if (message.payload.type === 'quote_received') {
          notify.quoteReceived(
            message.payload.operatorName,
            message.payload.amount
          )
        }
      }
    )

    return () => {
      unsubscribe()
      unsubscribeQuote()
    }
  }, [])

  // ... rest of component
}
```

---

## 4. Testing Requirements

### Unit Tests

```typescript
// __tests__/unit/services/time-estimation.test.ts
describe('Time Estimation Service', () => {
  it('estimates time for standard request', () => {
    const estimate = estimateRemainingTime({
      currentStage: 'ANALYZING',
      passengerCount: 4,
    })

    expect(estimate.totalSeconds).toBeGreaterThan(0)
    expect(estimate.formattedTime).toMatch(/\d+m/)
  })

  it('adjusts time for large groups', () => {
    const standardEstimate = estimateRemainingTime({
      currentStage: 'SEARCHING_FLIGHTS',
      passengerCount: 4,
    })

    const largeGroupEstimate = estimateRemainingTime({
      currentStage: 'SEARCHING_FLIGHTS',
      passengerCount: 12,
    })

    expect(largeGroupEstimate.totalSeconds).toBeGreaterThan(standardEstimate.totalSeconds)
  })

  it('prioritizes VIP requests', () => {
    const standardEstimate = estimateRemainingTime({
      currentStage: 'SEARCHING_FLIGHTS',
      isVIP: false,
    })

    const vipEstimate = estimateRemainingTime({
      currentStage: 'SEARCHING_FLIGHTS',
      isVIP: true,
    })

    expect(vipEstimate.totalSeconds).toBeLessThan(standardEstimate.totalSeconds)
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/workflow-timestamps.test.ts
describe('Workflow Timestamps', () => {
  it('tracks state entry and exit times', async () => {
    const workflow = new WorkflowStateMachine('test-workflow')

    workflow.transition('ANALYZING', 'agent-1')
    await delay(100)
    workflow.transition('FETCHING_CLIENT_DATA', 'agent-2')

    const history = workflow.getStateHistory()

    expect(history[0].state).toBe('ANALYZING')
    expect(history[0].enteredAt).toBeInstanceOf(Date)
    expect(history[0].exitedAt).toBeInstanceOf(Date)
    expect(history[0].duration).toBeGreaterThanOrEqual(100)
  })

  it('calculates current state duration', async () => {
    const workflow = new WorkflowStateMachine('test-workflow')
    workflow.transition('SEARCHING_FLIGHTS', 'agent-1')

    await delay(500)

    const duration = workflow.getCurrentStateDuration()
    expect(duration).toBeGreaterThanOrEqual(500)
  })
})
```

### E2E Tests

```typescript
// __tests__/e2e/chat-features.spec.ts
describe('Chat UI Features', () => {
  test('search filters chat sessions', async ({ page }) => {
    await page.goto('/')

    // Type in search box
    await page.fill('input[aria-label="Search past requests"]', 'John Smith')

    // Verify filtered results
    await expect(page.locator('text=John Smith')).toBeVisible()
    await expect(page.locator('text=Jane Doe')).not.toBeVisible()
  })

  test('displays time estimate in workflow view', async ({ page }) => {
    await page.goto('/')
    await page.click('text=View Workflow')

    // Verify time estimate appears
    await expect(page.locator('text=/Estimated Time/i')).toBeVisible()
    await expect(page.locator('text=/\d+-\d+ minutes/i')).toBeVisible()
  })

  test('shows toast notification on quote received', async ({ page }) => {
    await page.goto('/')

    // Simulate quote received event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('quote-received', {
        detail: { operatorName: 'JetOperator', amount: 15000 }
      }))
    })

    // Verify toast appears
    await expect(page.locator('text=/New quote received/i')).toBeVisible()
  })
})
```

---

## 5. Files to Update

### Create

```
lib/services/time-estimation.ts          # Time estimation service
lib/services/notifications.ts            # Toast notification service
components/workflow-stage-card.tsx       # Individual stage card with timestamps
components/live-duration.tsx             # Real-time duration display
__tests__/unit/services/time-estimation.test.ts
__tests__/integration/workflow-timestamps.test.ts
__tests__/e2e/chat-features.spec.ts
```

### Modify

```
components/chat-sidebar.tsx:1-120       # Add search and filter
components/workflow-visualization.tsx:1-200  # Add time estimates and timestamps
agents/coordination/state-machine.ts:30-80   # Track timestamps
components/chat-interface.tsx:1-386     # Integrate toast notifications
app/layout.tsx:1-30                     # Add Toaster component
package.json                            # Add sonner dependency
```

### Verify

```
components/chat-interface.tsx           # Multi-turn conversation (may already exist)
lib/ai/openai-client.ts                # AI conversation handling
```

---

## 6. Definition of Done

- [ ] Search box filters chat sessions by keyword in <500ms
- [ ] Date range filter works correctly
- [ ] Time estimates display for all workflow stages
- [ ] Estimates accurate within ±20% of actual times
- [ ] Timestamps show for all completed stages
- [ ] Current stage shows live-updating duration
- [ ] AI asks clarifying questions (verified/enhanced)
- [ ] Toast notifications appear for:
  - Workflow stage changes
  - Quote received
  - All quotes received
  - Errors
- [ ] Toasts auto-dismiss after 5 seconds
- [ ] All features keyboard accessible
- [ ] All features work on mobile
- [ ] Tests passing (>85% coverage)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Code review approved
- [ ] PRD compliance verified

---

## 7. Git Workflow

```bash
git checkout main
git pull origin main
git checkout -b feat/task-043-complete-chat-ui-features

# Commit each feature separately
git commit -m "feat(chat): add search and filter to chat sidebar"
git commit -m "feat(workflow): add estimated completion time display"
git commit -m "feat(workflow): add stage timestamps and durations"
git commit -m "feat(chat): add toast notifications for workflow events"

git push -u origin feat/task-043-complete-chat-ui-features
```

---

**Task Status**: 🟡 HIGH PRIORITY - PRD COMPLIANCE
**Source**: Frontend UX/UI Analysis - Missing Features Assessment
**PRD References**:
- User Story 6 (Line 101) - Search/filter
- FR-8.3 (Line 342) - Time estimates
- FR-8.2 (Line 335) - Timestamps
- FR-2.1 (Line 187) - Multi-turn
- FR-10.2 (Line 372) - Notifications
**Linear Issue**: DES-125
**Last Updated**: October 22, 2025
