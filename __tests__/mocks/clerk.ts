/**
 * Mock Clerk Authentication for Testing
 *
 * Provides mock implementations of Clerk server functions
 * for use in integration tests without requiring a real Clerk instance.
 */

import { vi } from 'vitest'

export interface MockUser {
  id: string
  emailAddresses: Array<{
    id: string
    emailAddress: string
    verification?: { status: string }
  }>
  primaryEmailAddressId: string
  firstName: string | null
  lastName: string | null
}

export interface MockAuth {
  userId: string | null
  sessionId: string | null
  sessionClaims: Record<string, unknown> | null
}

// Default mock user
export const mockUser: MockUser = {
  id: 'user_test_123',
  emailAddresses: [
    {
      id: 'email_test_123',
      emailAddress: 'test@example.com',
      verification: { status: 'verified' },
    },
  ],
  primaryEmailAddressId: 'email_test_123',
  firstName: 'Test',
  lastName: 'User',
}

// Default mock auth (authenticated)
export const mockAuthAuthenticated: MockAuth = {
  userId: 'user_test_123',
  sessionId: 'session_test_123',
  sessionClaims: {
    sub: 'user_test_123',
    iat: Date.now(),
    exp: Date.now() + 3600000,
  },
}

// Mock auth (unauthenticated)
export const mockAuthUnauthenticated: MockAuth = {
  userId: null,
  sessionId: null,
  sessionClaims: null,
}

// Mock functions
export const mockAuth = vi.fn().mockResolvedValue(mockAuthAuthenticated)
export const mockCurrentUser = vi.fn().mockResolvedValue(mockUser)

// Helper to set authenticated state
export function setAuthState(authenticated: boolean) {
  if (authenticated) {
    mockAuth.mockResolvedValue(mockAuthAuthenticated)
    mockCurrentUser.mockResolvedValue(mockUser)
  } else {
    mockAuth.mockResolvedValue(mockAuthUnauthenticated)
    mockCurrentUser.mockResolvedValue(null)
  }
}

// Helper to set custom user
export function setMockUser(user: MockUser | null) {
  mockCurrentUser.mockResolvedValue(user)
  if (user) {
    mockAuth.mockResolvedValue({
      userId: user.id,
      sessionId: 'session_test_123',
      sessionClaims: { sub: user.id },
    })
  } else {
    mockAuth.mockResolvedValue(mockAuthUnauthenticated)
  }
}

// Reset mocks to default state
export function resetClerkMocks() {
  mockAuth.mockReset()
  mockCurrentUser.mockReset()
  mockAuth.mockResolvedValue(mockAuthAuthenticated)
  mockCurrentUser.mockResolvedValue(mockUser)
}
