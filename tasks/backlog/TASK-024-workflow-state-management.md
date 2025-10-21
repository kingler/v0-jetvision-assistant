# Workflow State Management Integration

**Task ID**: TASK-024
**Created**: 2025-10-20
**Assigned To**: Frontend Developer
**Status**: `pending`
**Priority**: `normal`
**Estimated Time**: 6 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement global state management for workflow status tracking, step progression display, real-time state synchronization, and optimistic updates using Zustand or React Context API for the JetVision AI Assistant.

### User Story
**As an** ISO agent
**I want** workflow state to be consistent across all components
**So that** I can see accurate progress regardless of which page I'm viewing

### Business Value
Centralized state management ensures data consistency, reduces prop drilling, enables optimistic updates, and improves application performance by minimizing unnecessary re-renders. This creates a more responsive user experience and simplifies component architecture.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement global workflow store
- Store current request data
- Store workflow status and progress
- Store quotes and proposals
- Provide actions to update state

**FR-2**: System SHALL track workflow state transitions
- Log all state changes with timestamps
- Validate state transitions
- Prevent invalid state changes
- Store transition history

**FR-3**: System SHALL synchronize with real-time updates
- Merge server updates with local state
- Handle concurrent updates
- Resolve conflicts (server wins)
- Update UI automatically

**FR-4**: System SHALL support optimistic updates
- Update UI immediately on user action
- Rollback on server error
- Show pending state indicators
- Revalidate after mutation

**FR-5**: System SHALL persist state across navigation
- Maintain state when navigating between pages
- Restore state on page reload (if applicable)
- Clear state on logout

**FR-6**: System SHALL provide state selectors
- Select specific state slices
- Compute derived state
- Memoize selectors for performance
- Type-safe state access

### Acceptance Criteria

- [ ] **AC-1**: Workflow store implemented and accessible
- [ ] **AC-2**: State updates from multiple sources merge correctly
- [ ] **AC-3**: Optimistic updates work and rollback on error
- [ ] **AC-4**: State persists across page navigation
- [ ] **AC-5**: No prop drilling in component tree
- [ ] **AC-6**: State changes trigger minimal re-renders
- [ ] **AC-7**: TypeScript types prevent invalid state
- [ ] **AC-8**: State debugging tools work (Redux DevTools)
- [ ] **AC-9**: Unit tests verify state logic (>75% coverage)
- [ ] **AC-10**: Integration tests verify state sync
- [ ] **AC-11**: Code review approved

### Non-Functional Requirements

- **Performance**: State updates cause <50ms re-render time
- **Type Safety**: 100% TypeScript coverage, no `any`
- **Developer Experience**: Simple API, clear actions
- **Debugging**: Redux DevTools integration

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files**:
```
__tests__/store/workflow-store.test.ts
__tests__/hooks/useWorkflow.test.tsx
__tests__/integration/state-sync.test.tsx
```

**Example Tests**:
```typescript
// __tests__/store/workflow-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createWorkflowStore } from '@/store/workflow-store'

describe('Workflow Store', () => {
  let store: ReturnType<typeof createWorkflowStore>

  beforeEach(() => {
    store = createWorkflowStore()
  })

  it('should initialize with empty state', () => {
    const state = store.getState()

    expect(state.currentRequest).toBeNull()
    expect(state.quotes).toEqual([])
    expect(state.proposals).toEqual([])
  })

  it('should update request on setRequest', () => {
    const request = {
      id: 'req-123',
      status: 'CREATED',
      current_step: 1,
      total_steps: 5
    }

    store.getState().setRequest(request)

    expect(store.getState().currentRequest).toEqual(request)
  })

  it('should update workflow status', () => {
    const request = { id: 'req-123', status: 'CREATED' }
    store.getState().setRequest(request)

    store.getState().updateStatus('SEARCHING_FLIGHTS')

    expect(store.getState().currentRequest?.status).toBe('SEARCHING_FLIGHTS')
  })

  it('should add quote to list', () => {
    const quote = {
      id: 'quote-1',
      request_id: 'req-123',
      operator_name: 'Test Operator',
      base_price: 15000
    }

    store.getState().addQuote(quote)

    expect(store.getState().quotes).toHaveLength(1)
    expect(store.getState().quotes[0]).toEqual(quote)
  })

  it('should prevent duplicate quotes', () => {
    const quote = { id: 'quote-1', operator_name: 'Test' }

    store.getState().addQuote(quote)
    store.getState().addQuote(quote)

    expect(store.getState().quotes).toHaveLength(1)
  })

  it('should track state history', () => {
    store.getState().updateStatus('ANALYZING')
    store.getState().updateStatus('SEARCHING_FLIGHTS')

    const history = store.getState().stateHistory

    expect(history).toHaveLength(2)
    expect(history[0].status).toBe('ANALYZING')
    expect(history[1].status).toBe('SEARCHING_FLIGHTS')
  })

  it('should compute progress percentage', () => {
    const request = {
      id: 'req-123',
      current_step: 3,
      total_steps: 5
    }
    store.getState().setRequest(request)

    expect(store.getState().progress).toBe(60)
  })
})

// __tests__/hooks/useWorkflow.test.tsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useWorkflow } from '@/hooks/useWorkflow'
import { WorkflowProvider } from '@/providers/WorkflowProvider'

describe('useWorkflow hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WorkflowProvider>{children}</WorkflowProvider>
  )

  it('should provide workflow state', () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper })

    expect(result.current.currentRequest).toBeNull()
    expect(result.current.quotes).toEqual([])
  })

  it('should update request', () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper })

    act(() => {
      result.current.setRequest({
        id: 'req-123',
        status: 'CREATED'
      })
    })

    expect(result.current.currentRequest?.id).toBe('req-123')
  })

  it('should handle optimistic update', () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper })

    act(() => {
      result.current.setRequest({ id: 'req-123', status: 'CREATED' })
    })

    act(() => {
      result.current.optimisticUpdate('SEARCHING_FLIGHTS')
    })

    expect(result.current.currentRequest?.status).toBe('SEARCHING_FLIGHTS')
    expect(result.current.isPending).toBe(true)
  })

  it('should rollback on error', () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper })

    act(() => {
      result.current.setRequest({ id: 'req-123', status: 'CREATED' })
    })

    act(() => {
      result.current.optimisticUpdate('SEARCHING_FLIGHTS')
    })

    act(() => {
      result.current.rollback()
    })

    expect(result.current.currentRequest?.status).toBe('CREATED')
    expect(result.current.isPending).toBe(false)
  })
})
```

### Step 2: Implement State Management (Green Phase)

**Zustand Store**:
```typescript
// store/workflow-store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { FlightRequest, Quote, Proposal } from '@/lib/api-client/types'

interface StateHistoryEntry {
  status: string
  timestamp: Date
}

interface WorkflowState {
  // State
  currentRequest: FlightRequest | null
  quotes: Quote[]
  proposals: Proposal[]
  stateHistory: StateHistoryEntry[]
  isPending: boolean
  previousState: FlightRequest | null

  // Computed
  progress: number
  quoteCount: number

  // Actions
  setRequest: (request: FlightRequest) => void
  updateStatus: (status: string) => void
  updateProgress: (step: number, total: number) => void
  addQuote: (quote: Quote) => void
  setQuotes: (quotes: Quote[]) => void
  addProposal: (proposal: Proposal) => void
  setProposals: (proposals: Proposal[]) => void
  optimisticUpdate: (status: string) => void
  rollback: () => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentRequest: null,
        quotes: [],
        proposals: [],
        stateHistory: [],
        isPending: false,
        previousState: null,

        // Computed values
        get progress() {
          const request = get().currentRequest
          if (!request) return 0
          return Math.round((request.current_step / request.total_steps) * 100)
        },

        get quoteCount() {
          return get().quotes.length
        },

        // Actions
        setRequest: (request) => {
          set({ currentRequest: request })
        },

        updateStatus: (status) => {
          set((state) => {
            if (!state.currentRequest) return state

            // Add to history
            const historyEntry: StateHistoryEntry = {
              status,
              timestamp: new Date()
            }

            return {
              currentRequest: {
                ...state.currentRequest,
                status
              },
              stateHistory: [...state.stateHistory, historyEntry]
            }
          })
        },

        updateProgress: (step, total) => {
          set((state) => {
            if (!state.currentRequest) return state

            return {
              currentRequest: {
                ...state.currentRequest,
                current_step: step,
                total_steps: total
              }
            }
          })
        },

        addQuote: (quote) => {
          set((state) => {
            // Prevent duplicates
            const exists = state.quotes.some(q => q.id === quote.id)
            if (exists) return state

            return {
              quotes: [...state.quotes, quote]
            }
          })
        },

        setQuotes: (quotes) => {
          set({ quotes })
        },

        addProposal: (proposal) => {
          set((state) => {
            const exists = state.proposals.some(p => p.id === proposal.id)
            if (exists) return state

            return {
              proposals: [...state.proposals, proposal]
            }
          })
        },

        setProposals: (proposals) => {
          set({ proposals })
        },

        optimisticUpdate: (status) => {
          set((state) => ({
            previousState: state.currentRequest,
            isPending: true,
            currentRequest: state.currentRequest
              ? { ...state.currentRequest, status }
              : null
          }))
        },

        rollback: () => {
          set((state) => ({
            currentRequest: state.previousState,
            previousState: null,
            isPending: false
          }))
        },

        reset: () => {
          set({
            currentRequest: null,
            quotes: [],
            proposals: [],
            stateHistory: [],
            isPending: false,
            previousState: null
          })
        }
      }),
      {
        name: 'workflow-storage',
        partialize: (state) => ({
          currentRequest: state.currentRequest,
          stateHistory: state.stateHistory
        })
      }
    )
  )
)
```

**React Context Alternative**:
```typescript
// providers/WorkflowProvider.tsx
'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { FlightRequest, Quote, Proposal } from '@/lib/api-client/types'

type WorkflowAction =
  | { type: 'SET_REQUEST'; payload: FlightRequest }
  | { type: 'UPDATE_STATUS'; payload: string }
  | { type: 'ADD_QUOTE'; payload: Quote }
  | { type: 'SET_QUOTES'; payload: Quote[] }
  | { type: 'OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'ROLLBACK' }
  | { type: 'RESET' }

interface WorkflowState {
  currentRequest: FlightRequest | null
  quotes: Quote[]
  proposals: Proposal[]
  isPending: boolean
  previousState: FlightRequest | null
}

const initialState: WorkflowState = {
  currentRequest: null,
  quotes: [],
  proposals: [],
  isPending: false,
  previousState: null
}

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'SET_REQUEST':
      return {
        ...state,
        currentRequest: action.payload
      }

    case 'UPDATE_STATUS':
      if (!state.currentRequest) return state
      return {
        ...state,
        currentRequest: {
          ...state.currentRequest,
          status: action.payload
        }
      }

    case 'ADD_QUOTE':
      return {
        ...state,
        quotes: [...state.quotes, action.payload]
      }

    case 'SET_QUOTES':
      return {
        ...state,
        quotes: action.payload
      }

    case 'OPTIMISTIC_UPDATE':
      return {
        ...state,
        previousState: state.currentRequest,
        isPending: true,
        currentRequest: state.currentRequest
          ? { ...state.currentRequest, status: action.payload }
          : null
      }

    case 'ROLLBACK':
      return {
        ...state,
        currentRequest: state.previousState,
        previousState: null,
        isPending: false
      }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

const WorkflowContext = createContext<{
  state: WorkflowState
  dispatch: React.Dispatch<WorkflowAction>
} | null>(null)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState)

  return (
    <WorkflowContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflow() {
  const context = useContext(WorkflowContext)
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider')
  }

  const { state, dispatch } = context

  return {
    ...state,
    setRequest: (request: FlightRequest) =>
      dispatch({ type: 'SET_REQUEST', payload: request }),
    updateStatus: (status: string) =>
      dispatch({ type: 'UPDATE_STATUS', payload: status }),
    addQuote: (quote: Quote) =>
      dispatch({ type: 'ADD_QUOTE', payload: quote }),
    setQuotes: (quotes: Quote[]) =>
      dispatch({ type: 'SET_QUOTES', payload: quotes }),
    optimisticUpdate: (status: string) =>
      dispatch({ type: 'OPTIMISTIC_UPDATE', payload: status }),
    rollback: () =>
      dispatch({ type: 'ROLLBACK' }),
    reset: () =>
      dispatch({ type: 'RESET' })
  }
}
```

**Integration with Realtime**:
```typescript
// hooks/useWorkflowSync.ts
'use client'

import { useEffect } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'
import { useRealtimeRequests, useRealtimeQuotes } from '@/lib/realtime/hooks'

export function useWorkflowSync(requestId: string) {
  const { setRequest, updateStatus, addQuote } = useWorkflowStore()
  const { latestRequest } = useRealtimeRequests()
  const { quotes } = useRealtimeQuotes(requestId)

  // Sync request updates
  useEffect(() => {
    if (latestRequest && latestRequest.id === requestId) {
      setRequest(latestRequest)
    }
  }, [latestRequest, requestId, setRequest])

  // Sync quote updates
  useEffect(() => {
    quotes.forEach(quote => {
      addQuote(quote)
    })
  }, [quotes, addQuote])
}
```

---

## 4-11. STANDARD SECTIONS

[Following template structure]

**Dependencies**:
- TASK-022: Supabase Realtime Integration

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
