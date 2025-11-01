# API Client & Data Fetching Layer

**Task ID**: TASK-021
**Created**: 2025-10-20
**Assigned To**: Frontend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Create a typed API client library with comprehensive error handling, retry logic, and custom React hooks for data fetching (useRequests, useQuotes, useProposals) with loading states, error states, and optimistic updates for the Jetvision application.

### User Story
**As a** frontend developer
**I want** a clean API client with React hooks
**So that** I can easily fetch and mutate data with proper error handling and loading states

### Business Value
A well-designed API client layer abstracts network complexity, provides consistent error handling, enables optimistic UI updates, and improves developer productivity. It ensures type safety across the application and centralizes API logic for easier maintenance.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement typed API client
- All API endpoints typed with request/response interfaces
- HTTP methods: GET, POST, PATCH, DELETE
- Automatic authentication token injection
- Base URL configuration
- Request/response interceptors

**FR-2**: System SHALL implement error handling
- Parse API errors into user-friendly messages
- Handle network errors (timeout, offline)
- Handle authentication errors (401, 403)
- Handle validation errors (400)
- Handle server errors (500)
- Retry failed requests with exponential backoff

**FR-3**: System SHALL implement React hooks for requests
- useRequests(filters) - List requests with pagination
- useRequest(id) - Get single request
- useCreateRequest() - Create new request
- useUpdateRequest() - Update request
- useDeleteRequest() - Delete/cancel request

**FR-4**: System SHALL implement React hooks for quotes
- useQuotes(requestId) - Get quotes for request
- useAnalyzeQuotes(quoteId) - Trigger analysis

**FR-5**: System SHALL implement React hooks for proposals
- useProposals(requestId) - Get proposals for request
- useSendProposal(proposalId) - Send proposal email

**FR-6**: System SHALL implement loading and error states
- isLoading flag during requests
- error object with user-friendly message
- isValidating flag for background revalidation
- isStale flag for cached data

**FR-7**: System SHALL implement optimistic updates
- Optimistically update UI before server response
- Rollback on error
- Revalidate after mutation
- Show loading indicators during server sync

**FR-8**: System SHALL implement caching strategy
- Cache GET requests with SWR (stale-while-revalidate)
- Configurable TTL per endpoint
- Manual cache invalidation
- Cache key generation

### Acceptance Criteria

- [ ] **AC-1**: API client supports all HTTP methods
- [ ] **AC-2**: All endpoints properly typed with TypeScript
- [ ] **AC-3**: Authentication tokens automatically injected
- [ ] **AC-4**: Error handling catches and formats all error types
- [ ] **AC-5**: Retry logic works with exponential backoff
- [ ] **AC-6**: All React hooks implemented and tested
- [ ] **AC-7**: Loading states update correctly
- [ ] **AC-8**: Error states display user-friendly messages
- [ ] **AC-9**: Optimistic updates work and rollback on error
- [ ] **AC-10**: Caching reduces unnecessary API calls
- [ ] **AC-11**: Unit tests achieve >80% coverage
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: Cache hit rate >70%, reduce API calls by 50%
- **Reliability**: Retry logic handles transient failures
- **Type Safety**: 100% TypeScript coverage, no `any` types
- **Developer Experience**: Simple, intuitive hook API

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/lib/api-client/client.test.ts
__tests__/lib/api-client/error-handling.test.ts
__tests__/lib/api-client/retry-logic.test.ts
__tests__/hooks/useRequests.test.tsx
__tests__/hooks/useRequest.test.tsx
__tests__/hooks/useCreateRequest.test.tsx
__tests__/hooks/useQuotes.test.tsx
```

**Example Tests**:
```typescript
// __tests__/lib/api-client/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/lib/api-client'

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET requests', () => {
    it('should make GET request with auth token', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' })
      } as Response)

      await apiClient.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/Bearer .+/)
          })
        })
      )
    })

    it('should return parsed JSON response', async () => {
      const mockData = { id: '123', name: 'Test' }
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockData
      } as Response)

      const result = await apiClient.get('/test')

      expect(result).toEqual(mockData)
    })
  })

  describe('POST requests', () => {
    it('should make POST request with body', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      const body = { name: 'Test', value: 123 }
      await apiClient.post('/test', body)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should throw error for 404 response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      } as Response)

      await expect(apiClient.get('/test')).rejects.toThrow('Not found')
    })

    it('should throw error for 500 response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      } as Response)

      await expect(apiClient.get('/test')).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

      await expect(apiClient.get('/test')).rejects.toThrow('Network error')
    })
  })

  describe('Retry logic', () => {
    it('should retry on transient failures', async () => {
      const mockFetch = vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)

      const result = await apiClient.get('/test', { retry: true })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })

    it('should respect max retry attempts', async () => {
      const mockFetch = vi.spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Always fails'))

      await expect(
        apiClient.get('/test', { retry: true, maxRetries: 3 })
      ).rejects.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })
  })
})

// __tests__/hooks/useRequests.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useRequests } from '@/lib/api-client/hooks'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn()
  }
}))

describe('useRequests hook', () => {
  it('should fetch requests on mount', async () => {
    const mockRequests = {
      requests: [
        { id: 'req-1', status: 'PENDING' },
        { id: 'req-2', status: 'COMPLETED' }
      ],
      pagination: { page: 1, limit: 20, total: 2 }
    }

    vi.mocked(apiClient.get).mockResolvedValue(mockRequests)

    const { result } = renderHook(() => useRequests())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockRequests)
    expect(result.current.error).toBeNull()
  })

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch')
    vi.mocked(apiClient.get).mockRejectedValue(error)

    const { result } = renderHook(() => useRequests())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeNull()
  })

  it('should support filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ requests: [], pagination: {} })

    renderHook(() => useRequests({ status: 'COMPLETED', page: 2 }))

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=COMPLETED'),
        expect.any(Object)
      )
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      )
    })
  })

  it('should refetch when filters change', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ requests: [], pagination: {} })

    const { rerender } = renderHook(
      ({ filters }) => useRequests(filters),
      { initialProps: { filters: { page: 1 } } }
    )

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(1)
    })

    rerender({ filters: { page: 2 } })

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2)
    })
  })
})

// __tests__/hooks/useCreateRequest.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useCreateRequest } from '@/lib/api-client/hooks'

describe('useCreateRequest hook', () => {
  it('should create request and return data', async () => {
    const mockRequest = { id: 'req-123', status: 'CREATED' }
    vi.mocked(apiClient.post).mockResolvedValue(mockRequest)

    const { result } = renderHook(() => useCreateRequest())

    let createdRequest
    await act(async () => {
      createdRequest = await result.current.mutate({
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        passengers: 4,
        departure_date: '2025-11-15'
      })
    })

    expect(createdRequest).toEqual(mockRequest)
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/requests',
      expect.objectContaining({
        departure_airport: 'TEB',
        arrival_airport: 'VNY'
      })
    )
  })

  it('should handle creation errors', async () => {
    const error = new Error('Validation failed')
    vi.mocked(apiClient.post).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateRequest())

    await act(async () => {
      try {
        await result.current.mutate({ departure_airport: 'TEB' })
      } catch (e) {
        // Expected
      }
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should show loading state during creation', async () => {
    vi.mocked(apiClient.post).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ id: '123' }), 100))
    )

    const { result } = renderHook(() => useCreateRequest())

    act(() => {
      result.current.mutate({ departure_airport: 'TEB' })
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should support optimistic updates', async () => {
    const { result } = renderHook(() => useCreateRequest({
      optimisticData: (data) => ({ ...data, id: 'temp-123', status: 'CREATING' })
    }))

    let optimisticData
    act(() => {
      optimisticData = result.current.mutate({ departure_airport: 'TEB' })
    })

    expect(optimisticData).toMatchObject({ id: 'temp-123' })
  })
})
```

**Run Tests** (should FAIL):
```bash
npm test
# Expected: Tests fail because API client doesn't exist yet
```

### Step 2: Implement API Client (Green Phase)

**API Client Implementation**:
```typescript
// lib/api-client/client.ts
import { auth } from '@clerk/nextjs/server'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  retry?: boolean
  maxRetries?: number
  timeout?: number
  cache?: RequestCache
}

class APIClient {
  private baseURL: string
  private defaultTimeout = 30000 // 30 seconds

  constructor(baseURL?: string) {
    this.baseURL = baseURL || process.env.NEXT_PUBLIC_API_URL || ''
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { getToken } = auth()
      return await getToken()
    } catch {
      return null
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & RequestOptions = {}
  ): Promise<T> {
    const {
      retry = false,
      maxRetries = 3,
      timeout = this.defaultTimeout,
      ...fetchOptions
    } = options

    const url = `${this.baseURL}${endpoint}`

    // Get auth token
    const token = await this.getAuthToken()

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Retry logic
    let lastError: Error | null = null
    const attempts = retry ? maxRetries + 1 : 1

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        // Handle non-OK responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new ApiError(
            errorData.error || `Request failed with status ${response.status}`,
            response.status,
            errorData
          )
        }

        // Parse and return JSON
        return await response.json()
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (4xx)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          throw error
        }

        // Retry on network errors and 5xx
        if (attempt < attempts - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        throw lastError
      }
    }

    throw lastError!
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new APIClient()
```

**Types**:
```typescript
// lib/api-client/types.ts
export interface FlightRequest {
  id: string
  user_id: string
  client_id?: string
  departure_airport: string
  arrival_airport: string
  passengers: number
  departure_date: string
  status: RequestStatus
  current_step: number
  total_steps: number
  created_at: string
  updated_at: string
}

export type RequestStatus =
  | 'CREATED'
  | 'ANALYZING'
  | 'FETCHING_CLIENT_DATA'
  | 'SEARCHING_FLIGHTS'
  | 'AWAITING_QUOTES'
  | 'ANALYZING_PROPOSALS'
  | 'GENERATING_EMAIL'
  | 'SENDING_PROPOSAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export interface Quote {
  id: string
  request_id: string
  operator_name: string
  aircraft_type: string
  base_price: number
  response_time: number
  specifications: {
    capacity: number
    range: number
    speed: number
    category: string
  }
  rating: number
  score: number
  created_at: string
}

export interface Proposal {
  id: string
  request_id: string
  quote_id: string
  markup_type: 'fixed' | 'percentage'
  markup_value: number
  total_price: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  sent_at?: string
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface RequestsFilters {
  page?: number
  limit?: number
  status?: RequestStatus
  sort?: 'created_at' | 'departure_date' | 'status'
  order?: 'asc' | 'desc'
}
```

**React Hooks**:
```typescript
// lib/api-client/hooks.ts
import { useState, useEffect, useCallback } from 'react'
import { apiClient } from './client'
import {
  FlightRequest,
  Quote,
  Proposal,
  RequestsFilters,
  PaginatedResponse
} from './types'

interface UseQueryResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  isLoading: boolean
  error: Error | null
}

// useRequests - List requests with filters
export function useRequests(filters?: RequestsFilters): UseQueryResult<PaginatedResponse<FlightRequest>> {
  const [data, setData] = useState<PaginatedResponse<FlightRequest> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.status) params.append('status', filters.status)
      if (filters?.sort) params.append('sort', filters.sort)
      if (filters?.order) params.append('order', filters.order)

      const result = await apiClient.get<PaginatedResponse<FlightRequest>>(
        `/api/requests?${params.toString()}`
      )

      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return { data, isLoading, error, refetch: fetchRequests }
}

// useRequest - Get single request
export function useRequest(id: string): UseQueryResult<FlightRequest> {
  const [data, setData] = useState<FlightRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRequest = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await apiClient.get<FlightRequest>(`/api/requests/${id}`)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRequest()
  }, [fetchRequest])

  return { data, isLoading, error, refetch: fetchRequest }
}

// useCreateRequest - Create new request
export function useCreateRequest(): UseMutationResult<FlightRequest, Partial<FlightRequest>> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = async (requestData: Partial<FlightRequest>) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await apiClient.post<FlightRequest>('/api/requests', requestData)
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { mutate, isLoading, error }
}

// useUpdateRequest - Update request
export function useUpdateRequest(id: string): UseMutationResult<FlightRequest, Partial<FlightRequest>> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = async (updates: Partial<FlightRequest>) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await apiClient.patch<FlightRequest>(`/api/requests/${id}`, updates)
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { mutate, isLoading, error }
}

// useQuotes - Get quotes for request
export function useQuotes(requestId: string): UseQueryResult<Quote[]> {
  const [data, setData] = useState<Quote[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchQuotes = useCallback(async () => {
    if (!requestId) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await apiClient.get<Quote[]>(`/api/requests/${requestId}/quotes`)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  return { data, isLoading, error, refetch: fetchQuotes }
}

// useProposals - Get proposals for request
export function useProposals(requestId: string): UseQueryResult<Proposal[]> {
  const [data, setData] = useState<Proposal[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProposals = useCallback(async () => {
    if (!requestId) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await apiClient.get<Proposal[]>(`/api/requests/${requestId}/proposals`)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  return { data, isLoading, error, refetch: fetchProposals }
}
```

**Run Tests Again**:
```bash
npm test
# Expected: Tests now pass ✓
```

### Step 3: Refactor (Blue Phase)

**Refactoring Checklist**:
- [ ] Extract common hook logic
- [ ] Add request deduplication
- [ ] Implement proper caching
- [ ] Add TypeScript strict mode
- [ ] Improve error messages

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md API Endpoints section
- [ ] TASK-018 (API Routes) completed
- [ ] TypeScript configured properly
- [ ] Testing library installed

### Step-by-Step Implementation

**Step 1**: Create API client structure
```bash
mkdir -p lib/api-client
touch lib/api-client/client.ts
touch lib/api-client/types.ts
touch lib/api-client/hooks.ts
touch lib/api-client/index.ts
```

**Step 2**: Implement base API client with error handling

**Step 3**: Add retry logic with exponential backoff

**Step 4**: Implement TypeScript types for all API responses

**Step 5**: Create React hooks for data fetching

**Step 6**: Add optimistic updates support

**Step 7**: Implement caching strategy (optional: use SWR or React Query)

**Step 8**: Write comprehensive tests

### Implementation Validation

- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] Retry logic tested manually

---

## 5. GIT WORKFLOW

```bash
git checkout -b feature/api-client-data-fetching

# Commit client
git add lib/api-client/client.ts lib/api-client/types.ts
git commit -m "feat(api): implement typed API client with retry logic"

# Commit hooks
git add lib/api-client/hooks.ts
git commit -m "feat(api): implement React hooks for data fetching"

# Commit tests
git add __tests__/lib/api-client/
git commit -m "test(api): add comprehensive tests for API client"

git push origin feature/api-client-data-fetching
```

---

## 6-11. STANDARD SECTIONS

[Following template structure]

**Dependencies**:
- TASK-018: Complete API Routes Layer

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
