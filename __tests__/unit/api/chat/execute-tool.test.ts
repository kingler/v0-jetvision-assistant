/**
 * executeTool() Function Tests
 * ONEK-81: Implement executeTool() Function for MCP Tool Invocation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Mock MCP Client
const createMockMCPClient = () => ({
  callTool: vi.fn(),
  listTools: vi.fn(),
});

// Mock TextEncoder
const createMockEncoder = () => ({
  encode: vi.fn((text: string) => new Uint8Array(Buffer.from(text))),
});

// Mock Controller
const createMockController = () => ({
  enqueue: vi.fn(),
  close: vi.fn(),
  error: vi.fn(),
});

describe('executeTool()', () => {
  let mockClient: ReturnType<typeof createMockMCPClient>;
  let mockEncoder: ReturnType<typeof createMockEncoder>;
  let mockController: ReturnType<typeof createMockController>;

  beforeEach(() => {
    mockClient = createMockMCPClient();
    mockEncoder = createMockEncoder();
    mockController = createMockController();
  });

  describe('Successful Tool Execution', () => {
    it('should execute tool successfully and emit SSE events', async () => {
      // Arrange
      const toolName = 'search_flights';
      const toolArgs = {
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: '2025-11-15',
        passengers: 4,
      };

      const mockResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                id: 'flight-1',
                operator: { name: 'NetJets', rating: 4.8 },
                aircraft: { type: 'light_jet', model: 'Citation CJ3+', capacity: 7 },
                pricing: { estimated_total: 25000, currency: 'USD' },
              },
            ]),
          },
        ],
      };

      mockClient.callTool.mockResolvedValue(mockResult);

      // Act
      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;
      const result = await executeTool(toolName, toolArgs, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      // Assert
      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: toolName,
        arguments: toolArgs,
      });

      // Check SSE events were emitted
      expect(mockController.enqueue).toHaveBeenCalledTimes(2); // start + result

      // Verify tool_call_start event
      const startEvent = mockController.enqueue.mock.calls[0][0];
      const startData = new TextDecoder().decode(startEvent);
      expect(startData).toContain('"type":"tool_call_start"');
      expect(startData).toContain('"toolName":"search_flights"');

      // Verify tool_call_result event
      const resultEvent = mockController.enqueue.mock.calls[1][0];
      const resultData = new TextDecoder().decode(resultEvent);
      expect(resultData).toContain('"type":"tool_call_result"');
      expect(resultData).toContain('flight-1');

      // Verify return value is stringified
      expect(typeof result).toBe('string');
      expect(result).toContain('flight-1');
    });

    it('should handle tools with no results', async () => {
      const mockResult = {
        content: [{ type: 'text', text: JSON.stringify([]) }],
      };

      mockClient.callTool.mockResolvedValue(mockResult);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;
      const result = await executeTool('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      expect(result).toBe('[]');
      expect(mockController.enqueue).toHaveBeenCalledTimes(2); // start + result (even with empty results)
    });

    it('should handle complex nested results', async () => {
      const complexResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              rfp_id: 'RFP-20251101-001',
              status: 'sent',
              operators_contacted: 5,
              quotes: [
                { quote_id: 'Q1', total: 25000 },
                { quote_id: 'Q2', total: 27500 },
              ],
            }),
          },
        ],
      };

      mockClient.callTool.mockResolvedValue(complexResult);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;
      const result = await executeTool('create_rfp', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      expect(result).toContain('RFP-20251101-001');
      expect(result).toContain('Q1');
      expect(result).toContain('Q2');
    });
  });

  describe('Error Handling', () => {
    it('should emit tool_call_error event on MCP client error', async () => {
      const error = new Error('MCP tool execution failed');
      mockClient.callTool.mockRejectedValue(error);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      await expect(
        executeTool('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('MCP tool execution failed');

      // Verify tool_call_error event was emitted
      expect(mockController.enqueue).toHaveBeenCalled();
      const errorEvent = mockController.enqueue.mock.calls.find((call) => {
        const data = new TextDecoder().decode(call[0]);
        return data.includes('"type":"tool_call_error"');
      });
      expect(errorEvent).toBeDefined();
    });

    it('should handle tool not found error', async () => {
      const error = new Error('Tool not found: invalid_tool');
      mockClient.callTool.mockRejectedValue(error);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      await expect(
        executeTool('invalid_tool', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('Tool not found');
    });

    it('should handle invalid arguments error', async () => {
      const error = new Error('Invalid arguments: missing required field');
      mockClient.callTool.mockRejectedValue(error);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      await expect(
        executeTool('search_flights', { invalid: 'args' }, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('Invalid arguments');
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Tool execution timeout after 30s');
      mockClient.callTool.mockRejectedValue(error);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      await expect(
        executeTool('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('timeout');
    });

    it('should handle malformed MCP response', async () => {
      const malformedResult = {
        content: [{ type: 'text', text: 'not valid json' }],
      };

      mockClient.callTool.mockResolvedValue(malformedResult);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      // Should not throw, but return the raw text
      const result = await executeTool('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);
      expect(result).toBe('not valid json');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters are provided', async () => {
      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      // Missing required MCP client
      await expect(
        executeTool('search_flights', {}, null as any, mockEncoder as any, mockController as any)
      ).rejects.toThrow();

      // Missing required encoder
      await expect(
        executeTool('search_flights', {}, mockClient as unknown as Client, null as any, mockController as any)
      ).rejects.toThrow();

      // Missing required controller
      await expect(
        executeTool('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, null as any)
      ).rejects.toThrow();
    });

    it('should handle empty tool name', async () => {
      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      await expect(
        executeTool('', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow();
    });
  });

  describe('Logging', () => {
    it('should log tool invocation details', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const mockResult = {
        content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
      };
      mockClient.callTool.mockResolvedValue(mockResult);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;
      await executeTool('search_flights', { test: 'args' }, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Executing MCP tool'),
        expect.stringContaining('search_flights')
      );

      consoleSpy.mockRestore();
    });

    it('should log errors with context', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      mockClient.callTool.mockRejectedValue(new Error('Test error'));

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      await expect(
        executeTool('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool execution error'),
        expect.stringContaining('search_flights'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('SSE Event Format', () => {
    it('should emit tool_call_start with correct format', async () => {
      const mockResult = {
        content: [{ type: 'text', text: '{}' }],
      };
      mockClient.callTool.mockResolvedValue(mockResult);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;
      await executeTool('search_flights', { test: 'args' }, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      const startEvent = mockController.enqueue.mock.calls[0][0];
      const startData = new TextDecoder().decode(startEvent);

      expect(startData).toMatch(/^data: /);
      expect(startData).toContain('"type":"tool_call_start"');
      expect(startData).toContain('"toolName":"search_flights"');
      expect(startData).toContain('"arguments":{');
      expect(startData).toMatch(/\n\n$/); // SSE format requires double newline
    });

    it('should emit tool_call_result with correct format', async () => {
      const mockResult = {
        content: [{ type: 'text', text: JSON.stringify({ result: 'success' }) }],
      };
      mockClient.callTool.mockResolvedValue(mockResult);

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;
      await executeTool('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      const resultEvent = mockController.enqueue.mock.calls[1][0];
      const resultData = new TextDecoder().decode(resultEvent);

      expect(resultData).toMatch(/^data: /);
      expect(resultData).toContain('"type":"tool_call_result"');
      expect(resultData).toContain('"toolName":"search_flights"');
      expect(resultData).toContain('"result":"success"');
      expect(resultData).toMatch(/\n\n$/);
    });

    it('should emit tool_call_error with correct format', async () => {
      mockClient.callTool.mockRejectedValue(new Error('Test error'));

      const executeTool = (await import('@/app/api/chat/respond/route')).executeTool;

      await expect(
        executeTool('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow();

      const errorEventCall = mockController.enqueue.mock.calls.find((call) => {
        const data = new TextDecoder().decode(call[0]);
        return data.includes('"type":"tool_call_error"');
      });

      expect(errorEventCall).toBeDefined();
      const errorData = new TextDecoder().decode(errorEventCall![0]);

      expect(errorData).toMatch(/^data: /);
      expect(errorData).toContain('"type":"tool_call_error"');
      expect(errorData).toContain('"toolName":"search_flights"');
      expect(errorData).toContain('"error":"Test error"');
      expect(errorData).toMatch(/\n\n$/);
    });
  });
});
