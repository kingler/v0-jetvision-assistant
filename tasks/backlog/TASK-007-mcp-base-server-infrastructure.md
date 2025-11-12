# MCP Base Server Infrastructure

**Task ID**: TASK-007
**Created**: 2025-10-20
**Assigned To**: Backend Developer / MCP Specialist
**Status**: `pending`
**Priority**: `critical`
**Estimated Time**: 16 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Build a robust, reusable base infrastructure for Model Context Protocol (MCP) servers that supports both stdio and HTTP+SSE transports, provides tool registration framework, comprehensive error handling, and connection management.

### User Story
**As a** backend developer
**I want** a base MCP server class with standardized tool registration and transport handling
**So that** I can quickly implement specialized MCP servers (Avinode, Gmail, Sheets) without duplicating infrastructure code

### Business Value
The MCP base infrastructure is the foundation for all external integrations in the Jetvision system. This reusable abstraction enables rapid development of specialized MCP servers while ensuring consistency, maintainability, and reliability across all integrations. Without this infrastructure, each MCP server would require custom transport, error handling, and connection logic.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement base MCP server class
- Support Model Context Protocol specification
- Abstract base class for server implementations
- Lifecycle management (initialize, start, stop)
- State management (idle, running, error, stopped)

**FR-2**: System SHALL support multiple transport protocols
- **stdio transport**: Communication via standard input/output (for local processes)
- **HTTP+SSE transport**: RESTful HTTP with Server-Sent Events for streaming
- Transport abstraction allowing easy addition of new protocols
- Auto-detection of transport type from environment

**FR-3**: System SHALL provide tool registration framework
- Declarative tool definition with JSON schema
- Type-safe tool parameter validation
- Tool execution middleware (logging, error handling, timeout)
- Tool discovery and introspection
- Support for async tool execution

**FR-4**: System SHALL implement comprehensive error handling
- Custom error types (ToolNotFoundError, ValidationError, TimeoutError)
- Error propagation to clients with proper MCP error format
- Retry logic for transient failures
- Error logging with context (request ID, tool name, parameters)

**FR-5**: System SHALL manage connections
- Connection pooling for HTTP transport
- Heartbeat/keepalive for long-running connections
- Graceful shutdown with cleanup
- Connection timeout configuration

**FR-6**: System SHALL provide logging and observability
- Structured logging with correlation IDs
- Request/response logging (with PII redaction)
- Performance metrics (execution time, success/failure rates)
- Integration with Sentry for error tracking

### Acceptance Criteria

- [ ] **AC-1**: BaseMCPServer class implements MCP protocol specification
- [ ] **AC-2**: Stdio transport supports bidirectional communication
- [ ] **AC-3**: HTTP+SSE transport handles requests and streams responses
- [ ] **AC-4**: Tool registration validates schemas and parameters
- [ ] **AC-5**: Tool execution includes timeout protection (30s default)
- [ ] **AC-6**: Errors are properly formatted per MCP spec
- [ ] **AC-7**: Connection lifecycle managed (connect, disconnect, cleanup)
- [ ] **AC-8**: All code has TypeScript strict mode enabled
- [ ] **AC-9**: Unit tests achieve >75% coverage
- [ ] **AC-10**: Integration tests verify stdio and HTTP transports
- [ ] **AC-11**: Documentation includes usage examples
- [ ] **AC-12**: Code review approved by at least one reviewer

### Non-Functional Requirements

- **Performance**: Tool execution overhead <50ms
- **Reliability**: Automatic retry for failed requests (3 attempts max)
- **Security**: Input validation for all tool parameters
- **Scalability**: Support 100+ concurrent tool executions
- **Maintainability**: Clear abstractions for extending functionality

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

Before writing any implementation code, write failing tests that define expected behavior.

**Test Files to Create**:
```
__tests__/unit/mcp/base-server.test.ts
__tests__/unit/mcp/stdio-transport.test.ts
__tests__/unit/mcp/http-transport.test.ts
__tests__/unit/mcp/tool-registry.test.ts
__tests__/integration/mcp/server-lifecycle.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/mcp/base-server.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BaseMCPServer } from '@/lib/mcp/base-server'
import { MCPToolDefinition } from '@/lib/mcp/types'

describe('BaseMCPServer', () => {
  let server: TestMCPServer

  // Create test implementation
  class TestMCPServer extends BaseMCPServer {
    constructor() {
      super({
        name: 'test-server',
        version: '1.0.0',
        transport: 'stdio'
      })
    }
  }

  beforeEach(() => {
    server = new TestMCPServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('Tool Registration', () => {
    it('should register a tool with valid schema', () => {
      const tool: MCPToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        },
        execute: async (params) => {
          return { result: params.message }
        }
      }

      server.registerTool(tool)
      expect(server.getTools()).toContain('test_tool')
    })

    it('should throw error for duplicate tool names', () => {
      const tool: MCPToolDefinition = {
        name: 'duplicate_tool',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({})
      }

      server.registerTool(tool)
      expect(() => server.registerTool(tool)).toThrow('Tool duplicate_tool already registered')
    })

    it('should validate tool schema on registration', () => {
      const invalidTool = {
        name: 'invalid',
        // Missing required fields
      } as any

      expect(() => server.registerTool(invalidTool)).toThrow('Invalid tool definition')
    })
  })

  describe('Tool Execution', () => {
    it('should execute registered tool with valid parameters', async () => {
      const tool: MCPToolDefinition = {
        name: 'greet',
        description: 'Greet a user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name']
        },
        execute: async (params) => {
          return { greeting: `Hello, ${params.name}!` }
        }
      }

      server.registerTool(tool)
      const result = await server.executeTool('greet', { name: 'Alice' })

      expect(result).toEqual({ greeting: 'Hello, Alice!' })
    })

    it('should throw error for non-existent tool', async () => {
      await expect(
        server.executeTool('nonexistent', {})
      ).rejects.toThrow('Tool nonexistent not found')
    })

    it('should validate tool parameters against schema', async () => {
      const tool: MCPToolDefinition = {
        name: 'add',
        description: 'Add two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' }
          },
          required: ['a', 'b']
        },
        execute: async (params) => {
          return { result: params.a + params.b }
        }
      }

      server.registerTool(tool)

      // Missing required parameter
      await expect(
        server.executeTool('add', { a: 5 })
      ).rejects.toThrow('Validation failed')

      // Wrong type
      await expect(
        server.executeTool('add', { a: 'five', b: 10 })
      ).rejects.toThrow('Validation failed')
    })

    it('should timeout long-running tools', async () => {
      const tool: MCPToolDefinition = {
        name: 'slow_tool',
        description: 'A slow tool',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds
          return { done: true }
        }
      }

      server.registerTool(tool)

      await expect(
        server.executeTool('slow_tool', {}, { timeout: 1000 }) // 1 second timeout
      ).rejects.toThrow('Tool execution timeout')
    }, 10000) // Test timeout 10s

    it('should retry failed tool executions', async () => {
      let attempts = 0

      const tool: MCPToolDefinition = {
        name: 'flaky_tool',
        description: 'A flaky tool',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          attempts++
          if (attempts < 3) {
            throw new Error('Transient failure')
          }
          return { success: true, attempts }
        }
      }

      server.registerTool(tool)

      const result = await server.executeTool('flaky_tool', {}, { retry: true, maxRetries: 3 })
      expect(result.attempts).toBe(3)
      expect(attempts).toBe(3)
    })
  })

  describe('Lifecycle Management', () => {
    it('should transition through lifecycle states', async () => {
      expect(server.getState()).toBe('idle')

      await server.start()
      expect(server.getState()).toBe('running')

      await server.stop()
      expect(server.getState()).toBe('stopped')
    })

    it('should prevent operations when not running', async () => {
      // Before start
      await expect(
        server.executeTool('test', {})
      ).rejects.toThrow('Server not running')

      await server.start()
      await server.stop()

      // After stop
      await expect(
        server.executeTool('test', {})
      ).rejects.toThrow('Server not running')
    })

    it('should cleanup resources on shutdown', async () => {
      const cleanupSpy = vi.fn()
      server.onShutdown(cleanupSpy)

      await server.start()
      await server.stop()

      expect(cleanupSpy).toHaveBeenCalledOnce()
    })
  })

  describe('Error Handling', () => {
    it('should format errors per MCP spec', async () => {
      const tool: MCPToolDefinition = {
        name: 'error_tool',
        description: 'A tool that errors',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          throw new Error('Something went wrong')
        }
      }

      server.registerTool(tool)

      try {
        await server.executeTool('error_tool', {})
      } catch (error: any) {
        expect(error).toMatchObject({
          code: 'TOOL_EXECUTION_ERROR',
          message: 'Something went wrong',
          tool: 'error_tool'
        })
      }
    })

    it('should log errors with context', async () => {
      const logSpy = vi.spyOn(console, 'error')

      const tool: MCPToolDefinition = {
        name: 'error_tool',
        description: 'Errors',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          throw new Error('Test error')
        }
      }

      server.registerTool(tool)

      try {
        await server.executeTool('error_tool', { param: 'value' })
      } catch {}

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool execution failed'),
        expect.objectContaining({
          tool: 'error_tool',
          params: { param: 'value' }
        })
      )

      logSpy.mockRestore()
    })
  })
})
```

**Transport Tests**:
```typescript
// __tests__/unit/mcp/stdio-transport.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StdioTransport } from '@/lib/mcp/transports/stdio'

describe('StdioTransport', () => {
  let transport: StdioTransport

  beforeEach(() => {
    transport = new StdioTransport()
  })

  it('should read messages from stdin', async () => {
    const mockMessage = { jsonrpc: '2.0', method: 'test', params: {} }

    // Mock stdin
    const stdinMock = vi.spyOn(process.stdin, 'on')
    stdinMock.mockImplementation((event, handler: any) => {
      if (event === 'data') {
        setTimeout(() => handler(JSON.stringify(mockMessage) + '\n'), 10)
      }
      return process.stdin
    })

    const message = await transport.receive()
    expect(message).toEqual(mockMessage)

    stdinMock.mockRestore()
  })

  it('should write messages to stdout', async () => {
    const message = { jsonrpc: '2.0', result: { success: true } }

    const stdoutMock = vi.spyOn(process.stdout, 'write')
    stdoutMock.mockImplementation(() => true)

    await transport.send(message)

    expect(stdoutMock).toHaveBeenCalledWith(JSON.stringify(message) + '\n')
    stdoutMock.mockRestore()
  })

  it('should handle malformed JSON', async () => {
    const stdinMock = vi.spyOn(process.stdin, 'on')
    stdinMock.mockImplementation((event, handler: any) => {
      if (event === 'data') {
        setTimeout(() => handler('invalid json\n'), 10)
      }
      return process.stdin
    })

    await expect(transport.receive()).rejects.toThrow('Invalid JSON')
    stdinMock.mockRestore()
  })
})
```

**Run Tests** (should FAIL initially):
```bash
npm test -- mcp
# Expected: Tests fail because implementation doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

Write the minimum code necessary to make tests pass.

**Implementation Checklist**:
- [ ] Create type definitions
- [ ] Implement BaseMCPServer class
- [ ] Implement stdio transport
- [ ] Implement HTTP+SSE transport
- [ ] Create tool registry
- [ ] Add error handling
- [ ] Make tests pass

**Example Implementation**:
```typescript
// lib/mcp/types.ts
export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  execute: (params: Record<string, any>) => Promise<any>
}

export interface MCPServerConfig {
  name: string
  version: string
  transport: 'stdio' | 'http'
  port?: number
  timeout?: number
}

export type ServerState = 'idle' | 'running' | 'error' | 'stopped'

export interface MCPMessage {
  jsonrpc: '2.0'
  id?: string | number
  method?: string
  params?: any
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: string
  message: string
  data?: any
}

export interface ToolExecutionOptions {
  timeout?: number
  retry?: boolean
  maxRetries?: number
}

export interface Transport {
  send(message: MCPMessage): Promise<void>
  receive(): Promise<MCPMessage>
  close(): Promise<void>
}
```

```typescript
// lib/mcp/base-server.ts
import Ajv from 'ajv'
import { MCPToolDefinition, MCPServerConfig, ServerState, MCPError, ToolExecutionOptions } from './types'
import { StdioTransport } from './transports/stdio'
import { HttpTransport } from './transports/http'
import { ToolRegistry } from './tool-registry'
import { Logger } from './logger'

export abstract class BaseMCPServer {
  protected config: MCPServerConfig
  protected state: ServerState = 'idle'
  protected toolRegistry: ToolRegistry
  protected transport: any
  protected logger: Logger
  protected ajv: Ajv
  private shutdownCallbacks: Array<() => Promise<void>> = []

  constructor(config: MCPServerConfig) {
    this.config = {
      timeout: 30000, // 30 second default
      ...config
    }
    this.toolRegistry = new ToolRegistry()
    this.logger = new Logger(config.name)
    this.ajv = new Ajv()

    // Initialize transport
    if (config.transport === 'stdio') {
      this.transport = new StdioTransport()
    } else {
      this.transport = new HttpTransport(config.port || 3001)
    }
  }

  /**
   * Register a tool with the server
   */
  registerTool(tool: MCPToolDefinition): void {
    // Validate tool definition
    if (!tool.name || !tool.description || !tool.inputSchema || !tool.execute) {
      throw new Error('Invalid tool definition')
    }

    // Check for duplicates
    if (this.toolRegistry.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`)
    }

    // Compile JSON schema for validation
    const validate = this.ajv.compile(tool.inputSchema)

    // Wrap execute with validation and error handling
    const wrappedTool = {
      ...tool,
      execute: async (params: any, options?: ToolExecutionOptions) => {
        // Validate parameters
        if (!validate(params)) {
          const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ')
          throw this.createError('VALIDATION_ERROR', `Validation failed: ${errors}`, tool.name)
        }

        // Execute with timeout
        const timeout = options?.timeout || this.config.timeout!
        const executePromise = tool.execute(params)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
        )

        try {
          return await Promise.race([executePromise, timeoutPromise])
        } catch (error: any) {
          this.logger.error('Tool execution failed', {
            tool: tool.name,
            params,
            error: error.message
          })
          throw this.createError('TOOL_EXECUTION_ERROR', error.message, tool.name)
        }
      }
    }

    this.toolRegistry.register(tool.name, wrappedTool)
    this.logger.info(`Tool registered: ${tool.name}`)
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    params: Record<string, any>,
    options?: ToolExecutionOptions
  ): Promise<any> {
    if (this.state !== 'running') {
      throw new Error('Server not running')
    }

    const tool = this.toolRegistry.get(name)
    if (!tool) {
      throw this.createError('TOOL_NOT_FOUND', `Tool ${name} not found`, name)
    }

    const requestId = this.generateRequestId()
    this.logger.info('Executing tool', { requestId, tool: name, params })

    const startTime = Date.now()

    try {
      // Execute with optional retry
      let result
      if (options?.retry) {
        result = await this.executeWithRetry(tool, params, options)
      } else {
        result = await tool.execute(params, options)
      }

      const duration = Date.now() - startTime
      this.logger.info('Tool executed successfully', {
        requestId,
        tool: name,
        duration
      })

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      this.logger.error('Tool execution failed', {
        requestId,
        tool: name,
        duration,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Execute tool with retry logic
   */
  private async executeWithRetry(
    tool: any,
    params: any,
    options: ToolExecutionOptions
  ): Promise<any> {
    const maxRetries = options.maxRetries || 3
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await tool.execute(params, options)
      } catch (error: any) {
        lastError = error
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          this.logger.warn(`Tool execution failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }

  /**
   * Get list of registered tool names
   */
  getTools(): string[] {
    return this.toolRegistry.list()
  }

  /**
   * Get server state
   */
  getState(): ServerState {
    return this.state
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.state === 'running') {
      throw new Error('Server already running')
    }

    this.logger.info('Starting MCP server', { config: this.config })
    this.state = 'running'

    // Start transport listener
    await this.transport.start()
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.state === 'stopped') {
      return
    }

    this.logger.info('Stopping MCP server')

    // Run shutdown callbacks
    for (const callback of this.shutdownCallbacks) {
      await callback()
    }

    // Close transport
    await this.transport.close()

    this.state = 'stopped'
    this.logger.info('Server stopped')
  }

  /**
   * Register shutdown callback
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback)
  }

  /**
   * Create MCP-formatted error
   */
  private createError(code: string, message: string, tool?: string): MCPError & Error {
    const error = new Error(message) as MCPError & Error
    error.code = code
    error.message = message
    if (tool) {
      error.data = { tool }
    }
    return error
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
```

```typescript
// lib/mcp/tool-registry.ts
import { MCPToolDefinition } from './types'

export class ToolRegistry {
  private tools = new Map<string, MCPToolDefinition>()

  register(name: string, tool: MCPToolDefinition): void {
    this.tools.set(name, tool)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  get(name: string): MCPToolDefinition | undefined {
    return this.tools.get(name)
  }

  list(): string[] {
    return Array.from(this.tools.keys())
  }

  clear(): void {
    this.tools.clear()
  }
}
```

```typescript
// lib/mcp/transports/stdio.ts
import { Transport, MCPMessage } from '../types'
import * as readline from 'readline'

export class StdioTransport implements Transport {
  private rl?: readline.Interface

  async start(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }

  async send(message: MCPMessage): Promise<void> {
    const json = JSON.stringify(message)
    process.stdout.write(json + '\n')
  }

  async receive(): Promise<MCPMessage> {
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        reject(new Error('Transport not started'))
        return
      }

      this.rl.once('line', (line) => {
        try {
          const message = JSON.parse(line)
          resolve(message)
        } catch (error) {
          reject(new Error('Invalid JSON'))
        }
      })
    })
  }

  async close(): Promise<void> {
    this.rl?.close()
  }
}
```

```typescript
// lib/mcp/logger.ts
export class Logger {
  constructor(private context: string) {}

  info(message: string, data?: any): void {
    console.log(JSON.stringify({
      level: 'info',
      context: this.context,
      message,
      data,
      timestamp: new Date().toISOString()
    }))
  }

  warn(message: string, data?: any): void {
    console.warn(JSON.stringify({
      level: 'warn',
      context: this.context,
      message,
      data,
      timestamp: new Date().toISOString()
    }))
  }

  error(message: string, data?: any): void {
    console.error(JSON.stringify({
      level: 'error',
      context: this.context,
      message,
      data,
      timestamp: new Date().toISOString()
    }))
  }
}
```

**Run Tests Again**:
```bash
npm test -- mcp
# Expected: Tests now pass ✓
```

### Step 3: Refactor (Blue Phase)

Improve code quality without changing behavior.

**Refactoring Checklist**:
- [ ] Extract common patterns into utilities
- [ ] Improve error messages
- [ ] Add JSDoc comments
- [ ] Optimize performance
- [ ] Ensure consistent code style

**Run Tests After Refactoring**:
```bash
npm test -- mcp
# Expected: All tests still pass ✓
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

Before starting:
- [ ] Review MCP specification: https://modelcontextprotocol.io/
- [ ] Review TASK-003 (environment variables configured)
- [ ] Install required dependencies
- [ ] Understand transport protocols (stdio vs HTTP+SSE)

### Step-by-Step Implementation

**Step 1**: Install Dependencies

```bash
npm install ajv ioredis
npm install -D @types/node vitest
```

**Step 2**: Create Directory Structure

```bash
mkdir -p lib/mcp/transports
mkdir -p lib/mcp/errors
mkdir -p __tests__/unit/mcp
mkdir -p __tests__/integration/mcp
```

**Step 3**: Implement Type Definitions

File: `lib/mcp/types.ts` (see implementation above)

**Step 4**: Implement Base Server Class

File: `lib/mcp/base-server.ts` (see implementation above)

**Step 5**: Implement Transports

Files:
- `lib/mcp/transports/stdio.ts`
- `lib/mcp/transports/http.ts` (HTTP+SSE implementation)

```typescript
// lib/mcp/transports/http.ts
import express from 'express'
import { Server } from 'http'
import { Transport, MCPMessage } from '../types'

export class HttpTransport implements Transport {
  private app: express.Application
  private server?: Server
  private port: number
  private clients = new Set<express.Response>()

  constructor(port: number = 3001) {
    this.port = port
    this.app = express()
    this.app.use(express.json())

    // Handle tool execution requests
    this.app.post('/execute', async (req, res) => {
      const message: MCPMessage = req.body
      // Process and respond
      // Implementation details...
    })

    // SSE endpoint for streaming
    this.app.get('/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      this.clients.add(res)

      req.on('close', () => {
        this.clients.delete(res)
      })
    })
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`HTTP transport listening on port ${this.port}`)
        resolve()
      })
    })
  }

  async send(message: MCPMessage): Promise<void> {
    // Broadcast to all SSE clients
    const data = `data: ${JSON.stringify(message)}\n\n`
    this.clients.forEach(client => {
      client.write(data)
    })
  }

  async receive(): Promise<MCPMessage> {
    // In HTTP mode, this is handled by Express routes
    throw new Error('receive() not used in HTTP transport')
  }

  async close(): Promise<void> {
    // Close all SSE connections
    this.clients.forEach(client => {
      client.end()
    })
    this.clients.clear()

    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => resolve())
      })
    }
  }
}
```

**Step 6**: Implement Tool Registry

File: `lib/mcp/tool-registry.ts` (see implementation above)

**Step 7**: Implement Logger

File: `lib/mcp/logger.ts` (see implementation above)

**Step 8**: Implement Custom Error Types

```typescript
// lib/mcp/errors/index.ts
export class MCPError extends Error {
  constructor(
    public code: string,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'MCPError'
  }
}

export class ToolNotFoundError extends MCPError {
  constructor(toolName: string) {
    super('TOOL_NOT_FOUND', `Tool ${toolName} not found`, { tool: toolName })
    this.name = 'ToolNotFoundError'
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, errors: any) {
    super('VALIDATION_ERROR', message, { errors })
    this.name = 'ValidationError'
  }
}

export class TimeoutError extends MCPError {
  constructor(toolName: string, timeout: number) {
    super('TIMEOUT_ERROR', `Tool ${toolName} timed out after ${timeout}ms`, {
      tool: toolName,
      timeout
    })
    this.name = 'TimeoutError'
  }
}
```

**Step 9**: Write Comprehensive Tests

Create all test files mentioned in TDD section above.

**Step 10**: Create Example MCP Server

```typescript
// examples/simple-mcp-server.ts
import { BaseMCPServer } from '@/lib/mcp/base-server'

class SimpleMCPServer extends BaseMCPServer {
  constructor() {
    super({
      name: 'simple-server',
      version: '1.0.0',
      transport: 'stdio'
    })

    this.registerTools()
  }

  private registerTools() {
    // Register a simple greeting tool
    this.registerTool({
      name: 'greet',
      description: 'Greet a user by name',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      },
      execute: async (params) => {
        return { greeting: `Hello, ${params.name}!` }
      }
    })

    // Register a calculator tool
    this.registerTool({
      name: 'calculate',
      description: 'Perform basic arithmetic',
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['operation', 'a', 'b']
      },
      execute: async (params) => {
        const { operation, a, b } = params
        let result: number

        switch (operation) {
          case 'add':
            result = a + b
            break
          case 'subtract':
            result = a - b
            break
          case 'multiply':
            result = a * b
            break
          case 'divide':
            if (b === 0) throw new Error('Division by zero')
            result = a / b
            break
          default:
            throw new Error('Invalid operation')
        }

        return { result }
      }
    })
  }
}

// Start server
const server = new SimpleMCPServer()
server.start().then(() => {
  console.log('Simple MCP Server started')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.stop()
  process.exit(0)
})
```

**Step 11**: Create Documentation

```typescript
// lib/mcp/README.md
# MCP Base Server Infrastructure

## Overview
This module provides a robust base infrastructure for implementing Model Context Protocol (MCP) servers.

## Features
- ✅ Multiple transport protocols (stdio, HTTP+SSE)
- ✅ Type-safe tool registration with JSON schema validation
- ✅ Automatic retry logic for failed operations
- ✅ Timeout protection
- ✅ Comprehensive error handling
- ✅ Structured logging
- ✅ Lifecycle management

## Quick Start

### 1. Create a Server
\`\`\`typescript
import { BaseMCPServer } from '@/lib/mcp/base-server'

class MyServer extends BaseMCPServer {
  constructor() {
    super({
      name: 'my-server',
      version: '1.0.0',
      transport: 'stdio'
    })
  }
}
\`\`\`

### 2. Register Tools
\`\`\`typescript
server.registerTool({
  name: 'my_tool',
  description: 'Does something useful',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' }
    },
    required: ['param1']
  },
  execute: async (params) => {
    return { result: `Processed ${params.param1}` }
  }
})
\`\`\`

### 3. Start Server
\`\`\`typescript
await server.start()
\`\`\`

## Transport Options

### stdio Transport
Best for local processes and AI agent integration.

\`\`\`typescript
const server = new BaseMCPServer({
  name: 'my-server',
  transport: 'stdio'
})
\`\`\`

### HTTP+SSE Transport
Best for remote access and web integrations.

\`\`\`typescript
const server = new BaseMCPServer({
  name: 'my-server',
  transport: 'http',
  port: 3001
})
\`\`\`

## Tool Execution Options

\`\`\`typescript
// With timeout
await server.executeTool('my_tool', params, { timeout: 5000 })

// With retry
await server.executeTool('my_tool', params, {
  retry: true,
  maxRetries: 3
})
\`\`\`

## Error Handling

All errors follow the MCP error format:
\`\`\`typescript
{
  code: 'ERROR_CODE',
  message: 'Human-readable message',
  data: { /* Additional context */ }
}
\`\`\`

Common error codes:
- `TOOL_NOT_FOUND`: Tool doesn't exist
- `VALIDATION_ERROR`: Invalid parameters
- `TOOL_EXECUTION_ERROR`: Tool threw an error
- `TIMEOUT_ERROR`: Tool execution exceeded timeout

## Testing

\`\`\`bash
npm test -- mcp
\`\`\`
```

### Implementation Validation

After each step, validate that:
- [ ] Code compiles without errors (`npm run build`)
- [ ] Tests pass (`npm test -- mcp`)
- [ ] Linting passes (`npm run lint`)
- [ ] No TypeScript errors

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feature/mcp-base-infrastructure
```

### Commit Guidelines

```bash
# Add types and base implementation
git add lib/mcp/types.ts lib/mcp/base-server.ts
git commit -m "feat(mcp): implement base server class with tool registration"

# Add transports
git add lib/mcp/transports/
git commit -m "feat(mcp): add stdio and HTTP+SSE transport implementations"

# Add tests
git add __tests__/unit/mcp/ __tests__/integration/mcp/
git commit -m "test(mcp): add comprehensive unit and integration tests"

# Add documentation
git add lib/mcp/README.md examples/simple-mcp-server.ts
git commit -m "docs(mcp): add usage documentation and examples"

# Push
git push origin feature/mcp-base-infrastructure
```

### Pull Request Process

```bash
gh pr create --title "Feature: MCP Base Server Infrastructure" \
  --body "Implements base MCP server infrastructure with stdio and HTTP+SSE transports.

## Overview
- Base server class with tool registration framework
- stdio and HTTP+SSE transport implementations
- Comprehensive error handling and validation
- Tool execution with timeout and retry logic
- Lifecycle management and graceful shutdown

## Testing
- 20+ unit tests covering all major functionality
- Integration tests for transport protocols
- >80% code coverage

## Documentation
- Complete README with examples
- JSDoc comments on all public APIs
- Example server implementation

## Dependencies
- TASK-003: Environment Configuration (prerequisite)

## Next Steps
This infrastructure enables:
- TASK-008: Avinode MCP Server
- TASK-009: Gmail MCP Server
- TASK-010: Google Sheets MCP Server

Closes #TASK-007"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Architecture**:
- [ ] BaseMCPServer provides clear abstraction for implementations
- [ ] Transport interface is extensible for new protocols
- [ ] Tool registration is type-safe and validates schemas
- [ ] Error handling follows MCP specification

**Code Quality**:
- [ ] All public methods have JSDoc comments
- [ ] Type definitions are comprehensive
- [ ] No use of `any` without justification
- [ ] Proper separation of concerns

**Testing**:
- [ ] Unit tests cover all major code paths
- [ ] Integration tests verify transport protocols
- [ ] Edge cases and error conditions tested
- [ ] Test coverage >75%

**Performance**:
- [ ] Tool execution overhead is minimal
- [ ] No memory leaks in long-running servers
- [ ] Connection pooling implemented where appropriate
- [ ] Timeouts prevent indefinite hangs

**Security**:
- [ ] Input validation on all tool parameters
- [ ] No code injection vulnerabilities
- [ ] Proper error message sanitization
- [ ] Secrets not logged

**Documentation**:
- [ ] README explains core concepts
- [ ] Examples demonstrate common use cases
- [ ] API documentation is complete
- [ ] Migration path for future versions

---

## 7. TESTING REQUIREMENTS

### Unit Tests

**Coverage Target**: 80%+ for base infrastructure

**Test Files**:
- `__tests__/unit/mcp/base-server.test.ts` (core functionality)
- `__tests__/unit/mcp/tool-registry.test.ts` (tool management)
- `__tests__/unit/mcp/stdio-transport.test.ts` (stdio transport)
- `__tests__/unit/mcp/http-transport.test.ts` (HTTP transport)
- `__tests__/unit/mcp/logger.test.ts` (logging)

**What to Test**:
- Tool registration and validation
- Tool execution with various parameters
- Error handling and formatting
- Timeout behavior
- Retry logic
- Lifecycle management
- Transport message passing

### Integration Tests

**Test Files**:
- `__tests__/integration/mcp/server-lifecycle.test.ts`
- `__tests__/integration/mcp/end-to-end.test.ts`

**What to Test**:
- Complete request/response cycle via stdio
- Complete request/response cycle via HTTP
- Multi-tool orchestration
- Concurrent tool execution
- Server restart behavior
- Resource cleanup

**Example Integration Test**:
```typescript
// __tests__/integration/mcp/end-to-end.test.ts
import { describe, it, expect } from 'vitest'
import { BaseMCPServer } from '@/lib/mcp/base-server'
import { spawn } from 'child_process'

describe('MCP End-to-End', () => {
  it('should handle complete request cycle via stdio', async () => {
    // Create test server
    class TestServer extends BaseMCPServer {
      constructor() {
        super({ name: 'test', version: '1.0.0', transport: 'stdio' })

        this.registerTool({
          name: 'echo',
          description: 'Echo input',
          inputSchema: {
            type: 'object',
            properties: { message: { type: 'string' } },
            required: ['message']
          },
          execute: async (params) => ({ echo: params.message })
        })
      }
    }

    const server = new TestServer()
    await server.start()

    // Execute tool
    const result = await server.executeTool('echo', { message: 'Hello, MCP!' })

    expect(result).toEqual({ echo: 'Hello, MCP!' })

    await server.stop()
  })
})
```

### Running Tests

```bash
# Run all MCP tests
npm test -- mcp

# Run specific test file
npm test -- base-server.test.ts

# Run with coverage
npm run test:coverage -- mcp

# Watch mode
npm run test:watch -- mcp
```

---

## 8. DEFINITION OF DONE

### Code Complete
- [ ] BaseMCPServer class implemented
- [ ] stdio transport working
- [ ] HTTP+SSE transport working
- [ ] Tool registry with validation
- [ ] Error handling with custom error types
- [ ] Logger with structured logging
- [ ] No TypeScript errors or warnings

### Testing Complete
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Test coverage >75%
- [ ] All edge cases covered
- [ ] Performance tests pass

### Documentation Complete
- [ ] README with usage guide
- [ ] JSDoc comments on all public APIs
- [ ] Example server implementations
- [ ] Architecture diagrams (optional)

### Code Review Complete
- [ ] Pull request created
- [ ] At least 1 approval received
- [ ] All review comments addressed
- [ ] CI checks passing

### Integration Ready
- [ ] Can be imported by other MCP servers
- [ ] Example server runs successfully
- [ ] Compatible with MCP specification
- [ ] Ready for TASK-008, 009, 010

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [JSON Schema Validation](https://json-schema.org/)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Node.js readline](https://nodejs.org/api/readline.html)

### Related Tasks
- TASK-003: Environment Configuration (prerequisite)
- TASK-008: Avinode MCP Server (extends this)
- TASK-009: Gmail MCP Server (extends this)
- TASK-010: Google Sheets MCP Server (extends this)
- TASK-011: RFP Orchestrator Agent (uses MCP clients)

### Libraries
- [Ajv](https://ajv.js.org/) - JSON schema validator
- [Express](https://expressjs.com/) - HTTP server for SSE

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- stdio transport is preferred for local AI agent communication
- HTTP+SSE transport enables remote access and debugging
- Tool execution timeout defaults to 30 seconds (configurable)
- Retry logic uses exponential backoff (1s, 2s, 4s, 8s, max 10s)

### Open Questions
- [ ] Should we support WebSocket transport in addition to SSE?
- [ ] Should tool results be cached to improve performance?
- [ ] Do we need rate limiting for tool execution?

### Assumptions
- MCP specification is stable (version 1.0)
- stdio is sufficient for most use cases
- JSON-RPC 2.0 format is required
- Tools are stateless (no session management needed)

### Risks/Blockers
- **Risk**: MCP spec may evolve
  - **Mitigation**: Abstract implementation details, version tools
- **Risk**: Performance bottlenecks with many concurrent tools
  - **Mitigation**: Connection pooling, tool execution queuing

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
*[Fill out after task completion]*

### Changes Made
*[List all files created/modified]*
- Created: `lib/mcp/base-server.ts`
- Created: `lib/mcp/types.ts`
- Created: `lib/mcp/tool-registry.ts`
- Created: `lib/mcp/logger.ts`
- Created: `lib/mcp/transports/stdio.ts`
- Created: `lib/mcp/transports/http.ts`
- Created: `lib/mcp/errors/index.ts`
- Created: `__tests__/unit/mcp/*.test.ts`
- Created: `__tests__/integration/mcp/*.test.ts`
- Created: `examples/simple-mcp-server.ts`
- Created: `lib/mcp/README.md`

### Test Results
```
*[Paste test results after completion]*
```

### Known Issues/Future Work
*[Document any issues or future enhancements]*

### Time Tracking
- **Estimated**: 16 hours
- **Actual**: - hours
- **Variance**: - hours

### Lessons Learned
*[Add lessons learned during implementation]*

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
