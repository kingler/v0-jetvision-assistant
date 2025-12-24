/**
 * Orchestrator Session Manager
 *
 * Manages session-based OrchestratorAgent instances for the chat interface.
 * Provides caching to maintain conversation state across multiple messages.
 */

import { AgentFactory } from '@agents/core'
import { AgentType, IAgent } from '@agents/core/types'

// Session cache with TTL tracking
interface SessionEntry {
  orchestrator: IAgent
  createdAt: number
  lastAccessedAt: number
}

const orchestratorCache = new Map<string, SessionEntry>()

// Session TTL: 30 minutes of inactivity
const SESSION_TTL_MS = 30 * 60 * 1000

/**
 * Get or create an OrchestratorAgent for a given session
 *
 * @param sessionId - Unique session identifier
 * @returns OrchestratorAgent instance
 */
export async function getOrCreateOrchestrator(
  sessionId: string
): Promise<IAgent> {
  const now = Date.now()

  // Check cache for existing session
  const cached = orchestratorCache.get(sessionId)
  if (cached) {
    // Update last accessed time
    cached.lastAccessedAt = now
    return cached.orchestrator
  }

  // Create new orchestrator
  const factory = AgentFactory.getInstance()
  const orchestrator = await factory.createAndInitialize({
    type: AgentType.ORCHESTRATOR,
    name: 'Chat Orchestrator',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  })

  // Cache the session
  orchestratorCache.set(sessionId, {
    orchestrator,
    createdAt: now,
    lastAccessedAt: now,
  })

  // Schedule cleanup of stale sessions
  scheduleSessionCleanup()

  return orchestrator
}

/**
 * Clear a specific orchestrator session
 *
 * @param sessionId - Session to clear
 */
export function clearOrchestratorSession(sessionId: string): void {
  const entry = orchestratorCache.get(sessionId)
  if (entry) {
    // Shutdown the orchestrator gracefully
    entry.orchestrator.shutdown?.().catch(console.error)
    orchestratorCache.delete(sessionId)
  }
}

/**
 * Clear all orchestrator sessions
 */
export function clearAllSessions(): void {
  for (const [sessionId, entry] of orchestratorCache) {
    entry.orchestrator.shutdown?.().catch(console.error)
    orchestratorCache.delete(sessionId)
  }
}

/**
 * Get session info for monitoring
 */
export function getSessionInfo(): {
  activeCount: number
  sessions: Array<{
    sessionId: string
    createdAt: number
    lastAccessedAt: number
    ageMs: number
  }>
} {
  const now = Date.now()
  const sessions: Array<{
    sessionId: string
    createdAt: number
    lastAccessedAt: number
    ageMs: number
  }> = []

  for (const [sessionId, entry] of orchestratorCache) {
    sessions.push({
      sessionId,
      createdAt: entry.createdAt,
      lastAccessedAt: entry.lastAccessedAt,
      ageMs: now - entry.createdAt,
    })
  }

  return {
    activeCount: orchestratorCache.size,
    sessions,
  }
}

// Cleanup tracking
let cleanupScheduled = false

function scheduleSessionCleanup(): void {
  if (cleanupScheduled) return
  cleanupScheduled = true

  // Run cleanup every 5 minutes
  setInterval(() => {
    cleanupStaleSessions()
  }, 5 * 60 * 1000)
}

function cleanupStaleSessions(): void {
  const now = Date.now()

  for (const [sessionId, entry] of orchestratorCache) {
    const timeSinceAccess = now - entry.lastAccessedAt
    if (timeSinceAccess > SESSION_TTL_MS) {
      console.log(`[OrchestratorSession] Cleaning up stale session: ${sessionId}`)
      clearOrchestratorSession(sessionId)
    }
  }
}
