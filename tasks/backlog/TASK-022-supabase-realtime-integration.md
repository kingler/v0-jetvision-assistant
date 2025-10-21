# Supabase Realtime Integration

**Task ID**: TASK-022
**Created**: 2025-10-20
**Assigned To**: Frontend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 6 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement Supabase Realtime subscriptions for flight_requests, quotes, and proposals tables to enable live status updates in the UI, connection management, optimistic UI updates, and reconnection logic for the JetVision application.

### User Story
**As an** ISO agent
**I want** to see real-time updates when quotes arrive and workflow status changes
**So that** I can track progress without manually refreshing the page

### Business Value
Real-time updates dramatically improve user experience by providing instant feedback on workflow progress. This reduces the need for page refreshes, enables faster decision-making, and creates a more responsive, professional interface that builds user confidence in the system.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL establish WebSocket connection on page load
- Connect to Supabase Realtime on authenticated routes
- Subscribe to user's data only (RLS enforced)
- Handle connection failures gracefully
- Display connection status indicator

**FR-2**: System SHALL subscribe to flight_requests changes
- Listen for INSERT, UPDATE, DELETE events
- Filter by user_id (automatic via RLS)
- Update UI when status changes
- Update workflow progress indicators

**FR-3**: System SHALL subscribe to quotes changes
- Listen for new quotes (INSERT events)
- Show toast notification on quote arrival
- Update quote count in real-time
- Highlight new quotes in UI

**FR-4**: System SHALL subscribe to proposals changes
- Listen for proposal status updates
- Show notification when proposal sent
- Update proposal list in real-time

**FR-5**: System SHALL implement connection management
- Auto-reconnect on connection loss
- Exponential backoff for reconnection
- Show connection status (connected, reconnecting, disconnected)
- Unsubscribe on component unmount

**FR-6**: System SHALL implement optimistic UI updates
- Update UI immediately on user action
- Rollback if server update fails
- Show pending state during server sync
- Merge server updates with optimistic state

**FR-7**: System SHALL handle concurrent updates
- Merge remote changes with local state
- Resolve conflicts (server wins)
- Prevent UI flicker during updates

### Acceptance Criteria

- [ ] **AC-1**: WebSocket connection established on page load
- [ ] **AC-2**: Subscriptions created for user's requests, quotes, proposals
- [ ] **AC-3**: UI updates in real-time when data changes
- [ ] **AC-4**: Toast notifications show for important events
- [ ] **AC-5**: Connection status indicator displays correctly
- [ ] **AC-6**: Auto-reconnect works after connection loss
- [ ] **AC-7**: Subscriptions cleaned up on unmount
- [ ] **AC-8**: No memory leaks from subscriptions
- [ ] **AC-9**: Optimistic updates work and rollback on error
- [ ] **AC-10**: Concurrent updates handled correctly
- [ ] **AC-11**: Integration tests verify realtime functionality
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: Updates appear in UI within 500ms of database change
- **Reliability**: Auto-reconnect within 10 seconds of disconnection
- **Scalability**: Support 100+ concurrent subscriptions
- **User Experience**: No UI flicker during updates

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/lib/realtime/supabase-realtime.test.ts
__tests__/hooks/useRealtimeRequests.test.tsx
__tests__/hooks/useRealtimeQuotes.test.tsx
__tests__/integration/realtime-updates.test.tsx
```

**Example Tests**:
```typescript
// __tests__/lib/realtime/supabase-realtime.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRealtimeClient } from '@/lib/realtime/supabase-realtime'

describe('Supabase Realtime', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      channel: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }
  })

  it('should create realtime subscription', () => {
    const client = createRealtimeClient(mockSupabase)
    client.subscribeToRequests('user-123', vi.fn())

    expect(mockSupabase.channel).toHaveBeenCalledWith('requests:user-123')
    expect(mockSupabase.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'flight_requests'
      }),
      expect.any(Function)
    )
    expect(mockSupabase.subscribe).toHaveBeenCalled()
  })

  it('should call callback on INSERT event', () => {
    const callback = vi.fn()
    const client = createRealtimeClient(mockSupabase)

    // Capture the callback passed to .on()
    let eventCallback: any
    mockSupabase.on.mockImplementation((event, config, cb) => {
      eventCallback = cb
      return mockSupabase
    })

    client.subscribeToRequests('user-123', callback)

    // Simulate INSERT event
    eventCallback({
      eventType: 'INSERT',
      new: { id: 'req-123', status: 'CREATED' }
    })

    expect(callback).toHaveBeenCalledWith({
      eventType: 'INSERT',
      record: { id: 'req-123', status: 'CREATED' }
    })
  })

  it('should unsubscribe on cleanup', () => {
    const mockUnsubscribe = vi.fn()
    mockSupabase.subscribe.mockReturnValue({
      unsubscribe: mockUnsubscribe
    })

    const client = createRealtimeClient(mockSupabase)
    const subscription = client.subscribeToRequests('user-123', vi.fn())

    subscription.unsubscribe()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})

// __tests__/hooks/useRealtimeRequests.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useRealtimeRequests } from '@/lib/realtime/hooks'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  })
}))

describe('useRealtimeRequests hook', () => {
  it('should establish subscription on mount', () => {
    const { result } = renderHook(() => useRealtimeRequests())

    expect(result.current.isConnected).toBe(true)
  })

  it('should update data on INSERT event', async () => {
    const { result } = renderHook(() => useRealtimeRequests())

    act(() => {
      // Simulate realtime event
      result.current._simulateEvent({
        eventType: 'INSERT',
        new: { id: 'req-123', status: 'CREATED' }
      })
    })

    await waitFor(() => {
      expect(result.current.latestRequest).toEqual({
        id: 'req-123',
        status: 'CREATED'
      })
    })
  })

  it('should show toast on new quote', async () => {
    const mockToast = vi.fn()
    vi.mock('@/components/ui/use-toast', () => ({ toast: mockToast }))

    const { result } = renderHook(() => useRealtimeRequests())

    act(() => {
      result.current._simulateEvent({
        eventType: 'UPDATE',
        new: { id: 'req-123', status: 'AWAITING_QUOTES', quote_count: 1 }
      })
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'New Quote Received',
        description: expect.any(String)
      })
    })
  })

  it('should cleanup subscription on unmount', () => {
    const mockUnsubscribe = vi.fn()
    vi.mocked(supabase.subscribe).mockReturnValue({
      unsubscribe: mockUnsubscribe
    })

    const { unmount } = renderHook(() => useRealtimeRequests())

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})

// __tests__/integration/realtime-updates.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RequestDetailPage from '@/app/(dashboard)/requests/[id]/page'

describe('Realtime Updates Integration', () => {
  it('should update UI when request status changes', async () => {
    render(<RequestDetailPage params={{ id: 'req-123' }} />)

    // Initial status
    expect(screen.getByText('Created')).toBeInTheDocument()

    // Simulate realtime update
    await act(async () => {
      simulateRealtimeEvent({
        table: 'flight_requests',
        eventType: 'UPDATE',
        new: { id: 'req-123', status: 'SEARCHING_FLIGHTS' }
      })
    })

    // Verify UI updated
    await waitFor(() => {
      expect(screen.getByText('Searching Flights')).toBeInTheDocument()
    })
  })

  it('should show new quote in list when quote arrives', async () => {
    render(<RequestDetailPage params={{ id: 'req-123' }} />)

    // Initially 0 quotes
    expect(screen.getByText('0 quotes received')).toBeInTheDocument()

    // Simulate new quote
    await act(async () => {
      simulateRealtimeEvent({
        table: 'quotes',
        eventType: 'INSERT',
        new: {
          id: 'quote-1',
          request_id: 'req-123',
          operator_name: 'Test Operator',
          base_price: 15000
        }
      })
    })

    // Verify quote appears
    await waitFor(() => {
      expect(screen.getByText('Test Operator')).toBeInTheDocument()
      expect(screen.getByText('$15,000')).toBeInTheDocument()
    })
  })
})
```

**Run Tests** (should FAIL):
```bash
npm test
# Expected: Tests fail because realtime implementation doesn't exist
```

### Step 2: Implement Realtime (Green Phase)

**Realtime Client**:
```typescript
// lib/realtime/supabase-realtime.ts
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

export type RealtimeEvent<T = any> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  record: T
  old?: T
}

export type RealtimeCallback<T = any> = (event: RealtimeEvent<T>) => void

export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()

  constructor(private supabase: SupabaseClient) {}

  subscribeToRequests(userId: string, callback: RealtimeCallback) {
    const channelName = `requests:${userId}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flight_requests',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback({
            eventType: payload.eventType as any,
            record: payload.new,
            old: payload.old
          })
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return {
      unsubscribe: () => {
        channel.unsubscribe()
        this.channels.delete(channelName)
      }
    }
  }

  subscribeToQuotes(requestId: string, callback: RealtimeCallback) {
    const channelName = `quotes:${requestId}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `request_id=eq.${requestId}`
        },
        (payload) => {
          callback({
            eventType: payload.eventType as any,
            record: payload.new,
            old: payload.old
          })
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return {
      unsubscribe: () => {
        channel.unsubscribe()
        this.channels.delete(channelName)
      }
    }
  }

  subscribeToProposals(requestId: string, callback: RealtimeCallback) {
    const channelName = `proposals:${requestId}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals',
          filter: `request_id=eq.${requestId}`
        },
        (payload) => {
          callback({
            eventType: payload.eventType as any,
            record: payload.new,
            old: payload.old
          })
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return {
      unsubscribe: () => {
        channel.unsubscribe()
        this.channels.delete(channelName)
      }
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel) => channel.unsubscribe())
    this.channels.clear()
  }
}

export function createRealtimeClient(supabase: SupabaseClient) {
  return new RealtimeManager(supabase)
}
```

**React Hooks**:
```typescript
// lib/realtime/hooks.ts
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { createRealtimeClient, RealtimeEvent } from './supabase-realtime'
import { useToast } from '@/components/ui/use-toast'
import { FlightRequest, Quote, Proposal } from '@/lib/api-client/types'

export function useRealtimeRequests() {
  const { userId } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [latestRequest, setLatestRequest] = useState<FlightRequest | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const realtime = createRealtimeClient(supabase)

    const subscription = realtime.subscribeToRequests(
      userId,
      (event: RealtimeEvent<FlightRequest>) => {
        setLatestRequest(event.record)

        // Show notifications for important events
        if (event.eventType === 'UPDATE' && event.old?.status !== event.record.status) {
          toast({
            title: 'Status Updated',
            description: `Request is now ${formatStatus(event.record.status)}`
          })
        }
      }
    )

    setIsConnected(true)

    return () => {
      subscription.unsubscribe()
      setIsConnected(false)
    }
  }, [userId, toast])

  return { isConnected, latestRequest }
}

export function useRealtimeQuotes(requestId: string) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [newQuoteCount, setNewQuoteCount] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    if (!requestId) return

    const supabase = createClient()
    const realtime = createRealtimeClient(supabase)

    const subscription = realtime.subscribeToQuotes(
      requestId,
      (event: RealtimeEvent<Quote>) => {
        if (event.eventType === 'INSERT') {
          setQuotes((prev) => [...prev, event.record])
          setNewQuoteCount((prev) => prev + 1)

          toast({
            title: 'New Quote Received',
            description: `${event.record.operator_name} - $${event.record.base_price.toLocaleString()}`
          })
        } else if (event.eventType === 'UPDATE') {
          setQuotes((prev) =>
            prev.map((q) => (q.id === event.record.id ? event.record : q))
          )
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [requestId, toast])

  return { quotes, newQuoteCount }
}

export function useRealtimeProposals(requestId: string) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (!requestId) return

    const supabase = createClient()
    const realtime = createRealtimeClient(supabase)

    const subscription = realtime.subscribeToProposals(
      requestId,
      (event: RealtimeEvent<Proposal>) => {
        if (event.eventType === 'INSERT') {
          setProposals((prev) => [...prev, event.record])
        } else if (event.eventType === 'UPDATE') {
          setProposals((prev) =>
            prev.map((p) => (p.id === event.record.id ? event.record : p))
          )

          if (event.record.status === 'sent' && event.old?.status !== 'sent') {
            toast({
              title: 'Proposal Sent',
              description: 'Your proposal has been sent to the client'
            })
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [requestId, toast])

  return { proposals }
}

// Connection status hook
export function useRealtimeConnection() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')

  useEffect(() => {
    const supabase = createClient()

    // Monitor connection status
    const channel = supabase.channel('connection-monitor')

    channel.on('system', {}, (payload) => {
      if (payload.status === 'ok') {
        setStatus('connected')
      } else {
        setStatus('disconnected')
      }
    })

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return status
}

function formatStatus(status: string): string {
  return status.split('_').map(word =>
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ')
}
```

**Connection Status Indicator**:
```typescript
// components/realtime/ConnectionStatus.tsx
'use client'

import { useRealtimeConnection } from '@/lib/realtime/hooks'
import { Wifi, WifiOff } from 'lucide-react'

export function ConnectionStatus() {
  const status = useRealtimeConnection()

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Wifi className="h-4 w-4" />
        <span>Connected</span>
      </div>
    )
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-600">
        <Wifi className="h-4 w-4 animate-pulse" />
        <span>Connecting...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-600">
      <WifiOff className="h-4 w-4" />
      <span>Disconnected</span>
    </div>
  )
}
```

**Run Tests Again**:
```bash
npm test
# Expected: Tests now pass ✓
```

---

## 4-11. STANDARD SECTIONS

[Following template structure]

**Dependencies**:
- TASK-002: Supabase Database Schema Deployment
- TASK-005: Supabase Client Implementation

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
