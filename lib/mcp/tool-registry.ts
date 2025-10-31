/**
 * Tool Registry
 *
 * Manages registration and retrieval of MCP tools.
 * Uses a Map-based storage for O(1) lookup performance.
 */

import { MCPToolDefinition } from './types';

/**
 * Registry for managing MCP tool definitions
 */
export class ToolRegistry {
  private tools: Map<string, MCPToolDefinition>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a tool in the registry
   * @param name - Unique tool name
   * @param tool - Tool definition
   * @throws Error if tool name already exists
   */
  register(name: string, tool: MCPToolDefinition): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool ${name} is already registered`);
    }

    this.tools.set(name, tool);
  }

  /**
   * Get a tool by name
   * @param name - Tool name to retrieve
   * @returns Tool definition or undefined if not found
   */
  get(name: string): MCPToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   * @param name - Tool name to check
   * @returns True if tool exists, false otherwise
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all registered tool names
   * @returns Array of tool names
   */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get total number of registered tools
   * @returns Number of tools
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Remove a specific tool
   * @param name - Tool name to remove
   * @returns True if tool was removed, false if it didn't exist
   */
  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get all tool definitions
   * @returns Array of all tool definitions
   */
  getAll(): MCPToolDefinition[] {
    return Array.from(this.tools.values());
  }
}
