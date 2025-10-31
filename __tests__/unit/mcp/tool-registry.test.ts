/**
 * ToolRegistry - Unit Tests (TDD Red Phase)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '@/lib/mcp/tool-registry';
import { MCPToolDefinition } from '@/lib/mcp/types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should create empty registry', () => {
    expect(registry.list()).toEqual([]);
  });

  it('should register a tool', () => {
    const tool: MCPToolDefinition = {
      name: 'test_tool',
      description: 'Test',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({}),
    };

    registry.register('test_tool', tool);
    expect(registry.has('test_tool')).toBe(true);
  });

  it('should retrieve registered tool', () => {
    const tool: MCPToolDefinition = {
      name: 'test_tool',
      description: 'Test',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({}),
    };

    registry.register('test_tool', tool);
    const retrieved = registry.get('test_tool');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('test_tool');
  });

  it('should list all registered tool names', () => {
    const tool1: MCPToolDefinition = {
      name: 'tool1',
      description: 'Tool 1',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({}),
    };

    const tool2: MCPToolDefinition = {
      name: 'tool2',
      description: 'Tool 2',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({}),
    };

    registry.register('tool1', tool1);
    registry.register('tool2', tool2);

    expect(registry.list()).toEqual(['tool1', 'tool2']);
  });

  it('should return undefined for non-existent tool', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should check if tool exists', () => {
    const tool: MCPToolDefinition = {
      name: 'test_tool',
      description: 'Test',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({}),
    };

    expect(registry.has('test_tool')).toBe(false);
    registry.register('test_tool', tool);
    expect(registry.has('test_tool')).toBe(true);
  });

  it('should clear all tools', () => {
    const tool: MCPToolDefinition = {
      name: 'test_tool',
      description: 'Test',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({}),
    };

    registry.register('test_tool', tool);
    expect(registry.list()).toHaveLength(1);

    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });
});
