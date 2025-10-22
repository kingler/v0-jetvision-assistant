# MCP Server Examples

This directory contains example implementations demonstrating how to use the JetVision MCP (Model Context Protocol) infrastructure.

## Available Examples

### 1. Simple Calculator Server (`simple-mcp-server.ts`)

A basic MCP server implementing calculator operations (add, subtract, multiply, divide).

**Features Demonstrated:**
- Extending `BaseMCPServer`
- Registering multiple tools
- Defining tool schemas
- Error handling (division by zero)
- Lifecycle management (start/stop)
- Shutdown hooks

**Run the example:**
```bash
# Using ts-node
npx ts-node examples/simple-mcp-server.ts

# Using Node.js (after building)
npm run build
node dist/examples/simple-mcp-server.js
```

**Expected Output:**
```
Calculator MCP Server started
Available tools: [ 'add', 'subtract', 'multiply', 'divide' ]
5 + 3 = 8
```

## Creating Your Own MCP Server

Follow this pattern to create a custom MCP server:

### 1. Define Your Server Class

```typescript
import { BaseMCPServer, MCPToolDefinition, MCPServerConfig } from '../lib/mcp';

class MyCustomServer extends BaseMCPServer {
  constructor() {
    const config: MCPServerConfig = {
      name: 'my-server',
      version: '1.0.0',
      transport: 'stdio',
      timeout: 5000,
    };

    super(config);
    this.registerTools();
  }

  private registerTools(): void {
    // Register your tools here
  }
}
```

### 2. Define Your Tools

```typescript
const myTool: MCPToolDefinition = {
  name: 'my_tool',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'First parameter' },
      param2: { type: 'number', description: 'Second parameter' },
    },
    required: ['param1'],
  },
  execute: async (params) => {
    // Tool implementation
    return { result: 'success' };
  },
};

this.registerTool(myTool);
```

### 3. Start the Server

```typescript
async function main() {
  const server = new MyCustomServer();

  // Optional: Add shutdown hook
  server.onShutdown(async () => {
    console.log('Cleanup complete!');
  });

  // Start the server
  await server.start();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Key Concepts

### Tool Schema Validation

All tool parameters are validated against the provided JSON schema using [Ajv](https://ajv.js.org/).

```typescript
inputSchema: {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'number', minimum: 0 },
  },
  required: ['name'],
}
```

### Error Handling

The framework provides several error types:

- `ToolNotFoundError` - Tool doesn't exist
- `ValidationError` - Parameters don't match schema
- `TimeoutError` - Tool execution exceeded timeout
- `ToolExecutionError` - Tool threw an error
- `ServerStateError` - Invalid server state for operation

```typescript
try {
  await server.executeTool('my_tool', params);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.data);
  }
}
```

### Timeout and Retry

Configure timeout and retry behavior:

```typescript
// Server-wide configuration
const config: MCPServerConfig = {
  name: 'my-server',
  version: '1.0.0',
  transport: 'stdio',
  timeout: 10000, // 10 seconds
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },
};

// Per-execution configuration
await server.executeTool('my_tool', params, {
  timeout: 5000,
  retry: true,
  maxRetries: 2,
  retryDelay: 500,
});
```

### Lifecycle Management

```typescript
// Start server
await server.start();
console.log('State:', server.getState()); // 'running'

// Execute tools
await server.executeTool('my_tool', params);

// Stop server
await server.stop();
console.log('State:', server.getState()); // 'stopped'
```

## Transport Types

### Stdio Transport

Default transport for Claude Code integration. Communicates via stdin/stdout.

```typescript
const config: MCPServerConfig = {
  name: 'my-server',
  version: '1.0.0',
  transport: 'stdio',
};
```

### HTTP Transport (Future)

SSE-based HTTP transport for web-based integrations.

```typescript
const config: MCPServerConfig = {
  name: 'my-server',
  version: '1.0.0',
  transport: 'http',
  httpConfig: {
    port: 3000,
    host: 'localhost',
  },
};
```

## Best Practices

1. **Validate Input** - Always define comprehensive JSON schemas
2. **Handle Errors** - Provide meaningful error messages
3. **Use Timeouts** - Set appropriate timeouts for long-running operations
4. **Implement Cleanup** - Use shutdown hooks for resource cleanup
5. **Log Appropriately** - Use the built-in logger for debugging
6. **Test Thoroughly** - Write unit tests for your tools

## Testing Your Server

Use the provided test utilities:

```typescript
import { BaseMCPServer } from '@/lib/mcp';
import { mockMCPToolDefinition } from '@tests/utils';

describe('MyCustomServer', () => {
  let server: MyCustomServer;

  beforeEach(() => {
    server = new MyCustomServer();
  });

  afterEach(async () => {
    if (server.getState() === 'running') {
      await server.stop();
    }
  });

  it('should execute tool successfully', async () => {
    await server.start();
    const result = await server.executeTool('my_tool', { param: 'value' });
    expect(result).toBeDefined();
  });
});
```

## Resources

- **MCP Specification**: `lib/mcp/README.md`
- **Type Definitions**: `lib/mcp/types.ts`
- **Test Utilities**: `__tests__/utils/`
- **Testing Guidelines**: `docs/TESTING_GUIDELINES.md`

## Next Steps

1. Review the simple calculator example
2. Create your own server following the pattern
3. Test your server using the test utilities
4. Deploy your server using the MCP infrastructure

For more complex examples, see the actual MCP servers in `mcp-servers/`.
