/**
 * Simple MCP Server Example
 *
 * Demonstrates how to create a basic MCP server using the base infrastructure.
 * This example implements a calculator server with basic arithmetic operations.
 */

import { BaseMCPServer, MCPToolDefinition, MCPServerConfig } from '../lib/mcp';

/**
 * Simple Calculator MCP Server
 */
class CalculatorMCPServer extends BaseMCPServer {
  constructor() {
    const config: MCPServerConfig = {
      name: 'calculator-server',
      version: '1.0.0',
      transport: 'stdio',
      timeout: 5000,
    };

    super(config);

    // Register calculator tools
    this.registerCalculatorTools();
  }

  /**
   * Register all calculator tools
   */
  private registerCalculatorTools(): void {
    // Addition tool
    const addTool: MCPToolDefinition = {
      name: 'add',
      description: 'Add two numbers together',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
      execute: async (params: { a: number; b: number }) => {
        return { result: params.a + params.b };
      },
    };

    // Subtraction tool
    const subtractTool: MCPToolDefinition = {
      name: 'subtract',
      description: 'Subtract second number from first number',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
      execute: async (params: { a: number; b: number }) => {
        return { result: params.a - params.b };
      },
    };

    // Multiplication tool
    const multiplyTool: MCPToolDefinition = {
      name: 'multiply',
      description: 'Multiply two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
      execute: async (params: { a: number; b: number }) => {
        return { result: params.a * params.b };
      },
    };

    // Division tool
    const divideTool: MCPToolDefinition = {
      name: 'divide',
      description: 'Divide first number by second number',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'Numerator' },
          b: { type: 'number', description: 'Denominator' },
        },
        required: ['a', 'b'],
      },
      execute: async (params: { a: number; b: number }) => {
        if (params.b === 0) {
          throw new Error('Division by zero is not allowed');
        }
        return { result: params.a / params.b };
      },
    };

    // Register all tools
    this.registerTool(addTool);
    this.registerTool(subtractTool);
    this.registerTool(multiplyTool);
    this.registerTool(divideTool);
  }
}

/**
 * Main execution
 */
async function main() {
  // Create server instance
  const server = new CalculatorMCPServer();

  // Register shutdown hook
  server.onShutdown(async () => {
    console.log('Cleanup complete!');
  });

  // Start the server
  await server.start();

  console.log('Calculator MCP Server started');
  console.log('Available tools:', server.getTools());

  // Example: Execute a tool
  try {
    const result = await server.executeTool('add', { a: 5, b: 3 });
    console.log('5 + 3 =', result.result); // Output: 8
  } catch (error) {
    console.error('Error executing tool:', error);
  }

  // Graceful shutdown on SIGINT
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

// Run the server
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CalculatorMCPServer };
