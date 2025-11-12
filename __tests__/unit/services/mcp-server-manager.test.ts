/**
 * Unit tests for MCPServerManager
 * Testing ONEK-78: MCPServerManager Singleton
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPServerManager, ServerState } from '@/lib/services/mcp-server-manager';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('MCPServerManager', () => {
  let manager: MCPServerManager;

  beforeEach(() => {
    // Reset singleton instance before each test
    (MCPServerManager as any).instance = undefined;
    manager = MCPServerManager.getInstance();
  });

  afterEach(async () => {
    // Cleanup: shutdown all servers
    await manager.shutdownAll();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = MCPServerManager.getInstance();
      const instance2 = MCPServerManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should prevent direct instantiation', () => {
      expect(() => new (MCPServerManager as any)()).toThrow();
    });
  });

  describe('Server Lifecycle', () => {
    it('should spawn a server successfully', async () => {
      const serverName = 'test-server';
      const command = 'node';
      const args = ['--version'];

      await manager.spawnServer(serverName, command, args);

      const state = manager.getServerState(serverName);
      expect(state).toBe(ServerState.RUNNING);
    });

    it('should track server state correctly', async () => {
      const serverName = 'test-server';
      const command = 'node';
      const args = ['--version'];

      // Before spawning
      expect(manager.getServerState(serverName)).toBe(ServerState.STOPPED);

      // During spawn (transitions through STARTING)
      const spawnPromise = manager.spawnServer(serverName, command, args);

      // After spawning
      await spawnPromise;
      expect(manager.getServerState(serverName)).toBe(ServerState.RUNNING);
    });

    it('should shutdown a server gracefully', async () => {
      const serverName = 'test-server';
      await manager.spawnServer(serverName, 'node', ['--version']);

      await manager.shutdownServer(serverName);

      const state = manager.getServerState(serverName);
      expect(state).toBe(ServerState.STOPPED);
    });

    it('should shutdown all servers', async () => {
      await manager.spawnServer('server1', 'node', ['--version']);
      await manager.spawnServer('server2', 'node', ['--version']);

      await manager.shutdownAll();

      expect(manager.getServerState('server1')).toBe(ServerState.STOPPED);
      expect(manager.getServerState('server2')).toBe(ServerState.STOPPED);
    });
  });

  describe('Process Registry', () => {
    it('should register spawned process', async () => {
      const serverName = 'test-server';
      await manager.spawnServer(serverName, 'node', ['--version']);

      const process = manager.getProcess(serverName);
      expect(process).toBeDefined();
      expect(process?.pid).toBeDefined();
    });

    it('should remove process from registry after shutdown', async () => {
      const serverName = 'test-server';
      await manager.spawnServer(serverName, 'node', ['--version']);
      await manager.shutdownServer(serverName);

      const process = manager.getProcess(serverName);
      expect(process).toBeUndefined();
    });
  });

  describe('Client Registry', () => {
    it('should create and register MCP client', async () => {
      const serverName = 'test-server';
      await manager.spawnServer(serverName, 'node', ['--version']);

      const client = await manager.getClient(serverName);
      expect(client).toBeDefined();
    });

    it('should reuse existing client for same server', async () => {
      const serverName = 'test-server';
      await manager.spawnServer(serverName, 'node', ['--version']);

      const client1 = await manager.getClient(serverName);
      const client2 = await manager.getClient(serverName);

      expect(client1).toBe(client2);
    });

    it('should throw error when getting client for non-existent server', async () => {
      await expect(manager.getClient('non-existent')).rejects.toThrow();
    });
  });

  describe('Auto-Restart on Crash', () => {
    it('should detect crashed server', async () => {
      const serverName = 'crash-test';
      await manager.spawnServer(serverName, 'node', ['-e', 'process.exit(1)']);

      // Wait for process to crash
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = manager.getServerState(serverName);
      expect(state).toBe(ServerState.CRASHED);
    });

    it('should auto-restart crashed server', async () => {
      const serverName = 'restart-test';
      await manager.spawnServer(serverName, 'node', ['-e', 'setTimeout(() => {}, 1000)']);

      // Simulate crash
      const process = manager.getProcess(serverName);
      process?.kill('SIGKILL');

      // Wait for auto-restart
      await new Promise(resolve => setTimeout(resolve, 1500));

      const state = manager.getServerState(serverName);
      expect(state).toBe(ServerState.RUNNING);
    });

    it('should use exponential backoff for restarts', async () => {
      const serverName = 'backoff-test';

      // Spawn server that immediately crashes
      await manager.spawnServer(serverName, 'node', ['-e', 'process.exit(1)']);

      // Track restart attempts
      const restartAttempts = manager.getRestartAttempts(serverName);
      expect(restartAttempts).toBeGreaterThan(0);

      // Verify backoff increases
      const backoffDelay = manager.getBackoffDelay(serverName);
      expect(backoffDelay).toBeGreaterThan(1000); // Should be > 1s after first restart
    });

    it('should limit restart attempts', async () => {
      const serverName = 'limit-test';
      const maxAttempts = 5;

      await manager.spawnServer(serverName, 'node', ['-e', 'process.exit(1)'], { maxRestartAttempts: maxAttempts });

      // Wait for all restart attempts (reduced from 10s to 2s for faster tests)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const attempts = manager.getRestartAttempts(serverName);
      expect(attempts).toBeLessThanOrEqual(maxAttempts);

      const state = manager.getServerState(serverName);
      expect(state).toBe(ServerState.FAILED);
    }, 5000); // Add test timeout of 5s
  });

  describe('Error Handling', () => {
    it('should handle invalid command', async () => {
      await expect(
        manager.spawnServer('invalid', 'non-existent-command', [])
      ).rejects.toThrow();
    });

    it('should handle spawn timeout', async () => {
      await expect(
        manager.spawnServer('timeout-test', 'sleep', ['1000'], { spawnTimeout: 100 })
      ).rejects.toThrow(/timeout/i);
    });

    it('should clean up resources on error', async () => {
      try {
        await manager.spawnServer('error-test', 'non-existent-command', []);
      } catch {
        // Expected to fail
      }

      const process = manager.getProcess('error-test');
      expect(process).toBeUndefined();
    });
  });

  describe('Health Status', () => {
    it('should return health status for all servers', async () => {
      await manager.spawnServer('server1', 'node', ['--version']);
      await manager.spawnServer('server2', 'node', ['--version']);

      const health = manager.getHealthStatus();

      expect(health).toHaveProperty('server1');
      expect(health).toHaveProperty('server2');
      expect(health.server1.state).toBe(ServerState.RUNNING);
      expect(health.server2.state).toBe(ServerState.RUNNING);
    });

    it('should include uptime in health status', async () => {
      await manager.spawnServer('uptime-test', 'node', ['--version']);
      await new Promise(resolve => setTimeout(resolve, 100));

      const health = manager.getHealthStatus();
      expect(health['uptime-test'].uptime).toBeGreaterThan(0);
    });

    it('should include restart count in health status', async () => {
      const serverName = 'restart-count-test';
      await manager.spawnServer(serverName, 'node', ['-e', 'setTimeout(() => {}, 1000)']);

      // Force restart
      const process = manager.getProcess(serverName);
      process?.kill('SIGKILL');
      await new Promise(resolve => setTimeout(resolve, 1500));

      const health = manager.getHealthStatus();
      expect(health[serverName].restartCount).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent server spawns', async () => {
      const spawns = [
        manager.spawnServer('concurrent1', 'node', ['--version']),
        manager.spawnServer('concurrent2', 'node', ['--version']),
        manager.spawnServer('concurrent3', 'node', ['--version']),
      ];

      await Promise.all(spawns);

      expect(manager.getServerState('concurrent1')).toBe(ServerState.RUNNING);
      expect(manager.getServerState('concurrent2')).toBe(ServerState.RUNNING);
      expect(manager.getServerState('concurrent3')).toBe(ServerState.RUNNING);
    });

    it('should handle concurrent shutdowns', async () => {
      await manager.spawnServer('shutdown1', 'node', ['--version']);
      await manager.spawnServer('shutdown2', 'node', ['--version']);
      await manager.spawnServer('shutdown3', 'node', ['--version']);

      const shutdowns = [
        manager.shutdownServer('shutdown1'),
        manager.shutdownServer('shutdown2'),
        manager.shutdownServer('shutdown3'),
      ];

      await Promise.all(shutdowns);

      expect(manager.getServerState('shutdown1')).toBe(ServerState.STOPPED);
      expect(manager.getServerState('shutdown2')).toBe(ServerState.STOPPED);
      expect(manager.getServerState('shutdown3')).toBe(ServerState.STOPPED);
    });
  });

  describe('Configuration', () => {
    it('should accept custom spawn timeout', async () => {
      const serverName = 'custom-timeout';
      await manager.spawnServer(serverName, 'node', ['--version'], { spawnTimeout: 5000 });

      expect(manager.getServerState(serverName)).toBe(ServerState.RUNNING);
    });

    it('should accept custom max restart attempts', async () => {
      const serverName = 'custom-retries';
      await manager.spawnServer(serverName, 'node', ['-e', 'process.exit(1)'], { maxRestartAttempts: 3 });

      // Wait for all restart attempts
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 5s to 1s for faster tests

      const attempts = manager.getRestartAttempts(serverName);
      expect(attempts).toBeLessThanOrEqual(3);
    });
  });
});
