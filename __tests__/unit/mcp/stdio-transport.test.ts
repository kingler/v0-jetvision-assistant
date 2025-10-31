/**
 * StdioTransport - Unit Tests (TDD Red Phase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StdioTransport } from '@/lib/mcp/transports/stdio';
import { MCPMessage } from '@/lib/mcp/types';

describe('StdioTransport', () => {
  let transport: StdioTransport;

  beforeEach(() => {
    transport = new StdioTransport();
  });

  it('should create transport instance', () => {
    expect(transport).toBeDefined();
  });

  it('should start transport successfully', async () => {
    await expect(transport.start()).resolves.not.toThrow();
  });

  it('should send messages to stdout', async () => {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: 1,
      result: { success: true },
    };

    const stdoutMock = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await transport.start();

    await transport.send(message);

    expect(stdoutMock).toHaveBeenCalledWith(JSON.stringify(message) + '\n');
    stdoutMock.mockRestore();
  });

  it('should close transport gracefully', async () => {
    await transport.start();
    await expect(transport.close()).resolves.not.toThrow();
  });

  it('should handle send before start', async () => {
    const message: MCPMessage = { jsonrpc: '2.0', result: {} };
    await expect(transport.send(message)).rejects.toThrow('Transport not started');
  });
});
