/**
 * Mock Supabase Server Client for Testing
 *
 * Provides a mock implementation of the Supabase server client
 * for use in integration tests without requiring cookies/headers.
 */

import { vi } from 'vitest'

// Mock data store for testing
let mockDataStore: Record<string, Record<string, unknown>[]> = {
  iso_agents: [
    {
      id: 'agent_test_123',
      clerk_user_id: 'user_test_123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'sales_rep',
      commission_percentage: 10,
      total_commission_earned: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  requests: [],
  quotes: [],
}

// Mock query builder
function createMockQueryBuilder(tableName: string) {
  let filters: Array<{ column: string; value: unknown }> = []
  let selectColumns = '*'
  let updateData: Record<string, unknown> | null = null
  let insertData: Record<string, unknown> | null = null
  let isSingle = false

  const builder = {
    select: (columns = '*') => {
      selectColumns = columns
      return builder
    },
    insert: (data: Record<string, unknown>) => {
      insertData = data
      return builder
    },
    update: (data: Record<string, unknown>) => {
      updateData = data
      return builder
    },
    delete: () => {
      return builder
    },
    eq: (column: string, value: unknown) => {
      filters.push({ column, value })
      return builder
    },
    single: () => {
      isSingle = true
      return builder
    },
    then: async (resolve: (result: { data: unknown; error: unknown }) => void) => {
      const tableData = mockDataStore[tableName] || []

      if (insertData) {
        const newRecord = {
          id: `${tableName}_${Date.now()}`,
          ...insertData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockDataStore[tableName] = [...tableData, newRecord]
        return resolve({ data: isSingle ? newRecord : [newRecord], error: null })
      }

      if (updateData) {
        const updatedRecords = tableData
          .filter(record => filters.every(f => record[f.column] === f.value))
          .map(record => ({ ...record, ...updateData, updated_at: new Date().toISOString() }))

        if (updatedRecords.length === 0) {
          return resolve({ data: null, error: null })
        }

        mockDataStore[tableName] = tableData.map(record => {
          const recordId = (record as { id?: string }).id
          const updated = updatedRecords.find(u => (u as { id?: string }).id === recordId)
          return updated || record
        })

        return resolve({ data: isSingle ? updatedRecords[0] : updatedRecords, error: null })
      }

      // Select query
      let result = tableData.filter(record =>
        filters.every(f => record[f.column] === f.value)
      )

      if (isSingle) {
        return resolve({
          data: result.length > 0 ? result[0] : null,
          error: result.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null,
        })
      }

      return resolve({ data: result, error: null })
    },
  }

  // Make it thenable
  ;(builder as any)[Symbol.toStringTag] = 'Promise'

  return builder
}

// Mock Supabase client
export const mockSupabaseClient = {
  from: (tableName: string) => createMockQueryBuilder(tableName),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'user_test_123', email: 'test@example.com' } },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user_test_123' } } },
      error: null,
    }),
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}

// Mock createClient function
export const mockCreateClient = vi.fn().mockResolvedValue(mockSupabaseClient)

// Helper to set mock data
export function setMockData(table: string, data: Record<string, unknown>[]) {
  mockDataStore[table] = data
}

// Helper to add mock data
export function addMockData(table: string, record: Record<string, unknown>) {
  if (!mockDataStore[table]) {
    mockDataStore[table] = []
  }
  mockDataStore[table].push(record)
}

// Helper to clear mock data
export function clearMockData(table?: string) {
  if (table) {
    mockDataStore[table] = []
  } else {
    mockDataStore = {
      iso_agents: [],
      requests: [],
      quotes: [],
    }
  }
}

// Helper to get mock data
export function getMockData(table: string) {
  return mockDataStore[table] || []
}

// Reset all mocks
export function resetSupabaseMocks() {
  mockCreateClient.mockReset()
  mockCreateClient.mockResolvedValue(mockSupabaseClient)
  mockDataStore = {
    iso_agents: [
      {
        id: 'agent_test_123',
        clerk_user_id: 'user_test_123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'sales_rep',
        commission_percentage: 10,
        total_commission_earned: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    requests: [],
    quotes: [],
  }
}
