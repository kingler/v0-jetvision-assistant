/**
 * Base MCP Server
 *
 * Abstract base class for MCP (Model Context Protocol) servers.
 * Provides core functionality for tool registration, execution, and lifecycle management.
 */

import Ajv from 'ajv';
import {
  MCPServerConfig,
  MCPToolDefinition,
  ServerState,
  ToolExecutionOptions,
  ToolExecutionResult,
  Transport,
  ShutdownHook,
} from './types';
import { ToolRegistry } from './tool-registry';
import { Logger, LogLevel } from './logger';
import { StdioTransport } from './transports/stdio';
import {
  ToolNotFoundError,
  ValidationError,
  TimeoutError,
  ToolExecutionError,
  ServerStateError,
  ToolAlreadyRegisteredError,
} from './errors';

/**
 * Abstract Base MCP Server
 * Extend this class to create custom MCP servers
 */
export abstract class BaseMCPServer {
  protected config: MCPServerConfig;
  protected registry: ToolRegistry;
  protected logger: Logger;
  protected transport?: Transport;
  protected state: ServerState;
  protected ajv: Ajv;
  protected shutdownHooks: ShutdownHook[] = [];
  protected startTime?: number;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.registry = new ToolRegistry();
    this.logger = new Logger({
      level: LogLevel.INFO,
      prefix: `[${config.name}]`,
    });
    this.state = 'idle';
    this.ajv = new Ajv({ strict: false });
  }

  /**
   * Register a tool with the server
   */
  registerTool(tool: MCPToolDefinition): void {
    // Validate tool definition
    if (!tool || !tool.name || !tool.description || !tool.inputSchema || !tool.execute) {
      throw new ValidationError('Invalid tool definition');
    }

    // Check for duplicate
    if (this.registry.has(tool.name)) {
      throw new ToolAlreadyRegisteredError(tool.name);
    }

    // Validate schema
    try {
      this.ajv.compile(tool.inputSchema);
    } catch (error) {
      throw new ValidationError(`Invalid JSON schema for tool ${tool.name}`);
    }

    // Register the tool
    this.registry.register(tool.name, tool);
    this.logger.info(`Tool registered: ${tool.name}`);
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    params: any,
    options: ToolExecutionOptions = {}
  ): Promise<any> {
    // Check server state
    if (this.state !== 'running') {
      throw new ServerStateError(this.state, 'running');
    }

    // Get tool
    const tool = this.registry.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }

    // Validate parameters
    const validate = this.ajv.compile(tool.inputSchema);
    if (!validate(params)) {
      throw new ValidationError(
        'Validation failed',
        validate.errors?.map((e) => ({
          path: e.instancePath,
          message: e.message,
        }))
      );
    }

    // Execute with timeout and retry
    const timeout = options.timeout || this.config.timeout || 30000;
    const retry = options.retry || false;
    const maxRetries = options.maxRetries || this.config.retryConfig?.maxRetries || 3;

    let lastError: Error | undefined;
    let attempts = 0;

    while (attempts < (retry ? maxRetries : 1)) {
      attempts++;

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(tool.execute(params), timeout);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.error(`Tool execution failed (attempt ${attempts}/${maxRetries})`, {
          toolName: name,
          params,
          error: lastError.message,
        });

        // If retry is enabled and we haven't reached max retries, continue
        if (retry && attempts < maxRetries) {
          const retryDelay = options.retryDelay || this.config.retryConfig?.retryDelay || 1000;
          await this.delay(retryDelay);
          continue;
        }

        // Otherwise, throw the error
        break;
      }
    }

    // If we get here, all attempts failed
    if (lastError) {
      if (lastError instanceof TimeoutError) {
        throw lastError;
      }
      throw new ToolExecutionError(name, lastError);
    }

    throw new ToolExecutionError(name, new Error('Unknown error'));
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(timeout));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Delay for a specified duration
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.state === 'running') {
      throw new ServerStateError(this.state, 'idle');
    }

    // Initialize transport
    if (this.config.transport === 'stdio') {
      this.transport = new StdioTransport();
      await this.transport.start();
    }

    this.state = 'running';
    this.startTime = Date.now();
    this.logger.info('Server started');
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.state === 'stopped') {
      return;
    }

    // Execute shutdown hooks
    for (const hook of this.shutdownHooks) {
      try {
        await hook();
      } catch (error) {
        this.logger.error('Shutdown hook failed', { error });
      }
    }

    // Close transport
    if (this.transport) {
      await this.transport.close();
      this.transport = undefined;
    }

    this.state = 'stopped';
    this.logger.info('Server stopped');
  }

  /**
   * Register a shutdown hook
   */
  onShutdown(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
  }

  /**
   * Get list of registered tools
   */
  getTools(): string[] {
    return this.registry.list();
  }

  /**
   * Get current server state
   */
  getState(): ServerState {
    return this.state;
  }

  /**
   * Get server configuration
   */
  getConfig(): MCPServerConfig {
    return { ...this.config };
  }
}
