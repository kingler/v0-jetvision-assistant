/**
 * BaseMCPServer - Unit Tests (TDD Red Phase)
 *
 * Following Test-Driven Development:
 * 1. Write tests FIRST (these will fail initially)
 * 2. Implement minimum code to pass tests
 * 3. Refactor and improve
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseMCPServer } from '@/lib/mcp/base-server';
import { MCPToolDefinition } from '@/lib/mcp/types';

describe('BaseMCPServer', () => {
  let server: TestMCPServer;

  // Create test implementation
  class TestMCPServer extends BaseMCPServer {
    constructor() {
      super({
        name: 'test-server',
        version: '1.0.0',
        transport: 'stdio',
      });
    }
  }

  beforeEach(() => {
    server = new TestMCPServer();
  });

  afterEach(async () => {
    if (server.getState() === 'running') {
      await server.stop();
    }
  });

  describe('Tool Registration', () => {
    it('should register a tool with valid schema', () => {
      const tool: MCPToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
        execute: async (params) => {
          return { result: params.message };
        },
      };

      server.registerTool(tool);
      expect(server.getTools()).toContain('test_tool');
    });

    it('should throw error for duplicate tool names', () => {
      const tool: MCPToolDefinition = {
        name: 'duplicate_tool',
        description: 'Test',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({}),
      };

      server.registerTool(tool);
      expect(() => server.registerTool(tool)).toThrow('Tool duplicate_tool already registered');
    });

    it('should validate tool schema on registration', () => {
      const invalidTool = {
        name: 'invalid',
        // Missing required fields
      } as any;

      expect(() => server.registerTool(invalidTool)).toThrow('Invalid tool definition');
    });
  });

  describe('Tool Execution', () => {
    it('should execute registered tool with valid parameters', async () => {
      const tool: MCPToolDefinition = {
        name: 'greet',
        description: 'Greet a user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        execute: async (params) => {
          return { greeting: `Hello, ${params.name}!` };
        },
      };

      server.registerTool(tool);
      await server.start();

      const result = await server.executeTool('greet', { name: 'Alice' });
      expect(result).toEqual({ greeting: 'Hello, Alice!' });
    });

    it('should throw error for non-existent tool', async () => {
      await server.start();
      await expect(server.executeTool('nonexistent', {})).rejects.toThrow('Tool nonexistent not found');
    });

    it('should validate tool parameters against schema', async () => {
      const tool: MCPToolDefinition = {
        name: 'add',
        description: 'Add two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
        },
        execute: async (params) => {
          return { result: params.a + params.b };
        },
      };

      server.registerTool(tool);
      await server.start();

      // Missing required parameter
      await expect(server.executeTool('add', { a: 5 })).rejects.toThrow('Validation failed');

      // Wrong type
      await expect(server.executeTool('add', { a: 'five', b: 10 })).rejects.toThrow('Validation failed');
    });

    it(
      'should timeout long-running tools',
      async () => {
        const tool: MCPToolDefinition = {
          name: 'slow_tool',
          description: 'A slow tool',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds
            return { done: true };
          },
        };

        server.registerTool(tool);
        await server.start();

        await expect(server.executeTool('slow_tool', {}, { timeout: 1000 })).rejects.toThrow(
          'Tool execution timeout'
        );
      },
      10000
    ); // Test timeout 10s

    it('should retry failed tool executions', async () => {
      let attempts = 0;

      const tool: MCPToolDefinition = {
        name: 'flaky_tool',
        description: 'A flaky tool',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Transient failure');
          }
          return { success: true, attempts };
        },
      };

      server.registerTool(tool);
      await server.start();

      const result = await server.executeTool('flaky_tool', {}, { retry: true, maxRetries: 3 });
      expect(result.attempts).toBe(3);
      expect(attempts).toBe(3);
    });
  });

  describe('Lifecycle Management', () => {
    it('should transition through lifecycle states', async () => {
      expect(server.getState()).toBe('idle');

      await server.start();
      expect(server.getState()).toBe('running');

      await server.stop();
      expect(server.getState()).toBe('stopped');
    });

    it('should prevent operations when not running', async () => {
      // Before start
      await expect(server.executeTool('test', {})).rejects.toThrow('Server not running');

      await server.start();
      await server.stop();

      // After stop
      await expect(server.executeTool('test', {})).rejects.toThrow('Server not running');
    });

    it('should cleanup resources on shutdown', async () => {
      const cleanupSpy = vi.fn();
      server.onShutdown(cleanupSpy);

      await server.start();
      await server.stop();

      expect(cleanupSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Error Handling', () => {
    it('should format errors per MCP spec', async () => {
      const tool: MCPToolDefinition = {
        name: 'error_tool',
        description: 'A tool that errors',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          throw new Error('Something went wrong');
        },
      };

      server.registerTool(tool);
      await server.start();

      try {
        await server.executeTool('error_tool', {});
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toMatchObject({
          code: 'TOOL_EXECUTION_ERROR',
          message: 'Something went wrong',
        });
      }
    });

    it('should log errors with context', async () => {
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const tool: MCPToolDefinition = {
        name: 'error_tool',
        description: 'Errors',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          throw new Error('Test error');
        },
      };

      server.registerTool(tool);
      await server.start();

      try {
        await server.executeTool('error_tool', { param: 'value' });
      } catch {
        // Expected error
      }

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
