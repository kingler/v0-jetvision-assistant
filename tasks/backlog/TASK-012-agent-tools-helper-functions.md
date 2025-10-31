# Agent Tools & Helper Functions

**Task ID**: TASK-012
**Created**: 2025-10-20
**Assigned To**: Backend Developer / AI/ML Engineer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Build comprehensive agent infrastructure including BaseAgent abstract class, tool registration system, agent coordination utilities, logging/telemetry framework, and error recovery helpers to enable rapid development of specialized AI agents.

### User Story
**As a** backend developer implementing AI agents
**I want** a robust base infrastructure with common patterns and utilities
**So that** I can quickly build specialized agents without duplicating code

### Business Value
Agent tools and helpers provide the foundation for all AI agents in the Jetvision system. By abstracting common patterns (tool registration, MCP client management, error handling, logging), this infrastructure enables rapid development of the 6 specialized agents while ensuring consistency, maintainability, and reliability. This is a critical multiplier for development velocity.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement BaseAgent abstract class
- Abstract base for all agent implementations
- Lifecycle management (initialize, start, stop, shutdown)
- State tracking (idle, initializing, ready, busy, error, stopped)
- Common configuration management
- Event emission for monitoring

**FR-2**: System SHALL provide tool registration system
- Declarative tool definition
- Type-safe tool execution
- Tool discovery and introspection
- Middleware support (logging, error handling, timeout)
- Tool versioning

**FR-3**: System SHALL implement MCP client manager
- Manage connections to multiple MCP servers
- Connection pooling and reuse
- Automatic reconnection on failure
- Health checking
- Load balancing across instances

**FR-4**: System SHALL provide agent coordination utilities
- Message passing between agents
- Agent handoff protocol
- Task delegation
- Response aggregation
- Workflow orchestration helpers

**FR-5**: System SHALL implement logging and telemetry
- Structured logging with correlation IDs
- Request/response tracking
- Performance metrics (execution time, success/failure rates)
- Cost tracking (OpenAI API usage)
- Integration with Sentry for errors

**FR-6**: System SHALL provide error recovery helpers
- Automatic retry with exponential backoff
- Circuit breaker pattern
- Fallback strategies
- Error classification (transient vs permanent)
- Recovery action suggestions

**FR-7**: System SHALL include utility functions
- Data validation helpers
- Type conversion utilities
- Date/time formatting
- String manipulation (sanitization, normalization)
- Common data transformations

### Acceptance Criteria

- [ ] **AC-1**: BaseAgent provides foundation for all agents
- [ ] **AC-2**: Tool registration system is type-safe and extensible
- [ ] **AC-3**: MCP client manager handles multiple servers
- [ ] **AC-4**: Agent coordination utilities enable communication
- [ ] **AC-5**: Logging includes correlation IDs and structured data
- [ ] **AC-6**: Error recovery includes retry and circuit breaker
- [ ] **AC-7**: Utility functions cover common operations
- [ ] **AC-8**: All code has TypeScript strict mode enabled
- [ ] **AC-9**: Unit tests achieve >75% coverage
- [ ] **AC-10**: Documentation includes usage examples
- [ ] **AC-11**: Code review approved

### Non-Functional Requirements

- **Performance**: Tool execution overhead <10ms
- **Reliability**: Automatic recovery from transient failures
- **Security**: Input validation on all utilities
- **Maintainability**: Clear abstractions and separation of concerns
- **Observability**: Comprehensive logging and metrics

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/agents/base-agent.test.ts
__tests__/unit/agents/tool-registry.test.ts
__tests__/unit/agents/mcp-client-manager.test.ts
__tests__/unit/agents/error-recovery.test.ts
__tests__/unit/agents/utils.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/agents/base-agent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BaseAgent } from '@/lib/agents/base-agent'

class TestAgent extends BaseAgent {
  constructor() {
    super({
      name: 'test-agent',
      version: '1.0.0',
      description: 'A test agent'
    })
  }

  async initialize(): Promise<void> {
    // Test initialization
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent

  beforeEach(() => {
    agent = new TestAgent()
  })

  describe('Lifecycle Management', () => {
    it('should initialize with idle state', () => {
      expect(agent.getState()).toBe('idle')
    })

    it('should transition through lifecycle states', async () => {
      expect(agent.getState()).toBe('idle')

      await agent.start()
      expect(agent.getState()).toBe('ready')

      await agent.stop()
      expect(agent.getState()).toBe('stopped')
    })

    it('should prevent operations when not ready', async () => {
      await expect(
        agent.execute('some_task', {})
      ).rejects.toThrow('Agent not ready')
    })

    it('should call initialization hook', async () => {
      const initSpy = vi.spyOn(agent, 'initialize')
      await agent.start()
      expect(initSpy).toHaveBeenCalled()
    })

    it('should call shutdown hook', async () => {
      const shutdownSpy = vi.fn()
      agent.onShutdown(shutdownSpy)

      await agent.start()
      await agent.stop()

      expect(shutdownSpy).toHaveBeenCalled()
    })
  })

  describe('Tool Registration', () => {
    beforeEach(async () => {
      await agent.start()
    })

    it('should register tools', () => {
      agent.registerTool({
        name: 'test_tool',
        description: 'A test tool',
        execute: async (params) => ({ result: params.input })
      })

      expect(agent.getTools()).toContain('test_tool')
    })

    it('should execute registered tools', async () => {
      agent.registerTool({
        name: 'multiply',
        description: 'Multiply two numbers',
        execute: async (params) => ({ result: params.a * params.b })
      })

      const result = await agent.executeTool('multiply', { a: 5, b: 3 })
      expect(result.result).toBe(15)
    })

    it('should throw error for non-existent tool', async () => {
      await expect(
        agent.executeTool('nonexistent', {})
      ).rejects.toThrow('Tool nonexistent not found')
    })
  })

  describe('Event Emission', () => {
    it('should emit lifecycle events', async () => {
      const startListener = vi.fn()
      const stopListener = vi.fn()

      agent.on('started', startListener)
      agent.on('stopped', stopListener)

      await agent.start()
      await agent.stop()

      expect(startListener).toHaveBeenCalled()
      expect(stopListener).toHaveBeenCalled()
    })

    it('should emit error events', async () => {
      const errorListener = vi.fn()
      agent.on('error', errorListener)

      agent.registerTool({
        name: 'failing_tool',
        description: 'Fails',
        execute: async () => {
          throw new Error('Tool failed')
        }
      })

      await agent.start()

      try {
        await agent.executeTool('failing_tool', {})
      } catch {}

      expect(errorListener).toHaveBeenCalled()
    })
  })

  describe('Configuration', () => {
    it('should provide agent metadata', () => {
      expect(agent.getName()).toBe('test-agent')
      expect(agent.getVersion()).toBe('1.0.0')
      expect(agent.getDescription()).toBe('A test agent')
    })

    it('should allow configuration updates', () => {
      agent.configure({ timeout: 5000 })
      expect(agent.getConfig().timeout).toBe(5000)
    })
  })
})
```

```typescript
// __tests__/unit/agents/mcp-client-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MCPClientManager } from '@/lib/agents/mcp-client-manager'

describe('MCPClientManager', () => {
  let manager: MCPClientManager

  beforeEach(() => {
    manager = new MCPClientManager()
  })

  describe('Client Registration', () => {
    it('should register MCP clients', () => {
      manager.registerClient('avinode', {
        command: 'node',
        args: ['mcp-servers/avinode/index.ts']
      })

      expect(manager.hasClient('avinode')).toBe(true)
    })

    it('should connect to registered clients', async () => {
      manager.registerClient('avinode', {
        command: 'node',
        args: ['mcp-servers/avinode/index.ts']
      })

      await manager.connect('avinode')
      expect(manager.isConnected('avinode')).toBe(true)
    })
  })

  describe('Tool Execution', () => {
    beforeEach(async () => {
      manager.registerClient('avinode', {
        command: 'node',
        args: ['mcp-servers/avinode/index.ts']
      })
      await manager.connect('avinode')
    })

    it('should execute tools on connected clients', async () => {
      const result = await manager.execute('avinode', 'search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(result).toHaveProperty('aircraft')
    })

    it('should handle execution errors', async () => {
      await expect(
        manager.execute('nonexistent', 'some_tool', {})
      ).rejects.toThrow('Client nonexistent not found')
    })
  })

  describe('Connection Management', () => {
    it('should reconnect on connection loss', async () => {
      manager.registerClient('avinode', {
        command: 'node',
        args: ['mcp-servers/avinode/index.ts']
      })

      await manager.connect('avinode')

      // Simulate connection loss
      await manager.disconnect('avinode')

      // Auto-reconnect on next execute
      await manager.execute('avinode', 'search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(manager.isConnected('avinode')).toBe(true)
    })

    it('should health check connections', async () => {
      manager.registerClient('avinode', {
        command: 'node',
        args: ['mcp-servers/avinode/index.ts']
      })

      await manager.connect('avinode')

      const healthy = await manager.healthCheck('avinode')
      expect(healthy).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should disconnect all clients on shutdown', async () => {
      manager.registerClient('avinode', {
        command: 'node',
        args: ['mcp-servers/avinode/index.ts']
      })

      manager.registerClient('gmail', {
        command: 'node',
        args: ['mcp-servers/gmail/index.ts']
      })

      await manager.connectAll()
      await manager.shutdown()

      expect(manager.isConnected('avinode')).toBe(false)
      expect(manager.isConnected('gmail')).toBe(false)
    })
  })
})
```

```typescript
// __tests__/unit/agents/error-recovery.test.ts
import { describe, it, expect, vi } from 'vitest'
import { RetryStrategy, CircuitBreaker } from '@/lib/agents/error-recovery'

describe('Error Recovery', () => {
  describe('RetryStrategy', () => {
    it('should retry failed operations', async () => {
      let attempts = 0
      const operation = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Transient failure')
        }
        return { success: true }
      }

      const retry = new RetryStrategy({ maxRetries: 3 })
      const result = await retry.execute(operation)

      expect(attempts).toBe(3)
      expect(result.success).toBe(true)
    })

    it('should use exponential backoff', async () => {
      const timestamps: number[] = []
      const operation = async () => {
        timestamps.push(Date.now())
        if (timestamps.length < 3) {
          throw new Error('Fail')
        }
        return { success: true }
      }

      const retry = new RetryStrategy({
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2
      })

      await retry.execute(operation)

      // Check delays increase exponentially
      const delay1 = timestamps[1] - timestamps[0]
      const delay2 = timestamps[2] - timestamps[1]

      expect(delay2).toBeGreaterThan(delay1 * 1.5)
    })

    it('should throw after max retries exceeded', async () => {
      const operation = async () => {
        throw new Error('Always fails')
      }

      const retry = new RetryStrategy({ maxRetries: 2 })

      await expect(retry.execute(operation)).rejects.toThrow('Always fails')
    })
  })

  describe('CircuitBreaker', () => {
    it('should open circuit after failure threshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 1000
      })

      const failingOperation = async () => {
        throw new Error('Fail')
      }

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingOperation)
        } catch {}
      }

      expect(breaker.getState()).toBe('open')
    })

    it('should reject requests when circuit is open', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 })

      const operation = async () => {
        throw new Error('Fail')
      }

      // Open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation)
        } catch {}
      }

      // Should reject immediately
      await expect(
        breaker.execute(operation)
      ).rejects.toThrow('Circuit breaker is open')
    })

    it('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 100
      })

      const operation = async () => {
        throw new Error('Fail')
      }

      // Open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation)
        } catch {}
      }

      expect(breaker.getState()).toBe('open')

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(breaker.getState()).toBe('half-open')
    })

    it('should close circuit after successful request in half-open', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 100
      })

      // Open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {}
      }

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150))

      // Execute successful operation
      await breaker.execute(async () => ({ success: true }))

      expect(breaker.getState()).toBe('closed')
    })
  })
})
```

**Run Tests** (should FAIL initially):
```bash
npm test -- agents
# Expected: Tests fail because implementation doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

```typescript
// lib/agents/base-agent.ts
import EventEmitter from 'events'

export type AgentState = 'idle' | 'initializing' | 'ready' | 'busy' | 'error' | 'stopped'

export interface AgentConfig {
  name: string
  version: string
  description: string
  timeout?: number
  maxConcurrent?: number
}

export interface Tool {
  name: string
  description: string
  execute: (params: any) => Promise<any>
}

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig
  protected state: AgentState = 'idle'
  protected tools = new Map<string, Tool>()
  private shutdownCallbacks: Array<() => Promise<void>> = []

  constructor(config: AgentConfig) {
    super()
    this.config = {
      timeout: 30000,
      maxConcurrent: 10,
      ...config
    }
  }

  /**
   * Abstract initialization hook
   */
  abstract initialize(): Promise<void>

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Agent already started')
    }

    this.state = 'initializing'

    try {
      await this.initialize()
      this.state = 'ready'
      this.emit('started')
    } catch (error) {
      this.state = 'error'
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    if (this.state === 'stopped') {
      return
    }

    // Run shutdown callbacks
    for (const callback of this.shutdownCallbacks) {
      await callback()
    }

    this.state = 'stopped'
    this.emit('stopped')
  }

  /**
   * Register tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Get registered tools
   */
  getTools(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Execute tool
   */
  async executeTool(name: string, params: any): Promise<any> {
    if (this.state !== 'ready') {
      throw new Error('Agent not ready')
    }

    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`Tool ${name} not found`)
    }

    try {
      this.state = 'busy'
      const result = await tool.execute(params)
      this.state = 'ready'
      return result
    } catch (error) {
      this.state = 'ready'
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Execute generic task
   */
  async execute(task: string, params: any): Promise<any> {
    return await this.executeTool(task, params)
  }

  /**
   * Register shutdown callback
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback)
  }

  /**
   * Get agent state
   */
  getState(): AgentState {
    return this.state
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.config.name
  }

  /**
   * Get agent version
   */
  getVersion(): string {
    return this.config.version
  }

  /**
   * Get agent description
   */
  getDescription(): string {
    return this.config.description
  }

  /**
   * Configure agent
   */
  configure(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Get configuration
   */
  getConfig(): AgentConfig {
    return this.config
  }
}
```

```typescript
// lib/agents/mcp-client-manager.ts
import { spawn, ChildProcess } from 'child_process'

interface ClientConfig {
  command: string
  args: string[]
}

interface ClientConnection {
  process: ChildProcess
  connected: boolean
}

export class MCPClientManager {
  private clients = new Map<string, ClientConfig>()
  private connections = new Map<string, ClientConnection>()

  /**
   * Register MCP client
   */
  registerClient(name: string, config: ClientConfig): void {
    this.clients.set(name, config)
  }

  /**
   * Check if client is registered
   */
  hasClient(name: string): boolean {
    return this.clients.has(name)
  }

  /**
   * Connect to MCP client
   */
  async connect(name: string): Promise<void> {
    const config = this.clients.get(name)
    if (!config) {
      throw new Error(`Client ${name} not found`)
    }

    const process = spawn(config.command, config.args)

    this.connections.set(name, {
      process,
      connected: true
    })

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Connect to all registered clients
   */
  async connectAll(): Promise<void> {
    for (const name of this.clients.keys()) {
      await this.connect(name)
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(name: string): boolean {
    return this.connections.get(name)?.connected || false
  }

  /**
   * Execute tool on MCP client
   */
  async execute(clientName: string, toolName: string, params: any): Promise<any> {
    if (!this.isConnected(clientName)) {
      await this.connect(clientName)
    }

    const connection = this.connections.get(clientName)
    if (!connection) {
      throw new Error(`Client ${clientName} not found`)
    }

    // Send tool execution request
    const request = {
      jsonrpc: '2.0',
      method: toolName,
      params,
      id: Date.now()
    }

    return new Promise((resolve, reject) => {
      connection.process.stdin?.write(JSON.stringify(request) + '\n')

      connection.process.stdout?.once('data', (data) => {
        const response = JSON.parse(data.toString())
        if (response.error) {
          reject(new Error(response.error.message))
        } else {
          resolve(response.result)
        }
      })

      setTimeout(() => reject(new Error('Timeout')), 30000)
    })
  }

  /**
   * Disconnect from client
   */
  async disconnect(name: string): Promise<void> {
    const connection = this.connections.get(name)
    if (connection) {
      connection.process.kill()
      connection.connected = false
    }
  }

  /**
   * Health check client
   */
  async healthCheck(name: string): Promise<boolean> {
    try {
      await this.execute(name, 'ping', {})
      return true
    } catch {
      return false
    }
  }

  /**
   * Shutdown all clients
   */
  async shutdown(): Promise<void> {
    for (const name of this.connections.keys()) {
      await this.disconnect(name)
    }
  }
}
```

```typescript
// lib/agents/error-recovery.ts
export interface RetryConfig {
  maxRetries: number
  initialDelay?: number
  backoffMultiplier?: number
  maxDelay?: number
}

export class RetryStrategy {
  private config: Required<RetryConfig>

  constructor(config: RetryConfig) {
    this.config = {
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 30000,
      ...config
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error
    let delay = this.config.initialDelay

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error

        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay))
          delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay)
        }
      }
    }

    throw lastError!
  }
}

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
}

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    this.config = config
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open')
    }

    try {
      const result = await operation()

      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
      }

      return result
    } catch (error) {
      this.failures++

      if (this.failures >= this.config.failureThreshold) {
        this.state = 'open'

        // Reset after timeout
        setTimeout(() => {
          this.state = 'half-open'
        }, this.config.resetTimeout)
      }

      throw error
    }
  }

  getState(): CircuitState {
    return this.state
  }
}
```

---

## 4. IMPLEMENTATION STEPS

**Step 1**: Create Directory Structure
```bash
mkdir -p lib/agents
mkdir -p lib/agents/utils
```

**Step 2**: Implement Base Classes
- BaseAgent abstract class
- MCPClientManager
- Error recovery utilities

**Step 3**: Implement Utility Functions
```typescript
// lib/agents/utils/validators.ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateICAO(code: string): boolean {
  return /^[A-Z]{4}$/.test(code)
}

export function validateDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}
```

**Step 4**: Implement Logging Framework
```typescript
// lib/agents/utils/logger.ts
export class AgentLogger {
  constructor(private agentName: string) {}

  info(message: string, data?: any): void {
    console.log(JSON.stringify({
      level: 'info',
      agent: this.agentName,
      message,
      data,
      timestamp: new Date().toISOString()
    }))
  }

  error(message: string, error?: Error): void {
    console.error(JSON.stringify({
      level: 'error',
      agent: this.agentName,
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    }))
  }
}
```

**Step 5**: Write Comprehensive Tests

**Step 6**: Create Documentation
```markdown
# Agent Tools & Helpers

## Overview
Common utilities and base classes for AI agents.

## BaseAgent
Abstract base class for all agents.

## MCPClientManager
Manages connections to MCP servers.

## Error Recovery
Retry strategies and circuit breakers.

## Usage Examples
[See examples...]
```

---

## 5-11. STANDARD SECTIONS

(Following same structure as previous tasks)

- Git Workflow
- Code Review Checklist
- Testing Requirements (>75% coverage)
- Definition of Done
- Resources & References
- Notes & Questions
- Completion Summary

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
