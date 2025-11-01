/**
 * MCP Health Check API Route Tests
 * ONEK-80: Add Health Check Endpoint for MCP Server Status
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/mcp/health/route';
import { MCPServerManager, ServerState } from '@/lib/services/mcp-server-manager';
import { NextRequest } from 'next/server';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

describe('/api/mcp/health', () => {
  let mockAuth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAuth = vi.mocked(auth);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated users to check health', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBeOneOf([200, 503]);
    });
  });

  describe('Health Status Response', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });
    });

    it('should return 200 when all servers are running', async () => {
      // Mock MCPServerManager to return healthy servers
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({
          avinode: {
            name: 'avinode',
            state: ServerState.RUNNING,
            uptime: 120000,
            restartCount: 0,
            pid: 12345,
          },
        }),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.servers).toHaveProperty('avinode');
      expect(data.servers.avinode.state).toBe(ServerState.RUNNING);
      expect(data.servers.avinode.uptime).toBe(120000);
      expect(data.servers.avinode.pid).toBe(12345);
      expect(data.timestamp).toBeDefined();
    });

    it('should return 503 when any server is crashed', async () => {
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({
          avinode: {
            name: 'avinode',
            state: ServerState.CRASHED,
            uptime: 5000,
            restartCount: 2,
          },
        }),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();

      expect(data.status).toBe('unhealthy');
      expect(data.servers.avinode.state).toBe(ServerState.CRASHED);
    });

    it('should return 503 when any server is failed', async () => {
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({
          avinode: {
            name: 'avinode',
            state: ServerState.FAILED,
            uptime: 0,
            restartCount: 5,
          },
        }),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();

      expect(data.status).toBe('unhealthy');
      expect(data.servers.avinode.state).toBe(ServerState.FAILED);
    });

    it('should return 200 when server is starting (transitional state)', async () => {
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({
          avinode: {
            name: 'avinode',
            state: ServerState.STARTING,
            uptime: 100,
            restartCount: 0,
          },
        }),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.servers.avinode.state).toBe(ServerState.STARTING);
    });

    it('should handle multiple servers with mixed states', async () => {
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({
          avinode: {
            name: 'avinode',
            state: ServerState.RUNNING,
            uptime: 120000,
            restartCount: 0,
            pid: 12345,
          },
          gmail: {
            name: 'gmail',
            state: ServerState.CRASHED,
            uptime: 5000,
            restartCount: 1,
          },
        }),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();

      expect(data.status).toBe('unhealthy');
      expect(data.servers).toHaveProperty('avinode');
      expect(data.servers).toHaveProperty('gmail');
      expect(data.servers.avinode.state).toBe(ServerState.RUNNING);
      expect(data.servers.gmail.state).toBe(ServerState.CRASHED);
    });

    it('should return 200 when no servers are registered', async () => {
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({}),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.servers).toEqual({});
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });
    });

    it('should include timestamp in ISO format', async () => {
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({}),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include server count', async () => {
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({
          avinode: {
            name: 'avinode',
            state: ServerState.RUNNING,
            uptime: 120000,
            restartCount: 0,
            pid: 12345,
          },
          gmail: {
            name: 'gmail',
            state: ServerState.RUNNING,
            uptime: 60000,
            restartCount: 0,
            pid: 12346,
          },
        }),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.serverCount).toBe(2);
    });

    it('should include uptime in human-readable format', async () => {
      const mockManager = {
        getHealthStatus: vi.fn().mockReturnValue({
          avinode: {
            name: 'avinode',
            state: ServerState.RUNNING,
            uptime: 125000, // 2 minutes 5 seconds
            restartCount: 0,
            pid: 12345,
          },
        }),
      };

      vi.spyOn(MCPServerManager, 'getInstance').mockReturnValue(mockManager as any);

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.servers.avinode.uptime).toBe(125000);
      expect(data.servers.avinode.uptimeFormatted).toMatch(/2m 5s/);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });
    });

    it('should handle MCPServerManager errors gracefully', async () => {
      vi.spyOn(MCPServerManager, 'getInstance').mockImplementation(() => {
        throw new Error('Manager initialization failed');
      });

      const request = new NextRequest('http://localhost:3000/api/mcp/health');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
