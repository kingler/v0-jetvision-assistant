# Error Monitor Agent Implementation

**Task ID**: TASK-017
**Created**: 2025-10-20
**Assigned To**: Backend Developer / DevOps Engineer
**Status**: `pending`
**Priority**: `normal`
**Estimated Time**: 6 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement the Error Monitor Agent to detect and analyze errors across the system, integrate with Sentry for error tracking, implement automatic recovery workflows for common failures, develop escalation logic for critical errors, and perform error pattern analysis to prevent future issues.

### User Story
**As a** system administrator
**I want** the system to automatically detect, analyze, and recover from errors
**So that** workflows continue smoothly with minimal manual intervention

### Business Value
The Error Monitor Agent provides system resilience by automatically detecting and recovering from transient errors, reducing downtime and manual intervention. It improves system reliability, provides visibility into error patterns, and enables proactive issue resolution before they impact users.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL detect errors across all agents and services
- Monitor agent execution failures
- Track API errors and timeouts
- Detect database connection issues
- Identify MCP server failures
- Capture OpenAI API errors

**FR-2**: System SHALL integrate with Sentry
- Send error events to Sentry
- Include stack traces and context
- Tag errors by severity and component
- Track user sessions for debugging
- Scrub PII before logging

**FR-3**: System SHALL implement automatic recovery workflows
- Retry transient failures with exponential backoff
- Restart failed MCP server connections
- Clear cache on data inconsistency
- Reset workflow state on deadlock
- Trigger alternative execution paths

**FR-4**: System SHALL implement escalation logic
- Alert on repeated failures (3+ times)
- Escalate critical errors immediately
- Notify administrators via email/Slack
- Create incident tickets automatically
- Track escalation status

**FR-5**: System SHALL perform error pattern analysis
- Group similar errors
- Identify recurring issues
- Calculate error frequency and trends
- Detect anomalies in error rates
- Generate weekly error reports

### Acceptance Criteria

- [ ] **AC-1**: Error Monitor Agent implemented
- [ ] **AC-2**: Sentry integration captures all errors
- [ ] **AC-3**: Automatic recovery succeeds for 80%+ of transient errors
- [ ] **AC-4**: Escalation triggers correctly for critical errors
- [ ] **AC-5**: Error pattern analysis identifies trends
- [ ] **AC-6**: Unit tests achieve >75% coverage
- [ ] **AC-7**: Integration tests verify error handling
- [ ] **AC-8**: Error detection completes in <1 second
- [ ] **AC-9**: Code review approved

### Non-Functional Requirements

- **Performance**: Error detection <1s, recovery <5s
- **Reliability**: 100% error capture rate
- **Security**: PII scrubbed before logging
- **Observability**: Complete error visibility

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/agents/error-monitor.test.ts
__tests__/integration/agents/error-recovery.test.ts
```

**Example Test**:
```typescript
// __tests__/unit/agents/error-monitor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorMonitorAgent } from '@/lib/agents/error-monitor'

describe('ErrorMonitorAgent', () => {
  let agent: ErrorMonitorAgent

  beforeEach(() => {
    agent = new ErrorMonitorAgent({
      sentryDsn: process.env.SENTRY_DSN!,
      supabase: createClient()
    })
  })

  describe('Error Detection', () => {
    it('should detect agent execution failures', async () => {
      const error = new Error('Agent failed')
      const detected = await agent.detectError({
        component: 'FlightSearchAgent',
        error,
        context: { request_id: 'req-123' }
      })

      expect(detected).toBeTruthy()
      expect(detected.severity).toBe('error')
    })

    it('should categorize error types', async () => {
      const networkError = new Error('ECONNREFUSED')
      const detected = await agent.detectError({
        component: 'AvinodeMCP',
        error: networkError
      })

      expect(detected.category).toBe('network')
      expect(detected.is_transient).toBe(true)
    })

    it('should extract error context', async () => {
      const error = new Error('Database query failed')
      const detected = await agent.detectError({
        component: 'Database',
        error,
        context: {
          query: 'SELECT * FROM users',
          user_id: 'user-123'
        }
      })

      expect(detected.context).toHaveProperty('query')
      expect(detected.context).not.toHaveProperty('user_id') // PII scrubbed
    })
  })

  describe('Sentry Integration', () => {
    it('should send errors to Sentry', async () => {
      const sentrySpy = vi.spyOn(agent, 'sendToSentry')

      await agent.reportError({
        error: new Error('Test error'),
        component: 'TestComponent'
      })

      expect(sentrySpy).toHaveBeenCalled()
    })

    it('should include stack traces', async () => {
      const error = new Error('Test error')
      const reported = await agent.reportError({
        error,
        component: 'TestComponent'
      })

      expect(reported.stack_trace).toBeDefined()
    })

    it('should scrub PII before logging', async () => {
      const error = new Error('Failed for user@example.com')
      const reported = await agent.reportError({
        error,
        context: {
          email: 'user@example.com',
          ssn: '123-45-6789'
        }
      })

      expect(reported.message).not.toContain('user@example.com')
      expect(reported.context.email).toBe('[REDACTED]')
      expect(reported.context.ssn).toBe('[REDACTED]')
    })
  })

  describe('Automatic Recovery', () => {
    it('should retry transient failures', async () => {
      let attempts = 0
      const failingOperation = async () => {
        attempts++
        if (attempts < 3) throw new Error('Transient error')
        return 'success'
      }

      const result = await agent.attemptRecovery(failingOperation, {
        max_retries: 3,
        backoff: 'exponential'
      })

      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should use exponential backoff', async () => {
      const delays: number[] = []
      const failingOperation = async () => {
        throw new Error('Always fails')
      }

      try {
        await agent.attemptRecovery(failingOperation, {
          max_retries: 3,
          backoff: 'exponential',
          initial_delay_ms: 100,
          onRetry: (delay: number) => delays.push(delay)
        })
      } catch (e) {}

      expect(delays[0]).toBe(100)
      expect(delays[1]).toBe(200)
      expect(delays[2]).toBe(400)
    })

    it('should restart failed MCP connections', async () => {
      const mcpError = { code: 'ECONNRESET', server: 'avinode' }

      const recovered = await agent.recoverFromError({
        category: 'network',
        component: 'AvinodeMCP',
        error: mcpError
      })

      expect(recovered).toBe(true)
    })

    it('should clear cache on data inconsistency', async () => {
      const cacheError = { type: 'stale_data' }

      const recovered = await agent.recoverFromError({
        category: 'data',
        component: 'ClientCache',
        error: cacheError
      })

      expect(recovered).toBe(true)
    })
  })

  describe('Escalation Logic', () => {
    it('should escalate after 3 failures', async () => {
      const error = new Error('Recurring error')

      await agent.reportError({ error, component: 'TestComponent' })
      await agent.reportError({ error, component: 'TestComponent' })
      const result = await agent.reportError({ error, component: 'TestComponent' })

      expect(result.escalated).toBe(true)
    })

    it('should escalate critical errors immediately', async () => {
      const criticalError = new Error('Database connection lost')

      const result = await agent.reportError({
        error: criticalError,
        component: 'Database',
        severity: 'critical'
      })

      expect(result.escalated).toBe(true)
    })

    it('should notify administrators', async () => {
      const notifySpy = vi.spyOn(agent, 'notifyAdministrators')

      await agent.escalateError({
        error: new Error('Critical failure'),
        severity: 'critical'
      })

      expect(notifySpy).toHaveBeenCalled()
    })
  })

  describe('Error Pattern Analysis', () => {
    it('should group similar errors', async () => {
      await agent.reportError({ error: new Error('Network timeout'), component: 'API' })
      await agent.reportError({ error: new Error('Network timeout'), component: 'API' })
      await agent.reportError({ error: new Error('Different error'), component: 'API' })

      const patterns = await agent.analyzeErrorPatterns()

      expect(patterns).toHaveLength(2)
      expect(patterns[0].count).toBe(2)
    })

    it('should calculate error frequency', async () => {
      const now = Date.now()
      for (let i = 0; i < 10; i++) {
        await agent.reportError({
          error: new Error('Test error'),
          timestamp: now + (i * 1000)
        })
      }

      const frequency = await agent.calculateErrorFrequency('Test error')

      expect(frequency.per_hour).toBeGreaterThan(0)
    })

    it('should detect anomalies', async () => {
      // Simulate normal error rate
      for (let i = 0; i < 10; i++) {
        await agent.reportError({ error: new Error('Normal error') })
      }

      // Simulate spike
      for (let i = 0; i < 100; i++) {
        await agent.reportError({ error: new Error('Spike error') })
      }

      const anomalies = await agent.detectAnomalies()

      expect(anomalies).toContain('Spike error')
    })
  })
})
```

### Step 2: Implement Minimal Code (Green Phase)

```typescript
// lib/agents/error-monitor.ts
import * as Sentry from '@sentry/nextjs'
import { SupabaseClient } from '@supabase/supabase-js'

interface ErrorMonitorConfig {
  sentryDsn: string
  supabase: SupabaseClient
}

export class ErrorMonitorAgent {
  private supabase: SupabaseClient
  private errorCounts: Map<string, number> = new Map()

  constructor(config: ErrorMonitorConfig) {
    this.supabase = config.supabase

    Sentry.init({
      dsn: config.sentryDsn,
      tracesSampleRate: 1.0,
      beforeSend: (event) => this.scrubPII(event)
    })
  }

  /**
   * Detect and categorize error
   */
  async detectError(params: {
    component: string
    error: Error
    context?: any
  }): Promise<any> {
    const category = this.categorizeError(params.error)
    const isTransient = this.isTransientError(params.error)

    return {
      component: params.component,
      error: params.error,
      category,
      is_transient: isTransient,
      severity: this.determineSeverity(params.error, category),
      context: this.scrubContext(params.context || {})
    }
  }

  /**
   * Report error to Sentry and database
   */
  async reportError(params: {
    error: Error
    component: string
    severity?: string
    context?: any
  }): Promise<any> {
    const errorKey = `${params.component}:${params.error.message}`
    const count = (this.errorCounts.get(errorKey) || 0) + 1
    this.errorCounts.set(errorKey, count)

    // Send to Sentry
    await this.sendToSentry({
      error: params.error,
      component: params.component,
      context: params.context
    })

    // Store in database
    await this.supabase
      .from('error_logs')
      .insert({
        component: params.component,
        error_message: params.error.message,
        stack_trace: params.error.stack,
        severity: params.severity || 'error',
        context: this.scrubContext(params.context || {}),
        created_at: new Date().toISOString()
      })

    // Check for escalation
    const shouldEscalate =
      count >= 3 || params.severity === 'critical'

    if (shouldEscalate) {
      await this.escalateError(params)
    }

    return {
      escalated: shouldEscalate,
      count,
      message: params.error.message,
      stack_trace: params.error.stack
    }
  }

  /**
   * Attempt automatic recovery
   */
  async attemptRecovery<T>(
    operation: () => Promise<T>,
    options: {
      max_retries: number
      backoff: 'exponential' | 'linear'
      initial_delay_ms?: number
      onRetry?: (delay: number) => void
    }
  ): Promise<T> {
    const initialDelay = options.initial_delay_ms || 100
    let lastError: Error

    for (let attempt = 0; attempt < options.max_retries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error

        if (attempt < options.max_retries - 1) {
          const delay =
            options.backoff === 'exponential'
              ? initialDelay * Math.pow(2, attempt)
              : initialDelay * (attempt + 1)

          if (options.onRetry) {
            options.onRetry(delay)
          }

          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }

  /**
   * Recover from specific error types
   */
  async recoverFromError(params: {
    category: string
    component: string
    error: any
  }): Promise<boolean> {
    switch (params.category) {
      case 'network':
        if (params.component.includes('MCP')) {
          // Restart MCP connection
          console.log('Restarting MCP connection...')
          return true
        }
        break

      case 'data':
        if (params.component.includes('Cache')) {
          // Clear cache
          console.log('Clearing cache...')
          return true
        }
        break

      default:
        return false
    }

    return false
  }

  /**
   * Escalate critical errors
   */
  async escalateError(params: {
    error: Error
    component?: string
    severity?: string
  }): Promise<void> {
    await this.notifyAdministrators({
      error: params.error,
      component: params.component,
      severity: params.severity || 'critical'
    })

    // Log escalation
    console.error('ERROR ESCALATED:', params)
  }

  /**
   * Notify administrators
   */
  async notifyAdministrators(params: any): Promise<void> {
    // In production: send email, Slack notification, or create incident ticket
    console.log('ADMIN NOTIFICATION:', params)
  }

  /**
   * Analyze error patterns
   */
  async analyzeErrorPatterns(): Promise<any[]> {
    const { data } = await this.supabase
      .from('error_logs')
      .select('error_message, component')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const patterns = new Map()

    data?.forEach((error) => {
      const key = `${error.component}:${error.error_message}`
      patterns.set(key, (patterns.get(key) || 0) + 1)
    })

    return Array.from(patterns.entries()).map(([key, count]) => ({
      pattern: key,
      count
    }))
  }

  /**
   * Calculate error frequency
   */
  async calculateErrorFrequency(errorMessage: string): Promise<any> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data } = await this.supabase
      .from('error_logs')
      .select('created_at')
      .eq('error_message', errorMessage)
      .gte('created_at', oneHourAgo)

    return {
      per_hour: data?.length || 0
    }
  }

  /**
   * Detect error anomalies
   */
  async detectAnomalies(): Promise<string[]> {
    const patterns = await this.analyzeErrorPatterns()
    const avgCount = patterns.reduce((sum, p) => sum + p.count, 0) / patterns.length

    return patterns
      .filter((p) => p.count > avgCount * 3) // 3x above average
      .map((p) => p.pattern)
  }

  // Helper methods
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('econnrefused') || message.includes('timeout')) {
      return 'network'
    }
    if (message.includes('database') || message.includes('query')) {
      return 'database'
    }
    if (message.includes('cache') || message.includes('stale')) {
      return 'data'
    }

    return 'unknown'
  }

  private isTransientError(error: Error): boolean {
    const transientIndicators = ['timeout', 'econnrefused', 'econnreset', 'network']
    return transientIndicators.some((indicator) =>
      error.message.toLowerCase().includes(indicator)
    )
  }

  private determineSeverity(error: Error, category: string): string {
    if (category === 'database') return 'critical'
    if (category === 'network') return 'warning'
    return 'error'
  }

  private scrubPII(event: any): any {
    // Remove PII from error events
    const piiPatterns = [
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email
      /\b\d{3}-\d{2}-\d{4}\b/g // SSN
    ]

    if (event.message) {
      piiPatterns.forEach((pattern) => {
        event.message = event.message.replace(pattern, '[REDACTED]')
      })
    }

    return event
  }

  private scrubContext(context: any): any {
    const scrubbed = { ...context }
    const piiFields = ['email', 'ssn', 'phone', 'user_id']

    piiFields.forEach((field) => {
      if (scrubbed[field]) {
        scrubbed[field] = '[REDACTED]'
      }
    })

    return scrubbed
  }

  async sendToSentry(params: any): Promise<void> {
    Sentry.captureException(params.error, {
      tags: {
        component: params.component
      },
      extra: params.context
    })
  }
}
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md section on Error Handling (FR-12)
- [ ] TASK-012 (Agent Tools) completed
- [ ] Sentry account and DSN configured
- [ ] Database has `error_logs` table

### Step-by-Step Implementation

**Step 1**: Set up Sentry Integration
- Configure Sentry in project
- Add PII scrubbing
- Test error capture

**Step 2**: Implement Error Detection
- Create error categorization logic
- Add severity determination
- Build context extraction

**Step 3**: Add Automatic Recovery
- Implement retry logic with backoff
- Add recovery strategies
- Test recovery scenarios

**Step 4**: Implement Escalation
- Add escalation thresholds
- Create notification system
- Test critical error handling

**Step 5**: Build Pattern Analysis
- Implement error grouping
- Add frequency calculation
- Create anomaly detection

---

## 5-11. STANDARD SECTIONS

(Following same structure as previous tasks)

**Dependencies**:
- TASK-012: Agent Tools & Helper Functions

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
