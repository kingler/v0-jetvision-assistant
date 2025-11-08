import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Integration Tests for Authentication Flow
 *
 * TDD RED PHASE: These tests verify end-to-end auth workflows
 * Expected behavior: ALL tests should FAIL initially
 *
 * Tests the integration between:
 * - Clerk authentication
 * - Supabase database
 * - Middleware protection
 * - User synchronization
 */

describe('Clerk + Supabase User Synchronization', () => {
  describe('User Creation Flow', () => {
    it('should sync user to Supabase after Clerk sign-up', async () => {
      const { userId } = await auth()

      expect(userId).toBeDefined()

      const supabase = await createClient()
      const { data: user, error } = await supabase
        .from('users')
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
      const { userId } = await auth()
      const supabase = await createClient()

      const { data: user } = await supabase
        .from('users')
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
      const { userId } = await auth()
      const clerkUser = await currentUser()
      const supabase = await createClient()

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

      const primaryEmail = clerkUser?.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      )

      expect(user?.email).toBe(primaryEmail?.emailAddress)
      expect(user?.full_name).toBe([clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' '))
    })
  })

  describe('User Update Flow', () => {
    it('should sync profile updates from Clerk to Supabase', async () => {
      const { userId } = await auth()
      const clerkUser = await currentUser()
      const supabase = await createClient()

      // Simulate profile update in Clerk (via webhook)
      const updatedEmail = 'updated@example.com'
      const updatedName = 'Updated Name'

      // Update in Supabase (this would happen via webhook)
      const { data: updated } = await supabase
        .from('users')
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
      const { userId } = await auth()
      const clerkUser = await currentUser()
      const supabase = await createClient()

      const primaryEmail = clerkUser?.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      )

      expect(primaryEmail?.verification?.status).toBe('verified')
    })
  })

  describe('User Deletion Flow', () => {
    it('should handle user deletion from Clerk', async () => {
      // This would be triggered by Clerk webhook when user is deleted
      const testUserId = 'user_test123'
      const supabase = await createClient()

      // Soft delete or mark inactive
      const { data: deleted } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('clerk_user_id', testUserId)
        .select()
        .single()

      expect(deleted?.is_active).toBe(false)
    })
  })
})

describe('Protected Routes Middleware', () => {
  describe('Authenticated Access', () => {
    it('should allow access to dashboard when authenticated', async () => {
      const { userId } = await auth()

      expect(userId).toBeDefined()

      // Simulate request to protected route
      const response = await fetch('http://localhost:3000/dashboard')

      expect(response.status).toBe(200)
      expect(response.url).toContain('/dashboard')
    })

    it('should allow access to /rfp routes when authenticated', async () => {
      const { userId } = await auth()

      expect(userId).toBeDefined()

      const response = await fetch('http://localhost:3000/rfp/new')
      expect(response.status).toBe(200)
    })

    it('should allow access to /clients routes when authenticated', async () => {
      const { userId } = await auth()

      expect(userId).toBeDefined()

      const response = await fetch('http://localhost:3000/clients')
      expect(response.status).toBe(200)
    })
  })

  describe('Unauthenticated Access', () => {
    it('should redirect to sign-in when accessing dashboard unauthenticated', async () => {
      // Mock unauthenticated state
      const response = await fetch('http://localhost:3000/dashboard')

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/sign-in')
    })

    it('should redirect to sign-in when accessing /rfp unauthenticated', async () => {
      const response = await fetch('http://localhost:3000/rfp/new')

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/sign-in')
    })

    it('should allow access to public routes', async () => {
      const publicRoutes = ['/', '/sign-in', '/sign-up', '/api/webhooks/clerk']

      for (const route of publicRoutes) {
        const response = await fetch(`http://localhost:3000${route}`)
        expect(response.status).not.toBe(302)
      }
    })
  })

  describe('Session Management', () => {
    it('should maintain session across page navigation', async () => {
      const { userId: userId1 } = await auth()

      // Simulate navigation
      await new Promise(resolve => setTimeout(resolve, 100))

      const { userId: userId2 } = await auth()

      expect(userId1).toBe(userId2)
    })

    it('should refresh session before expiration', async () => {
      const { sessionClaims: claims1 } = await auth()

      // Wait for potential refresh
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { sessionClaims: claims2 } = await auth()

      // Session should still be valid
      expect(claims2).toBeDefined()
    })

    it('should clear session on sign-out', async () => {
      // After sign-out
      const { userId } = await auth()

      expect(userId).toBeNull()
    })
  })
})

describe('API Route Protection', () => {
  describe('Protected API Routes', () => {
    it('should protect /api/requests with authentication', async () => {
      const response = await fetch('http://localhost:3000/api/requests', {
        method: 'GET',
      })

      // Should return 401 without auth
      expect(response.status).toBe(401)
    })

    it('should protect /api/quotes with authentication', async () => {
      const response = await fetch('http://localhost:3000/api/quotes', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
    })

    it('should allow authenticated requests to protected APIs', async () => {
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
  describe('User Created Webhook', () => {
    it('should handle user.created webhook event', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'user_test123',
          email_addresses: [
            {
              email_address: 'test@example.com',
              id: 'email_test123',
            },
          ],
          primary_email_address_id: 'email_test123',
          first_name: 'Test',
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

      // Verify user was created in Supabase
      const supabase = await createClient()
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', 'user_test123')
        .single()

      expect(user).toBeDefined()
      expect(user?.email).toBe('test@example.com')
    })
  })

  describe('User Updated Webhook', () => {
    it('should handle user.updated webhook event', async () => {
      const webhookPayload = {
        type: 'user.updated',
        data: {
          id: 'user_test123',
          email_addresses: [
            {
              email_address: 'updated@example.com',
              id: 'email_test123',
            },
          ],
          primary_email_address_id: 'email_test123',
          first_name: 'Updated',
          last_name: 'User',
        },
      }

      const response = await fetch('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      })

      expect(response.status).toBe(200)
    })
  })

  describe('User Deleted Webhook', () => {
    it('should handle user.deleted webhook event', async () => {
      const webhookPayload = {
        type: 'user.deleted',
        data: {
          id: 'user_test123',
        },
      }

      const response = await fetch('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      })

      expect(response.status).toBe(200)

      // Verify user was soft-deleted
      const supabase = await createClient()
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', 'user_test123')
        .single()

      expect(user?.is_active).toBe(false)
    })
  })
})

describe('Row Level Security (RLS)', () => {
  describe('User Data Isolation', () => {
    it('should only return data for authenticated user', async () => {
      const { userId } = await auth()
      const supabase = await createClient()

      const { data: requests } = await supabase
        .from('requests')
        .select('*')

      // All requests should belong to current user
      requests?.forEach(request => {
        expect(request.user_id).toBe(userId)
      })
    })

    it('should prevent access to other users data', async () => {
      const { userId } = await auth()
      const supabase = await createClient()

      // Try to access data from different user
      const otherUserId = 'user_different123'

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', otherUserId)

      // Should return empty array due to RLS
      expect(data).toEqual([])
    })
  })
})
