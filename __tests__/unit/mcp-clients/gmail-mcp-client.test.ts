/**
 * Gmail MCP Client Unit Tests
 *
 * Tests connection lifecycle, recovery on failure, and retry logic
 * for the Gmail MCP client singleton.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockCallTool = vi.fn();
const mockConnect = vi.fn();
const mockClose = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    callTool: mockCallTool,
    close: mockClose,
  })),
}));

const mockTransportClose = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({
    close: mockTransportClose,
  })),
}));

// Import after mocks are set up
import { sendEmail, disconnect } from '@/lib/mcp/clients/gmail-mcp-client';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('gmail-mcp-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Reset singleton state between tests
    await disconnect();
  });

  describe('sendEmail', () => {
    it('sends email successfully on first call', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      mockCallTool.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              messageId: 'msg-123',
              threadId: 'thread-456',
              labelIds: ['SENT'],
            }),
          },
        ],
      });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body_html: '<p>Hello</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockCallTool).toHaveBeenCalledTimes(1);
    });

    it('reuses existing connection on subsequent calls', async () => {
      mockConnect.mockResolvedValueOnce(undefined);

      // First call
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ success: true, messageId: 'msg-1', threadId: 't-1', labelIds: [] }) }],
      });
      await sendEmail({ to: 'a@b.com', subject: 'S', body_html: '<p>1</p>' });

      // Second call
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ success: true, messageId: 'msg-2', threadId: 't-2', labelIds: [] }) }],
      });
      await sendEmail({ to: 'c@d.com', subject: 'S2', body_html: '<p>2</p>' });

      // Should connect only once (singleton)
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockCallTool).toHaveBeenCalledTimes(2);
    });

    it('recovers from connection closed error by reconnecting and retrying', async () => {
      // First connection succeeds
      mockConnect.mockResolvedValue(undefined);

      // First callTool fails with connection closed
      mockCallTool
        .mockRejectedValueOnce(new Error('MCP error -32000: Connection closed'))
        // After reconnect, second callTool succeeds
        .mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                messageId: 'msg-recovered',
                threadId: 'thread-recovered',
                labelIds: ['SENT'],
              }),
            },
          ],
        });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body_html: '<p>Hello</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-recovered');
      // Should have connected twice (initial + reconnect)
      expect(mockConnect).toHaveBeenCalledTimes(2);
      // Should have called tool twice (failed + retry)
      expect(mockCallTool).toHaveBeenCalledTimes(2);
    });

    it('throws after retry also fails', async () => {
      mockConnect.mockResolvedValue(undefined);

      // Both attempts fail with connection errors
      mockCallTool
        .mockRejectedValueOnce(new Error('MCP error -32000: Connection closed'))
        .mockRejectedValueOnce(new Error('MCP error -32000: Connection closed'));

      await expect(
        sendEmail({ to: 'user@example.com', subject: 'Test', body_html: '<p>Hello</p>' })
      ).rejects.toThrow('Connection closed');

      // Connected twice (initial + retry reconnect)
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });

    it('does not retry on non-connection errors', async () => {
      mockConnect.mockResolvedValueOnce(undefined);

      // Tool returns an error response (not a connection error)
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Invalid recipient' }],
        isError: true,
      });

      await expect(
        sendEmail({ to: 'user@example.com', subject: 'Test', body_html: '<p>Hello</p>' })
      ).rejects.toThrow('Gmail MCP send_email error');

      // Should NOT have retried — only one connect and one callTool
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockCallTool).toHaveBeenCalledTimes(1);
    });

    it('resets connection state on connection error so next call reconnects', async () => {
      mockConnect.mockResolvedValue(undefined);

      // First call: connection error, retry also fails
      mockCallTool
        .mockRejectedValueOnce(new Error('MCP error -32000: Connection closed'))
        .mockRejectedValueOnce(new Error('MCP error -32000: Connection closed'));

      await expect(
        sendEmail({ to: 'a@b.com', subject: 'S', body_html: '<p>1</p>' })
      ).rejects.toThrow();

      // Second call: should reconnect fresh (not use stale client)
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ success: true, messageId: 'msg-fresh', threadId: 't', labelIds: [] }) }],
      });

      const result = await sendEmail({ to: 'c@d.com', subject: 'S2', body_html: '<p>2</p>' });

      expect(result.success).toBe(true);
      // 2 from first call (initial + retry) + 1 from second call = 3
      expect(mockConnect).toHaveBeenCalledTimes(3);
    });
  });

  describe('disconnect', () => {
    it('closes client and transport', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ success: true, messageId: 'm', threadId: 't', labelIds: [] }) }],
      });

      await sendEmail({ to: 'a@b.com', subject: 'S', body_html: '<p>1</p>' });
      await disconnect();

      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(mockTransportClose).toHaveBeenCalledTimes(1);
    });

    it('is safe to call multiple times', async () => {
      await disconnect();
      await disconnect();
      // Should not throw
    });
  });
});
