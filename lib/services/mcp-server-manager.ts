/**
 * MCP Server Manager - Singleton
 * Manages MCP server process lifecycle with auto-restart capabilities
 * ONEK-78: MCPServerManager Singleton
 */

import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Server State Enum
 */
export enum ServerState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  CRASHED = 'crashed',
  FAILED = 'failed',
}

/**
 * Server Configuration Options
 */
export interface ServerConfig {
  spawnTimeout?: number; // Max time to wait for server spawn (ms)
  maxRestartAttempts?: number; // Max number of auto-restart attempts
  baseBackoffDelay?: number; // Base delay for exponential backoff (ms)
}

/**
 * Server Health Status
 */
export interface ServerHealth {
  name: string;
  state: ServerState;
  uptime: number; // milliseconds
  restartCount: number;
  pid?: number;
}

/**
 * Server Metadata
 */
interface ServerMetadata {
  process?: ChildProcess;
  client?: Client;
  state: ServerState;
  command: string;
  args: string[];
  config: Required<ServerConfig>;
  startTime?: number;
  restartAttempts: number;
  lastRestartTime?: number;
}

/**
 * Default Configuration
 */
const DEFAULT_CONFIG: Required<ServerConfig> = {
  spawnTimeout: 10000, // 10 seconds
  maxRestartAttempts: 5,
  baseBackoffDelay: 1000, // 1 second
};

/**
 * MCP Server Manager Singleton
 * Manages lifecycle of MCP server processes
 */
export class MCPServerManager {
  private static instance: MCPServerManager;
  private servers: Map<string, ServerMetadata> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    if (MCPServerManager.instance) {
      throw new Error('Use MCPServerManager.getInstance() instead of new MCPServerManager()');
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MCPServerManager {
    if (!MCPServerManager.instance) {
      MCPServerManager.instance = new MCPServerManager();
    }
    return MCPServerManager.instance;
  }

  /**
   * Spawn a new MCP server process
   */
  public async spawnServer(
    name: string,
    command: string,
    args: string[],
    config: ServerConfig = {}
  ): Promise<void> {
    if (this.servers.has(name)) {
      const metadata = this.servers.get(name)!;
      if (metadata.state === ServerState.RUNNING) {
        throw new Error(`Server "${name}" is already running`);
      }
    }

    const fullConfig: Required<ServerConfig> = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Initialize metadata
    const metadata: ServerMetadata = {
      state: ServerState.STARTING,
      command,
      args,
      config: fullConfig,
      restartAttempts: 0,
    };

    this.servers.set(name, metadata);

    try {
      await this.doSpawn(name, metadata);
    } catch (error) {
      // Clean up on error
      this.servers.delete(name);
      throw error;
    }
  }

  /**
   * Internal method to spawn process
   */
  private async doSpawn(name: string, metadata: ServerMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      const spawnTimeout = setTimeout(() => {
        cleanup();
        metadata.state = ServerState.FAILED;
        reject(new Error(`Server spawn timeout for "${name}"`));
      }, metadata.config.spawnTimeout);

      let resolved = false;

      const cleanup = () => {
        clearTimeout(spawnTimeout);
        if (!resolved) {
          resolved = true;
        }
      };

      try {
        // Spawn process
        const childProcess = spawn(metadata.command, metadata.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        });

        metadata.process = childProcess;
        metadata.startTime = Date.now();

        // Handle process events
        childProcess.on('error', (error) => {
          console.error(`[MCPServerManager] Server "${name}" spawn error:`, error);
          metadata.state = ServerState.FAILED;

          if (!resolved) {
            cleanup();
            reject(error);
          }
        });

        childProcess.on('exit', (code, signal) => {
          console.log(`[MCPServerManager] Server "${name}" exited with code ${code}, signal ${signal}`);

          if (metadata.state === ServerState.STOPPING) {
            // Intentional shutdown
            metadata.state = ServerState.STOPPED;
            metadata.process = undefined;
            metadata.client = undefined;
          } else {
            // Unexpected exit - crashed
            metadata.state = ServerState.CRASHED;
            metadata.process = undefined;
            metadata.client = undefined;

            // Attempt auto-restart
            this.scheduleRestart(name, metadata);
          }
        });

        // For stdio transport, we can consider the server "running" immediately after spawn
        // In production, you might want to wait for a handshake or health check
        metadata.state = ServerState.RUNNING;
        cleanup();
        resolve();
      } catch (error) {
        cleanup();
        metadata.state = ServerState.FAILED;
        reject(error);
      }
    });
  }

  /**
   * Schedule auto-restart with exponential backoff
   */
  private scheduleRestart(name: string, metadata: ServerMetadata): void {
    if (metadata.restartAttempts >= metadata.config.maxRestartAttempts) {
      console.error(`[MCPServerManager] Max restart attempts reached for "${name}"`);
      metadata.state = ServerState.FAILED;
      return;
    }

    metadata.restartAttempts++;
    const backoffDelay = this.calculateBackoff(metadata);

    console.log(
      `[MCPServerManager] Scheduling restart #${metadata.restartAttempts} for "${name}" in ${backoffDelay}ms`
    );

    metadata.lastRestartTime = Date.now();

    setTimeout(async () => {
      try {
        metadata.state = ServerState.STARTING;
        await this.doSpawn(name, metadata);
        console.log(`[MCPServerManager] Successfully restarted "${name}"`);
      } catch (error) {
        console.error(`[MCPServerManager] Restart failed for "${name}":`, error);
      }
    }, backoffDelay);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(metadata: ServerMetadata): number {
    const { baseBackoffDelay } = metadata.config;
    const attempt = metadata.restartAttempts;
    return baseBackoffDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Get MCP client for a server
   * Creates client if it doesn't exist
   */
  public async getClient(name: string): Promise<Client> {
    const metadata = this.servers.get(name);

    if (!metadata) {
      throw new Error(`Server "${name}" not found`);
    }

    if (metadata.state !== ServerState.RUNNING) {
      throw new Error(`Server "${name}" is not running (state: ${metadata.state})`);
    }

    // Return existing client if available
    if (metadata.client) {
      return metadata.client;
    }

    // Create new client
    if (!metadata.process) {
      throw new Error(`Server "${name}" has no process`);
    }

    const transport = new StdioClientTransport({
      command: metadata.command,
      args: metadata.args,
    });

    const client = new Client({
      name: `${name}-client`,
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await client.connect(transport);

    metadata.client = client;
    return client;
  }

  /**
   * Shutdown a specific server
   */
  public async shutdownServer(name: string): Promise<void> {
    const metadata = this.servers.get(name);

    if (!metadata) {
      throw new Error(`Server "${name}" not found`);
    }

    if (metadata.state === ServerState.STOPPED) {
      return; // Already stopped
    }

    metadata.state = ServerState.STOPPING;

    // Close client first
    if (metadata.client) {
      try {
        await metadata.client.close();
      } catch (error) {
        console.error(`[MCPServerManager] Error closing client for "${name}":`, error);
      }
      metadata.client = undefined;
    }

    // Kill process
    if (metadata.process) {
      return new Promise((resolve) => {
        const childProcess = metadata.process!;

        const timeout = setTimeout(() => {
          // Force kill if graceful shutdown fails
          childProcess.kill('SIGKILL');
          resolve();
        }, 5000);

        childProcess.once('exit', () => {
          clearTimeout(timeout);
          metadata.state = ServerState.STOPPED;
          metadata.process = undefined;
          resolve();
        });

        // Try graceful shutdown first
        childProcess.kill('SIGTERM');
      });
    }

    metadata.state = ServerState.STOPPED;
  }

  /**
   * Shutdown all servers
   */
  public async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.servers.keys()).map((name) =>
      this.shutdownServer(name).catch((error) => {
        console.error(`[MCPServerManager] Error shutting down "${name}":`, error);
      })
    );

    await Promise.all(shutdownPromises);
    this.servers.clear();
  }

  /**
   * Get server state
   */
  public getServerState(name: string): ServerState {
    const metadata = this.servers.get(name);
    return metadata?.state ?? ServerState.STOPPED;
  }

  /**
   * Get server process
   */
  public getProcess(name: string): ChildProcess | undefined {
    return this.servers.get(name)?.process;
  }

  /**
   * Get restart attempts count
   */
  public getRestartAttempts(name: string): number {
    return this.servers.get(name)?.restartAttempts ?? 0;
  }

  /**
   * Get current backoff delay for a server
   */
  public getBackoffDelay(name: string): number {
    const metadata = this.servers.get(name);
    if (!metadata) return 0;
    return this.calculateBackoff(metadata);
  }

  /**
   * Get health status for all servers
   */
  public getHealthStatus(): Record<string, ServerHealth> {
    const health: Record<string, ServerHealth> = {};

    for (const [name, metadata] of this.servers.entries()) {
      const uptime = metadata.startTime ? Date.now() - metadata.startTime : 0;

      health[name] = {
        name,
        state: metadata.state,
        uptime,
        restartCount: metadata.restartAttempts,
        pid: metadata.process?.pid,
      };
    }

    return health;
  }
}
