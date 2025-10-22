/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * Core types and interfaces for the MCP server infrastructure.
 * Based on the Model Context Protocol specification.
 */

/**
 * Server lifecycle states
 */
export type ServerState = 'idle' | 'running' | 'error' | 'stopped';

/**
 * MCP Tool Definition
 * Defines a tool that can be executed by the MCP server
 */
export interface MCPToolDefinition {
  /** Unique tool name */
  name: string;

  /** Human-readable description */
  description: string;

  /** JSON Schema for input validation */
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };

  /** Tool execution function */
  execute: (params: any) => Promise<any>;

  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  /** Server name */
  name: string;

  /** Server version */
  version: string;

  /** Transport type */
  transport: 'stdio' | 'http';

  /** Optional HTTP configuration */
  httpConfig?: {
    port: number;
    host?: string;
  };

  /** Optional timeout in milliseconds */
  timeout?: number;

  /** Optional retry configuration */
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
  };

  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * JSON-RPC 2.0 Message Format
 * Based on the JSON-RPC 2.0 specification
 */
export interface MCPMessage {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: '2.0';

  /** Request ID (for requests and responses) */
  id?: string | number;

  /** Method name (for requests) */
  method?: string;

  /** Parameters (for requests) */
  params?: any;

  /** Result (for successful responses) */
  result?: any;

  /** Error (for error responses) */
  error?: MCPError;
}

/**
 * MCP Error Format
 * Based on JSON-RPC 2.0 error object
 */
export interface MCPError {
  /** Error code */
  code: string | number;

  /** Error message */
  message: string;

  /** Additional error data */
  data?: any;

  /** Error stack trace (optional, for debugging) */
  stack?: string;
}

/**
 * Tool Execution Options
 */
export interface ToolExecutionOptions {
  /** Execution timeout in milliseconds */
  timeout?: number;

  /** Whether to retry on failure */
  retry?: boolean;

  /** Maximum number of retries */
  maxRetries?: number;

  /** Delay between retries in milliseconds */
  retryDelay?: number;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Transport Interface
 * Defines the contract for MCP transport implementations
 */
export interface Transport {
  /** Start the transport */
  start(): Promise<void>;

  /** Send a message */
  send(message: MCPMessage): Promise<void>;

  /** Receive messages (optional, for bidirectional transports) */
  receive?(): AsyncIterator<MCPMessage>;

  /** Close the transport */
  close(): Promise<void>;

  /** Check if transport is active */
  isActive(): boolean;
}

/**
 * Logger Interface
 * Defines the contract for logging
 */
export interface Logger {
  /** Log info message */
  info(message: string, meta?: Record<string, any>): void;

  /** Log warning message */
  warn(message: string, meta?: Record<string, any>): void;

  /** Log error message */
  error(message: string | Error, meta?: Record<string, any>): void;

  /** Log debug message */
  debug?(message: string, meta?: Record<string, any>): void;
}

/**
 * Tool Execution Result
 */
export interface ToolExecutionResult {
  /** Whether execution was successful */
  success: boolean;

  /** Result data (if successful) */
  data?: any;

  /** Error (if failed) */
  error?: MCPError;

  /** Execution duration in milliseconds */
  duration?: number;

  /** Number of retry attempts */
  attempts?: number;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Server Metrics
 */
export interface ServerMetrics {
  /** Total number of tool executions */
  totalExecutions: number;

  /** Number of successful executions */
  successfulExecutions: number;

  /** Number of failed executions */
  failedExecutions: number;

  /** Average execution time in milliseconds */
  averageExecutionTime: number;

  /** Server uptime in milliseconds */
  uptime: number;

  /** Timestamp of last execution */
  lastExecutionAt?: string;

  /** Additional metrics */
  custom?: Record<string, any>;
}

/**
 * Shutdown Hook Function
 */
export type ShutdownHook = () => void | Promise<void>;
