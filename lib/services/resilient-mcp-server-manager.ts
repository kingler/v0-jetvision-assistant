/**
 * Resilient MCP Server Manager
 *
 * Extends the base MCP Server Manager with circuit breaker protection
 * for improved fault tolerance when communicating with MCP servers.
 *
 * @module lib/services/resilient-mcp-server-manager
 * @see lib/services/mcp-server-manager.ts
 * @see lib/resilience/circuit-breaker.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  MCPServerManager,
  ServerState,
  ServerConfig,
  ServerHealth,
} from './mcp-server-manager';
import {
  CircuitBreaker,
  CircuitBreakerMetrics,
  CircuitState,
  CircuitBreakerEvent,
  createCircuitBreaker,
  getCircuitBreakerRegistry,
  CircuitBreakerOpenError,
} from '@/lib/resilience';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Extended server health including circuit breaker metrics
 */
export interface ExtendedServerHealth extends ServerHealth {
  /** Circuit breaker state */
  circuitState: CircuitState;
  /** Circuit breaker metrics */
  circuitMetrics: CircuitBreakerMetrics;
  /** Whether requests are being allowed */
  isAcceptingRequests: boolean;
}

/**
 * MCP tool execution options
 */
export interface ToolExecutionOptions {
  /** Skip circuit breaker for this call */
  bypassCircuitBreaker?: boolean;
  /** Timeout in ms (overrides circuit breaker timeout) */
  timeout?: number;
  /** Number of retries on transient failures */
  retries?: number;
}

/**
 * Tool execution result with metadata
 */
export interface ToolExecutionResult<T = unknown> {
  /** Success status */
  success: boolean;
  /** Tool result data */
  data?: T;
  /** Error if failed */
  error?: Error;
  /** Execution time in ms */
  executionTime: number;
  /** Number of retry attempts made */
  retryAttempts: number;
  /** Whether circuit breaker was bypassed */
  circuitBreakerBypassed: boolean;
}

// =============================================================================
// RESILIENT MCP SERVER MANAGER
// =============================================================================

/**
 * Resilient MCP Server Manager
 *
 * Provides circuit breaker protection for MCP server communications.
 * Each MCP server gets its own circuit breaker for independent failure handling.
 *
 * @example
 * ```typescript
 * const manager = ResilientMCPServerManager.getInstance();
 *
 * // Spawn a server with circuit breaker protection
 * await manager.spawnServer('avinode-mcp', 'node', ['mcp-servers/avinode/index.js']);
 *
 * // Execute tools with automatic circuit breaker protection
 * const result = await manager.executeToolWithProtection(
 *   'avinode-mcp',
 *   'create_trip',
 *   { departure: 'KJFK', arrival: 'KLAX' }
 * );
 *
 * // Check server health including circuit breaker status
 * const health = manager.getExtendedHealthStatus();
 * ```
 */
export class ResilientMCPServerManager {
  private static instance: ResilientMCPServerManager | null = null;
  private baseManager: MCPServerManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.baseManager = MCPServerManager.getInstance();
    console.log('[ResilientMCPServerManager] Initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ResilientMCPServerManager {
    if (!ResilientMCPServerManager.instance) {
      ResilientMCPServerManager.instance = new ResilientMCPServerManager();
    }
    return ResilientMCPServerManager.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (ResilientMCPServerManager.instance) {
      // Clean up circuit breakers
      for (const cb of ResilientMCPServerManager.instance.circuitBreakers.values()) {
        cb.destroy();
      }
      ResilientMCPServerManager.instance.circuitBreakers.clear();
      ResilientMCPServerManager.instance = null;
    }
  }

  // ===========================================================================
  // SERVER LIFECYCLE
  // ===========================================================================

  /**
   * Spawn a new MCP server with circuit breaker protection
   *
   * @param name - Unique server name
   * @param command - Command to spawn the server
   * @param args - Command arguments
   * @param config - Server configuration
   */
  public async spawnServer(
    name: string,
    command: string,
    args: string[],
    config?: ServerConfig
  ): Promise<void> {
    // Create circuit breaker for this server
    const circuitBreaker = this.getOrCreateCircuitBreaker(name);

    // Spawn the server through base manager
    await this.baseManager.spawnServer(name, command, args, config);

    console.log(`[ResilientMCPServerManager] Server spawned with circuit breaker: ${name}`);
  }

  /**
   * Shutdown a specific server
   *
   * @param name - Server name
   */
  public async shutdownServer(name: string): Promise<void> {
    // Shutdown through base manager
    await this.baseManager.shutdownServer(name);

    // Clean up circuit breaker
    const cb = this.circuitBreakers.get(name);
    if (cb) {
      cb.destroy();
      this.circuitBreakers.delete(name);
    }

    console.log(`[ResilientMCPServerManager] Server shutdown: ${name}`);
  }

  /**
   * Shutdown all servers
   */
  public async shutdownAll(): Promise<void> {
    await this.baseManager.shutdownAll();

    // Clean up all circuit breakers
    for (const cb of this.circuitBreakers.values()) {
      cb.destroy();
    }
    this.circuitBreakers.clear();

    console.log('[ResilientMCPServerManager] All servers shutdown');
  }

  // ===========================================================================
  // CLIENT ACCESS
  // ===========================================================================

  /**
   * Get MCP client for a server with circuit breaker check
   *
   * @param name - Server name
   * @returns MCP client instance
   * @throws Error if circuit is open
   */
  public async getClient(name: string): Promise<Client> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(name);

    // Check if circuit is allowing requests
    if (!circuitBreaker.isAllowingRequests()) {
      const metrics = circuitBreaker.getMetrics();
      throw new CircuitBreakerOpenError(
        `MCP server "${name}" circuit breaker is OPEN`,
        name,
        metrics
      );
    }

    return this.baseManager.getClient(name);
  }

  /**
   * Get MCP client bypassing circuit breaker check
   *
   * @param name - Server name
   * @returns MCP client instance
   */
  public async getClientDirect(name: string): Promise<Client> {
    return this.baseManager.getClient(name);
  }

  // ===========================================================================
  // TOOL EXECUTION
  // ===========================================================================

  /**
   * Execute an MCP tool with circuit breaker protection
   *
   * @param serverName - Name of the MCP server
   * @param toolName - Name of the tool to execute
   * @param args - Tool arguments
   * @param options - Execution options
   * @returns Tool execution result
   */
  public async executeToolWithProtection<T = unknown>(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult<T>> {
    const startTime = Date.now();
    let retryAttempts = 0;

    const circuitBreaker = this.getOrCreateCircuitBreaker(serverName);

    // Check if bypassing circuit breaker
    if (options?.bypassCircuitBreaker) {
      return this.executeToolDirect<T>(serverName, toolName, args, startTime);
    }

    // Execute with circuit breaker protection
    try {
      const result = await circuitBreaker.execute(async () => {
        return this.executeToolDirect<T>(serverName, toolName, args, startTime);
      });

      return result;
    } catch (error) {
      // Handle circuit breaker open error
      if (error instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error,
          executionTime: Date.now() - startTime,
          retryAttempts,
          circuitBreakerBypassed: false,
        };
      }

      // Handle other errors - attempt retries if configured
      const maxRetries = options?.retries ?? 0;

      while (retryAttempts < maxRetries) {
        retryAttempts++;
        console.log(
          `[ResilientMCPServerManager] Retrying ${toolName} (attempt ${retryAttempts}/${maxRetries})`
        );

        try {
          // Wait before retry with exponential backoff
          await this.delay(Math.pow(2, retryAttempts - 1) * 1000);

          const result = await circuitBreaker.execute(async () => {
            return this.executeToolDirect<T>(serverName, toolName, args, startTime);
          });

          return {
            ...result,
            retryAttempts,
          };
        } catch (retryError) {
          if (retryError instanceof CircuitBreakerOpenError) {
            // Circuit opened during retries
            return {
              success: false,
              error: retryError,
              executionTime: Date.now() - startTime,
              retryAttempts,
              circuitBreakerBypassed: false,
            };
          }

          if (retryAttempts === maxRetries) {
            return {
              success: false,
              error: retryError instanceof Error ? retryError : new Error(String(retryError)),
              executionTime: Date.now() - startTime,
              retryAttempts,
              circuitBreakerBypassed: false,
            };
          }
        }
      }

      // No retries or all retries exhausted
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime: Date.now() - startTime,
        retryAttempts,
        circuitBreakerBypassed: false,
      };
    }
  }

  /**
   * Execute tool directly without circuit breaker
   */
  private async executeToolDirect<T>(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
    startTime: number
  ): Promise<ToolExecutionResult<T>> {
    try {
      const client = await this.baseManager.getClient(serverName);

      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      // Extract text content from result
      let data: T | undefined;
      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('');

        try {
          data = JSON.parse(textContent) as T;
        } catch {
          data = textContent as unknown as T;
        }
      }

      return {
        success: true,
        data,
        executionTime: Date.now() - startTime,
        retryAttempts: 0,
        circuitBreakerBypassed: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime: Date.now() - startTime,
        retryAttempts: 0,
        circuitBreakerBypassed: true,
      };
    }
  }

  // ===========================================================================
  // HEALTH MONITORING
  // ===========================================================================

  /**
   * Get extended health status including circuit breaker metrics
   *
   * @returns Extended health status for all servers
   */
  public getExtendedHealthStatus(): Record<string, ExtendedServerHealth> {
    const baseHealth = this.baseManager.getHealthStatus();
    const extendedHealth: Record<string, ExtendedServerHealth> = {};

    for (const [name, health] of Object.entries(baseHealth)) {
      const circuitBreaker = this.circuitBreakers.get(name);
      const circuitMetrics = circuitBreaker?.getMetrics() ?? {
        name,
        state: CircuitState.CLOSED,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rejectedRequests: 0,
        currentFailureCount: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        successRate: 100,
      };

      extendedHealth[name] = {
        ...health,
        circuitState: circuitMetrics.state,
        circuitMetrics,
        isAcceptingRequests: circuitBreaker?.isAllowingRequests() ?? true,
      };
    }

    return extendedHealth;
  }

  /**
   * Get circuit breaker metrics for a specific server
   *
   * @param name - Server name
   * @returns Circuit breaker metrics or undefined
   */
  public getCircuitBreakerMetrics(name: string): CircuitBreakerMetrics | undefined {
    return this.circuitBreakers.get(name)?.getMetrics();
  }

  /**
   * Get circuit breaker state for a specific server
   *
   * @param name - Server name
   * @returns Circuit state or CLOSED if not found
   */
  public getCircuitBreakerState(name: string): CircuitState {
    return this.circuitBreakers.get(name)?.getState() ?? CircuitState.CLOSED;
  }

  /**
   * Check if a server is accepting requests
   *
   * @param name - Server name
   * @returns True if accepting requests
   */
  public isServerAcceptingRequests(name: string): boolean {
    const serverState = this.baseManager.getServerState(name);
    const circuitState = this.getCircuitBreakerState(name);

    return serverState === ServerState.RUNNING && circuitState !== CircuitState.OPEN;
  }

  // ===========================================================================
  // CIRCUIT BREAKER MANAGEMENT
  // ===========================================================================

  /**
   * Reset circuit breaker for a specific server
   *
   * @param name - Server name
   */
  public resetCircuitBreaker(name: string): void {
    const cb = this.circuitBreakers.get(name);
    if (cb) {
      cb.reset();
      console.log(`[ResilientMCPServerManager] Circuit breaker reset: ${name}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  public resetAllCircuitBreakers(): void {
    for (const [name, cb] of this.circuitBreakers) {
      cb.reset();
    }
    console.log('[ResilientMCPServerManager] All circuit breakers reset');
  }

  /**
   * Force open circuit breaker for a server (for testing/emergency)
   *
   * @param name - Server name
   */
  public forceCircuitOpen(name: string): void {
    const cb = this.circuitBreakers.get(name);
    if (cb) {
      cb.forceOpen();
      console.log(`[ResilientMCPServerManager] Circuit breaker forced open: ${name}`);
    }
  }

  /**
   * Subscribe to circuit breaker events for a server
   *
   * @param name - Server name
   * @param event - Event type
   * @param listener - Event handler
   * @returns Unsubscribe function
   */
  public onCircuitBreakerEvent(
    name: string,
    event: CircuitBreakerEvent | '*',
    listener: (...args: any[]) => void
  ): () => void {
    const cb = this.getOrCreateCircuitBreaker(name);
    cb.on(event, listener);
    return () => cb.off(event, listener);
  }

  // ===========================================================================
  // DELEGATED METHODS FROM BASE MANAGER
  // ===========================================================================

  /**
   * Get server state
   */
  public getServerState(name: string): ServerState {
    return this.baseManager.getServerState(name);
  }

  /**
   * Get server process
   */
  public getProcess(name: string): ReturnType<MCPServerManager['getProcess']> {
    return this.baseManager.getProcess(name);
  }

  /**
   * Get restart attempts count
   */
  public getRestartAttempts(name: string): number {
    return this.baseManager.getRestartAttempts(name);
  }

  /**
   * Get backoff delay
   */
  public getBackoffDelay(name: string): number {
    return this.baseManager.getBackoffDelay(name);
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Get or create circuit breaker for a server
   */
  private getOrCreateCircuitBreaker(name: string): CircuitBreaker {
    let cb = this.circuitBreakers.get(name);

    if (!cb) {
      cb = createCircuitBreaker(`mcp-server-${name}`, {
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 30000,
        monitoringWindow: 60000,
        requestTimeout: 60000, // MCP calls can be slow
      });

      // Setup event listeners
      this.setupCircuitBreakerListeners(name, cb);

      this.circuitBreakers.set(name, cb);

      // Register with global registry
      try {
        getCircuitBreakerRegistry().register(cb);
      } catch (e) {
        // Registry might already have this one, that's ok
      }
    }

    return cb;
  }

  /**
   * Setup circuit breaker event listeners
   */
  private setupCircuitBreakerListeners(name: string, cb: CircuitBreaker): void {
    cb.on(CircuitBreakerEvent.CIRCUIT_OPENED, (payload) => {
      console.error(`[ResilientMCPServerManager] Circuit breaker OPENED for ${name}`, {
        error: payload.error?.message,
        metrics: payload.metrics,
      });
    });

    cb.on(CircuitBreakerEvent.CIRCUIT_CLOSED, (payload) => {
      console.log(`[ResilientMCPServerManager] Circuit breaker CLOSED for ${name} (recovered)`);
    });

    cb.on(CircuitBreakerEvent.CIRCUIT_HALF_OPENED, (payload) => {
      console.log(`[ResilientMCPServerManager] Circuit breaker HALF_OPENED for ${name}`);
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get the resilient MCP server manager instance
 */
export function getResilientMCPServerManager(): ResilientMCPServerManager {
  return ResilientMCPServerManager.getInstance();
}
