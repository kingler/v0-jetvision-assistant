/**
 * Unit Tests for Orchestrator Session Manager
 *
 * Tests session caching, TTL, and cleanup functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getOrCreateOrchestrator,
  clearOrchestratorSession,
  clearAllSessions,
  getSessionInfo,
} from '@/lib/agents/orchestrator-session'

// Mock the AgentFactory
vi.mock('@agents/core', () => ({
  AgentFactory: {
    getInstance: vi.fn(() => ({
      createAndInitialize: vi.fn().mockResolvedValue({
        execute: vi.fn(),
        shutdown: vi.fn().mockResolvedValue(undefined),
      }),
    })),
  },
}))

describe('OrchestratorSessionManager', () => {
  beforeEach(() => {
    // Clear all sessions before each test
    clearAllSessions()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearAllSessions()
  })

  describe('getOrCreateOrchestrator', () => {
    it('should create a new orchestrator for a new session', async () => {
      const sessionId = 'test-session-1'
      const orchestrator = await getOrCreateOrchestrator(sessionId)

      expect(orchestrator).toBeDefined()
      expect(orchestrator.execute).toBeDefined()
      expect(orchestrator.shutdown).toBeDefined()
    })

    it('should return the same orchestrator for the same session', async () => {
      const sessionId = 'test-session-2'

      const orchestrator1 = await getOrCreateOrchestrator(sessionId)
      const orchestrator2 = await getOrCreateOrchestrator(sessionId)

      expect(orchestrator1).toBe(orchestrator2)
    })

    it('should return different orchestrators for different sessions', async () => {
      const sessionId1 = 'test-session-3'
      const sessionId2 = 'test-session-4'

      const orchestrator1 = await getOrCreateOrchestrator(sessionId1)
      const orchestrator2 = await getOrCreateOrchestrator(sessionId2)

      expect(orchestrator1).not.toBe(orchestrator2)
    })

    it('should update lastAccessedAt on cache hit', async () => {
      const sessionId = 'test-session-5'

      // Create initial session
      await getOrCreateOrchestrator(sessionId)
      const info1 = getSessionInfo()
      const initialLastAccess = info1.sessions[0].lastAccessedAt

      // Wait a bit and access again
      await new Promise((resolve) => setTimeout(resolve, 10))
      await getOrCreateOrchestrator(sessionId)
      const info2 = getSessionInfo()
      const updatedLastAccess = info2.sessions[0].lastAccessedAt

      expect(updatedLastAccess).toBeGreaterThan(initialLastAccess)
    })
  })

  describe('clearOrchestratorSession', () => {
    it('should remove a session from cache', async () => {
      const sessionId = 'test-session-6'

      await getOrCreateOrchestrator(sessionId)
      expect(getSessionInfo().activeCount).toBe(1)

      clearOrchestratorSession(sessionId)
      expect(getSessionInfo().activeCount).toBe(0)
    })

    it('should call shutdown on the orchestrator', async () => {
      const sessionId = 'test-session-7'
      const orchestrator = await getOrCreateOrchestrator(sessionId)

      clearOrchestratorSession(sessionId)

      expect(orchestrator.shutdown).toHaveBeenCalled()
    })

    it('should handle non-existent session gracefully', () => {
      expect(() => clearOrchestratorSession('non-existent')).not.toThrow()
    })
  })

  describe('clearAllSessions', () => {
    it('should remove all sessions', async () => {
      await getOrCreateOrchestrator('session-a')
      await getOrCreateOrchestrator('session-b')
      await getOrCreateOrchestrator('session-c')

      expect(getSessionInfo().activeCount).toBe(3)

      clearAllSessions()

      expect(getSessionInfo().activeCount).toBe(0)
    })

    it('should call shutdown on all orchestrators', async () => {
      const orchestrator1 = await getOrCreateOrchestrator('session-x')
      const orchestrator2 = await getOrCreateOrchestrator('session-y')

      clearAllSessions()

      expect(orchestrator1.shutdown).toHaveBeenCalled()
      expect(orchestrator2.shutdown).toHaveBeenCalled()
    })
  })

  describe('getSessionInfo', () => {
    it('should return empty info when no sessions exist', () => {
      const info = getSessionInfo()

      expect(info.activeCount).toBe(0)
      expect(info.sessions).toHaveLength(0)
    })

    it('should return correct session count', async () => {
      await getOrCreateOrchestrator('info-session-1')
      await getOrCreateOrchestrator('info-session-2')

      const info = getSessionInfo()

      expect(info.activeCount).toBe(2)
      expect(info.sessions).toHaveLength(2)
    })

    it('should include session metadata', async () => {
      const sessionId = 'info-session-3'
      await getOrCreateOrchestrator(sessionId)

      const info = getSessionInfo()
      const session = info.sessions.find((s) => s.sessionId === sessionId)

      expect(session).toBeDefined()
      expect(session?.createdAt).toBeTypeOf('number')
      expect(session?.lastAccessedAt).toBeTypeOf('number')
      expect(session?.ageMs).toBeGreaterThanOrEqual(0)
    })
  })
})
