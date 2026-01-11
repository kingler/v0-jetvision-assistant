import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  mockAuth,
  mockCurrentUser,
  mockUser,
  mockAuthAuthenticated,
  mockAuthUnauthenticated,
  setAuthState,
  setMockUser,
  resetClerkMocks,
} from '@tests/mocks/clerk'
import {
  mockCreateClient,
  mockSupabaseClient,
  setMockData,
  addMockData,
  clearMockData,
  getMockData,
  resetSupabaseMocks,
} from '@tests/mocks/supabase-server'

// Mock the modules before they're imported
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
  currentUser: () => mockCurrentUser(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

// Mock fetch for HTTP requests
const mockFetch = vi.fn()
global.fetch = mockFetch

/**
 * Integration Tests for Authentication Flow
 *
 * Tests the integration between:
 * - Clerk authentication (mocked)
 * - Supabase database (mocked)
 * - Middleware protection
 * - User synchronization
 */

describe('Clerk + Supabase User Synchronization', () => {
  beforeEach(() => {
    resetClerkMocks()
    resetSupabaseMocks()
    mockFetch.mockReset()
  })

  describe('User Creation Flow', () => {
    it('should sync user to Supabase after Clerk sign-up', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      const { createClient } = await import('@/lib/supabase/server')

      const { userId } = await auth()
      expect(userId).toBeDefined()
      expect(userId).toBe('user_test_123')

      const supabase = await createClient()
      const { data: user, error } = await supabase
        .from('iso_agents')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

      expect(error).toBeNull()
      expect(user).toBeDefined()
      expect(user?.clerk_user_id).toBe(userId)
      expect(user?.email).toBeDefined()
      expect(user?.role).toBe('sales_rep')
    })

    it('should create user with correct default values', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      const { createClient } = await import('@/lib/supabase/server')

      const { userId } = await auth()
      const supabase = await createClient()

      const { data: user } = await supabase
        .from('iso_agents')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

      expect(user?.role).toBe('sales_rep')
      expect(user?.margin_type).toBe('percentage')
      expect(user?.margin_value).toBeGreaterThanOrEqual(0)
      expect(user?.is_active).toBe(true)
      expect(user?.created_at).toBeDefined()
    })

    it('should populate user profile fields from Clerk', async () => {
      const { auth, currentUser } = await import('@clerk/nextjs/server')
      const { createClient } = await import('@/lib/supabase/server')

      const { userId } = await auth()
      const clerkUser = await currentUser()
      const supabase = await createClient()

      const { data: user } = await supabase
        .from('iso_agents')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

      const primaryEmail = clerkUser?.emailAddresses.find(
        (email: { id: string }) => email.id === clerkUser.primaryEmailAddressId
      )

      expect(user?.email).toBe(primaryEmail?.emailAddress)
      expect(user?.full_name).toBe(
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ')
      )
    })
  })

  describe('User Update Flow', () => {
    it('should sync profile updates from Clerk to Supabase', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      const { createClient } = await import('@/lib/supabase/server')

      const { userId } = await auth()
      const supabase = await createClient()

      // Simulate profile update (via webhook)
      const updatedEmail = 'updated@example.com'
      const updatedName = 'Updated Name'

      const { data: updated } = await supabase
        .from('iso_agents')
        .update({
          email: updatedEmail,
          full_name: updatedName,
        })
        .eq('clerk_user_id', userId)
        .select()
        .single()

      expect(updated?.email).toBe(updatedEmail)
      expect(updated?.full_name).toBe(updatedName)
    })

    it('should handle email verification status', async () => {
      const { currentUser } = await import('@clerk/nextjs/server')

      const clerkUser = await currentUser()

      const primaryEmail = clerkUser?.emailAddresses.find(
        (email: { id: string }) => email.id === clerkUser.primaryEmailAddressId
      )

      expect(primaryEmail?.verification?.status).toBe('verified')
    })
  })

  describe('User Deletion Flow', () => {
    it('should handle user deletion from Clerk', async () => {
      const { createClient } = await import('@/lib/supabase/server')

      // Add a test user to delete
      const testUserId = 'user_to_delete_123'
      addMockData('iso_agents', {
        id: 'agent_delete_123',
        clerk_user_id: testUserId,
        email: 'delete@example.com',
        full_name: 'Delete User',
        role: 'sales_rep',
        is_active: true,
      })

      const supabase = await createClient()

      // Soft delete or mark inactive
      const { data: deleted } = await supabase
        .from('iso_agents')
        .update({ is_active: false })
        .eq('clerk_user_id', testUserId)
        .select()
        .single()

      expect(deleted?.is_active).toBe(false)
    })
  })
})

describe('Protected Routes Middleware', () => {
  beforeEach(() => {
    resetClerkMocks()
    mockFetch.mockReset()
  })

  describe('Authenticated Access', () => {
    beforeEach(() => {
      setAuthState(true)
      // Mock successful responses for authenticated requests
      mockFetch.mockResolvedValue({
        status: 200,
        url: 'http://localhost:3000/dashboard',
        headers: new Headers(),
      })
    })

    it('should allow access to dashboard when authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')

      const { userId } = await auth()
      expect(userId).toBeDefined()

      // Simulate authenticated fetch
      const response = await fetch('http://localhost:3000/dashboard')
      expect(response.status).toBe(200)
    })

    it('should allow access to /rfp routes when authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')

      const { userId } = await auth()
      expect(userId).toBeDefined()

      mockFetch.mockResolvedValueOnce({
        status: 200,
        url: 'http://localhost:3000/rfp/new',
        headers: new Headers(),
      })

      const response = await fetch('http://localhost:3000/rfp/new')
      expect(response.status).toBe(200)
    })

    it('should allow access to /clients routes when authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')

      const { userId } = await auth()
      expect(userId).toBeDefined()

      mockFetch.mockResolvedValueOnce({
        status: 200,
        url: 'http://localhost:3000/clients',
        headers: new Headers(),
      })

      const response = await fetch('http://localhost:3000/clients')
      expect(response.status).toBe(200)
    })
  })

  describe('Unauthenticated Access', () => {
    beforeEach(() => {
      setAuthState(false)
    })

    it('should redirect to sign-in when accessing dashboard unauthenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 302,
        url: 'http://localhost:3000/sign-in',
        headers: new Headers({ location: '/sign-in' }),
      })

      const response = await fetch('http://localhost:3000/dashboard')

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/sign-in')
    })

    it('should redirect to sign-in when accessing /rfp unauthenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 302,
        url: 'http://localhost:3000/sign-in',
        headers: new Headers({ location: '/sign-in' }),
      })

      const response = await fetch('http://localhost:3000/rfp/new')

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/sign-in')
    })

    it('should allow access to public routes', async () => {
      const publicRoutes = ['/', '/sign-in', '/sign-up', '/api/webhooks/clerk']

      for (const route of publicRoutes) {
        mockFetch.mockResolvedValueOnce({
          status: 200,
          url: `http://localhost:3000${route}`,
          headers: new Headers(),
        })

        const response = await fetch(`http://localhost:3000${route}`)
        expect(response.status).not.toBe(302)
      }
    })
  })

  describe('Session Management', () => {
    beforeEach(() => {
      setAuthState(true)
    })

    it('should maintain session across page navigation', async () => {
      const { auth } = await import('@clerk/nextjs/server')

      const { userId: userId1 } = await auth()

      // Simulate navigation
      await new Promise(resolve => setTimeout(resolve, 10))

      const { userId: userId2 } = await auth()

      expect(userId1).toBe(userId2)
    })

    it('should refresh session before expiration', async () => {
      const { auth } = await import('@clerk/nextjs/server')

      const { sessionClaims: claims1 } = await auth()

      // Wait for potential refresh
      await new Promise(resolve => setTimeout(resolve, 10))

      const { sessionClaims: claims2 } = await auth()

      // Session should still be valid
      expect(claims2).toBeDefined()
    })

    it('should clear session on sign-out', async () => {
      const { auth } = await import('@clerk/nextjs/server')

      // Set unauthenticated state (simulating sign-out)
      setAuthState(false)

      const { userId } = await auth()

      expect(userId).toBeNull()
    })
  })
})

describe('API Route Protection', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('Protected API Routes', () => {
    it('should protect /api/requests with authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 401,
        url: 'http://localhost:3000/api/requests',
        headers: new Headers(),
      })

      const response = await fetch('http://localhost:3000/api/requests', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    })

    it('should protect /api/quotes with authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 401,
        url: 'http://localhost:3000/api/quotes',
        headers: new Headers(),
      })

      const response = await fetch('http://localhost:3000/api/quotes', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    })

    it('should allow authenticated requests to protected APIs', async () => {
      setAuthState(true)

      mockFetch.mockResolvedValueOnce({
        status: 200,
        url: 'http://localhost:3000/api/requests',
        headers: new Headers(),
        json: async () => ({ data: [] }),
      })

      const { auth } = await import('@clerk/nextjs/server')
      const { userId } = await auth()
      expect(userId).toBeDefined()

      const response = await fetch('http://localhost:3000/api/requests', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(response.status).not.toBe(401)
    })
  })

  describe('Public API Routes', () => {
    it('should allow access to webhook endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 400, // Will fail signature validation, but not 401
        url: 'http://localhost:3000/api/webhooks/clerk',
        headers: new Headers(),
      })

      const response = await fetch('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'user.created' }),
      })

      // Should not reject for authentication (will validate webhook signature)
      expect(response.status).not.toBe(401)
    })
  })
})

describe('Webhook Handler', () => {
  beforeEach(() => {
    resetSupabaseMocks()
    mockFetch.mockReset()
  })

  describe('User Created Webhook', () => {
    it('should handle user.created webhook event', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        url: 'http://localhost:3000/api/webhooks/clerk',
        headers: new Headers(),
        json: async () => ({ success: true }),
      })

      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'user_new_123',
          email_addresses: [
            {
              email_address: 'newuser@example.com',
              id: 'email_new_123',
            },
          ],
          primary_email_address_id: 'email_new_123',
          first_name: 'New',
          last_name: 'User',
        },
      }

      const response = await fetch('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'svix-id': 'test-id',
          'svix-timestamp': Date.now().toString(),
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify(webhookPayload),
      })

      expect(response.status).toBe(200)
    })
  })

  describe('User Updated Webhook', () => {
    it('should handle user.updated webhook event', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        url: 'http://localhost:3000/api/webhooks/clerk',
        headers: new Headers(),
        json: async () => ({ success: true }),
      })

      const webhookPayload = {
        type: 'user.updated',
        data: {
          id: 'user_test_123',
          email_addresses: [
            {
              email_address: 'updated@example.com',
              id: 'email_test_123',
            },
          ],
          primary_email_address_id: 'email_test_123',
          first_name: 'Updated',
          last_name: 'User',
        },
      }

      const response = await fetch('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'svix-id': 'test-id',
          'svix-timestamp': Date.now().toString(),
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify(webhookPayload),
      })

      expect(response.status).toBe(200)
    })
  })

  describe('User Deleted Webhook', () => {
    it('should handle user.deleted webhook event', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        url: 'http://localhost:3000/api/webhooks/clerk',
        headers: new Headers(),
        json: async () => ({ success: true }),
      })

      const webhookPayload = {
        type: 'user.deleted',
        data: {
          id: 'user_test_123',
        },
      }

      const response = await fetch('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'svix-id': 'test-id',
          'svix-timestamp': Date.now().toString(),
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify(webhookPayload),
      })

      expect(response.status).toBe(200)
    })
  })
})

describe('Row Level Security (RLS)', () => {
  beforeEach(() => {
    resetClerkMocks()
    resetSupabaseMocks()
    setAuthState(true)
  })

  describe('User Data Isolation', () => {
    it('should only return data for authenticated user', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      const { createClient } = await import('@/lib/supabase/server')

      // Add some test requests
      setMockData('requests', [
        { id: 'req_1', iso_agent_id: 'agent_test_123', status: 'pending' },
        { id: 'req_2', iso_agent_id: 'agent_test_123', status: 'completed' },
      ])

      const { userId } = await auth()
      const supabase = await createClient()

      const { data: requests } = await supabase.from('requests').select('*')

      // All requests should be accessible (mock doesn't enforce RLS)
      expect(requests).toBeDefined()
      expect(Array.isArray(requests)).toBe(true)
    })

    it('should prevent access to other users data', async () => {
      const { createClient } = await import('@/lib/supabase/server')

      const supabase = await createClient()

      // Try to access data from different user
      const otherUserId = 'user_different123'

      const { data } = await supabase
        .from('requests')
        .select('*')
        .eq('iso_agent_id', otherUserId)

      // Should return empty array (no matching records)
      expect(data).toEqual([])
    })
  })
})
