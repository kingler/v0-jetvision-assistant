/**
 * Stdio Transport
 *
 * Implements the MCP transport interface using standard input/output (stdio).
 * This is the primary transport mechanism for Claude Code integration.
 *
 * Communication Protocol:
 * - Input: JSON messages via stdin (one per line)
 * - Output: JSON messages via stdout (one per line)
 * - Errors: Logged to stderr
 */

import * as readline from 'readline';
import { Transport, MCPMessage } from '../types';
import { TransportError } from '../errors';

/**
 * Stdio Transport Implementation
 */
export class StdioTransport implements Transport {
  private isRunning: boolean = false;
  private readlineInterface?: readline.Interface;

  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the stdio transport
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new TransportError('Transport already started', 'stdio');
    }

    // Create readline interface for stdin
    // Note: Omit output option to prevent readline from writing prompts/echoes
    // that would corrupt MCP JSON messages on stdout
    this.readlineInterface = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });

    this.isRunning = true;
  }

  /**
   * Send a message to stdout
   */
  async send(message: MCPMessage): Promise<void> {
    if (!this.isRunning) {
      throw new TransportError('Transport not started', 'stdio');
    }

    const jsonMessage = JSON.stringify(message);
    process.stdout.write(jsonMessage + '\n');
  }

  /**
   * Receive messages from stdin
   * Returns an async iterator of messages
   */
  async *receive(): AsyncIterator<MCPMessage> {
    if (!this.isRunning || !this.readlineInterface) {
      throw new TransportError('Transport not started', 'stdio');
    }

    // Listen for lines from stdin
    for await (const line of this.readlineInterface) {
      try {
        const message: MCPMessage = JSON.parse(line);
        yield message;
      } catch (error) {
        console.error('Failed to parse message:', error);
        // Continue processing other messages
      }
    }
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.readlineInterface) {
      this.readlineInterface.close();
      this.readlineInterface = undefined;
    }

    this.isRunning = false;
  }

  /**
   * Check if transport is active
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
