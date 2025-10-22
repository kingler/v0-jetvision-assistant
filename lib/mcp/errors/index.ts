/**
 * MCP Custom Error Types
 *
 * Defines custom error classes for MCP server operations.
 * All errors extend the base MCPError class and follow JSON-RPC 2.0 error codes.
 */

import { MCPError as MCPErrorType } from '../types';

/**
 * Base MCP Error class
 */
export class MCPError extends Error implements MCPErrorType {
  code: string | number;
  data?: any;

  constructor(message: string, code: string | number = 'INTERNAL_ERROR', data?: any) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.data = data;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON-RPC 2.0 error format
   */
  toJSON(): MCPErrorType {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
      stack: this.stack,
    };
  }
}

/**
 * Tool Not Found Error
 * Thrown when attempting to execute a non-existent tool
 */
export class ToolNotFoundError extends MCPError {
  constructor(toolName: string) {
    super(`Tool ${toolName} not found`, 'TOOL_NOT_FOUND', { toolName });
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Validation Error
 * Thrown when tool parameters fail validation
 */
export class ValidationError extends MCPError {
  constructor(message: string, validationErrors?: any[]) {
    super(message, 'VALIDATION_ERROR', { validationErrors });
    this.name = 'ValidationError';
  }
}

/**
 * Timeout Error
 * Thrown when tool execution exceeds timeout
 */
export class TimeoutError extends MCPError {
  constructor(timeout: number, toolName?: string) {
    super(
      `Tool execution timeout${toolName ? ` for ${toolName}` : ''} after ${timeout}ms`,
      'TIMEOUT_ERROR',
      { timeout, toolName }
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Tool Execution Error
 * Thrown when tool execution fails
 */
export class ToolExecutionError extends MCPError {
  constructor(toolName: string, originalError: Error) {
    super(
      originalError.message,
      'TOOL_EXECUTION_ERROR',
      {
        toolName,
        originalError: {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack,
        },
      }
    );
    this.name = 'ToolExecutionError';
  }
}

/**
 * Server State Error
 * Thrown when server is in invalid state for operation
 */
export class ServerStateError extends MCPError {
  constructor(currentState: string, requiredState: string) {
    super(
      `Server is in ${currentState} state, but ${requiredState} is required`,
      'SERVER_STATE_ERROR',
      { currentState, requiredState }
    );
    this.name = 'ServerStateError';
  }
}

/**
 * Transport Error
 * Thrown when transport-related operations fail
 */
export class TransportError extends MCPError {
  constructor(message: string, transportType: string) {
    super(message, 'TRANSPORT_ERROR', { transportType });
    this.name = 'TransportError';
  }
}

/**
 * Tool Already Registered Error
 * Thrown when attempting to register a tool that already exists
 */
export class ToolAlreadyRegisteredError extends MCPError {
  constructor(toolName: string) {
    super(`Tool ${toolName} already registered`, 'TOOL_ALREADY_REGISTERED', { toolName });
    this.name = 'ToolAlreadyRegisteredError';
  }
}
