/**
 * BaseAgent MCP Integration Tests
 * 
 * Tests for MCP server integration in BaseAgent
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaseAgent } from '@/agents/core/base-agent';
import { AgentType, AgentStatus, type AgentConfig, type AgentContext } from '@/agents/core/types';
import { MCPServerManager } from '@/lib/services/mcp-server-manager';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Mock MCPServerManager
vi.mock('@/lib/services/mcp-server-manager', () => ({
  MCPServerManager: {
    getInstance: vi.fn(() => ({
      spawnServer: vi.fn().mockResolvedValue(undefined),
      getClient: vi.fn().mockResolvedValue({
        listTools: vi.fn().mockResolvedValue({
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              inputSchema: {
                type: 'object',
                properties: {
                  param1: { type: 'string' },
                },
                required: ['param1'],
              },
            },
          ],
        }),
        callTool: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ result: 'success' }),
            },
          ],
        }),
      }),
      getServerState: vi.fn().mockReturnValue('running'),
    })),
  },
}));

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Test response',
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

// Mock LLM config
vi.mock('@/lib/config/llm-config', () => ({
  getOpenAIClient: vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { role: 'assistant', content: 'Test' } }],
        }),
      },
    },
  }),
}));

// Create a concrete implementation of BaseAgent for testing
class TestAgent extends BaseAgent {
  async execute(context: AgentContext) {
    return {
      success: true,
      data: { message: 'Test execution' },
      metadata: { executionTime: 100 },
    };
  }
}

describe('BaseAgent MCP Integration', () => {
  let agent: TestAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      type: AgentType.ORCHESTRATOR,
      name: 'Test Agent',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
    };

    agent = new TestAgent(mockConfig);
  });

  afterEach(async () => {
    if (agent) {
      await agent.shutdown();
    }
  });

  describe('MCP Server Connection', () => {
    it('should connect to MCP server', async () => {
      await agent.initialize();
      
      await agent['connectMCPServer'](
        'test-server',
        'node',
        ['test-server.js'],
        { spawnTimeout: 5000 }
      );

      const mcpManager = MCPServerManager.getInstance();
      expect(mcpManager.spawnServer).toHaveBeenCalledWith(
        'test-server',
        'node',
        ['test-server.js'],
        { spawnTimeout: 5000 }
      );
    });

    it('should reuse existing MCP server connection', async () => {
      await agent.initialize();
      
      // First connection
      await agent['connectMCPServer']('test-server', 'node', ['test-server.js']);
      
      // Second connection (should reuse)
      await agent['connectMCPServer']('test-server', 'node', ['test-server.js']);

      const mcpManager = MCPServerManager.getInstance();
      // Should only spawn once
      expect(mcpManager.spawnServer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tool Definitions', () => {
    it('should include agent tools in tool definitions', async () => {
      await agent.initialize();

      // Register an agent tool
      agent.registerTool({
        name: 'agent_tool',
        description: 'An agent tool',
        parameters: {
          type: 'object',
          properties: {
            param: { type: 'string' },
          },
        },
        handler: async () => ({ result: 'success' }),
      });

      const tools = await agent['getToolDefinitions']();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].function.name).toBe('agent_tool');
    });

    it('should include MCP tools in tool definitions', async () => {
      await agent.initialize();
      
      // Connect to MCP server
      await agent['connectMCPServer']('test-server', 'node', ['test-server.js']);
      
      const tools = await agent['getToolDefinitions']();
      
      // Should include MCP tool
      const mcpTool = tools.find(t => t.function.name === 'test_tool');
      expect(mcpTool).toBeDefined();
      expect(mcpTool?.function.description).toBe('A test tool');
    });

    it('should combine agent tools and MCP tools', async () => {
      await agent.initialize();

      // Register agent tool
      agent.registerTool({
        name: 'agent_tool',
        description: 'Agent tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({}),
      });

      // Connect to MCP server
      await agent['connectMCPServer']('test-server', 'node', ['test-server.js']);
      
      const tools = await agent['getToolDefinitions']();
      
      expect(tools.length).toBeGreaterThanOrEqual(2);
      expect(tools.some(t => t.function.name === 'agent_tool')).toBe(true);
      expect(tools.some(t => t.function.name === 'test_tool')).toBe(true);
    });
  });

  describe('MCP Tool Execution', () => {
    it('should call MCP tool successfully', async () => {
      await agent.initialize();
      
      await agent['connectMCPServer']('test-server', 'node', ['test-server.js']);
      
      const result = await agent['callMCPTool']('test-server', 'test_tool', {
        param1: 'value1',
      });

      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error if MCP server not connected', async () => {
      await agent.initialize();
      
      await expect(
        agent['callMCPTool']('non-existent-server', 'test_tool', {})
      ).rejects.toThrow('Not connected to MCP server');
    });

    it('should increment tool calls count', async () => {
      await agent.initialize();
      
      await agent['connectMCPServer']('test-server', 'node', ['test-server.js']);
      
      const initialCount = agent.getMetrics().toolCallsCount;
      
      await agent['callMCPTool']('test-server', 'test_tool', { param1: 'value' });
      
      expect(agent.getMetrics().toolCallsCount).toBe(initialCount + 1);
    });
  });

  describe('LLM Function Calling with MCP Tools', () => {
    it('should expose MCP tools to LLM', async () => {
      await agent.initialize();
      
      await agent['connectMCPServer']('test-server', 'node', ['test-server.js']);
      
      // Mock OpenAI to capture tool definitions
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Response',
            },
          },
        ],
      });

      agent['openai'].chat.completions.create = mockCreate;

      await agent['createResponse']('Test input');

      // Verify tools were included in API call
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(Array.isArray(callArgs.tools)).toBe(true);
      expect(callArgs.tools.length).toBeGreaterThan(0);
    });

    it('should handle LLM tool calls for MCP tools', async () => {
      await agent.initialize();
      
      await agent['connectMCPServer']('test-server', 'node', ['test-server.js']);
      
      // Mock LLM response with tool call
      const mockCreate = vi.fn()
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'function',
                    function: {
                      name: 'test_tool',
                      arguments: JSON.stringify({ param1: 'value' }),
                    },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Final response with tool results',
              },
            },
          ],
        });

      agent['openai'].chat.completions.create = mockCreate;

      const response = await agent['createResponse']('Use test_tool');

      // Should make two calls: one with tool call, one with results
      expect(mockCreate).toHaveBeenCalledTimes(2);
      
      // Second call should include tool results
      const secondCall = mockCreate.mock.calls[1][0];
      expect(secondCall.messages.some((m: any) => m.role === 'tool')).toBe(true);
    });
  });
});

