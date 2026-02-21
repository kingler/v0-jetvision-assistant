/**
 * Supabase MCP Server - Shared Server Module
 *
 * Exports a factory function to create independent Server instances,
 * tool definitions, and helper initialization.
 *
 * Used by both stdio (index.ts) and HTTP (http-entry.ts) entry points.
 *
 * @module mcp-servers/supabase-mcp-server/server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import type { QueryOptions } from '../../../lib/supabase/mcp-helpers';

// Dynamic import reference for mcp-helpers (loaded after env vars are set)
let mcpHelpers: typeof import('../../../lib/supabase/mcp-helpers');

/**
 * Load mcp-helpers module. Must be called once before creating server instances.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function loadHelpers(): Promise<void> {
  if (!mcpHelpers) {
    mcpHelpers = await import('../../../lib/supabase/mcp-helpers');
  }
}

// ============================================================================
// MCP TOOL DEFINITIONS
// ============================================================================

export const TOOLS: Tool[] = [
  {
    name: 'supabase_query',
    description:
      'Execute a SELECT query on a Supabase table with optional filters, ordering, and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'The name of the table to query',
        },
        select: {
          type: 'string',
          description: 'Columns to select (default: "*")',
        },
        filters: {
          type: 'object',
          description:
            'Filters to apply (e.g., {"status": "active", "created_by": "user-123"})',
        },
        orderBy: {
          type: 'object',
          properties: {
            column: { type: 'string' },
            ascending: { type: 'boolean' },
          },
          description: 'Column to order by and direction',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of rows to return',
        },
        offset: {
          type: 'number',
          description: 'Number of rows to skip',
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'supabase_insert',
    description: 'Insert one or more records into a Supabase table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'The name of the table to insert into',
        },
        data: {
          type: ['object', 'array'],
          description: 'Single record or array of records to insert',
        },
      },
      required: ['table', 'data'],
    },
  },
  {
    name: 'supabase_update',
    description: 'Update records in a Supabase table based on filters',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'The name of the table to update',
        },
        filters: {
          type: 'object',
          description: 'Filters to match records (e.g., {"id": "123"})',
        },
        data: {
          type: 'object',
          description: 'Data to update',
        },
      },
      required: ['table', 'filters', 'data'],
    },
  },
  {
    name: 'supabase_delete',
    description: 'Delete records from a Supabase table based on filters',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'The name of the table to delete from',
        },
        filters: {
          type: 'object',
          description:
            'Filters to match records to delete (e.g., {"id": "123"})',
        },
      },
      required: ['table', 'filters'],
    },
  },
  {
    name: 'supabase_rpc',
    description: 'Call a Supabase stored procedure or function',
    inputSchema: {
      type: 'object',
      properties: {
        functionName: {
          type: 'string',
          description: 'The name of the stored procedure/function to call',
        },
        params: {
          type: 'object',
          description: 'Parameters to pass to the function',
        },
      },
      required: ['functionName'],
    },
  },
  {
    name: 'supabase_list_tables',
    description: 'List all accessible tables in the Supabase database',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'supabase_describe_table',
    description: 'Get the schema information for a specific table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'The name of the table to describe',
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'supabase_count',
    description: 'Count records in a table with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'The name of the table to count',
        },
        filters: {
          type: 'object',
          description: 'Optional filters to apply',
        },
      },
      required: ['table'],
    },
  },
];

// ============================================================================
// SERVER FACTORY
// ============================================================================

/**
 * Create an independent MCP Server instance with all tools and handlers registered.
 * Returns a fresh Server per call — required for stateless HTTP mode.
 */
export function createServerInstance(): Server {
  const server = new Server(
    {
      name: 'supabase-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'supabase_query': {
          const { table, select, filters, orderBy, limit, offset } = args as {
            table: string;
            select?: string;
            filters?: Record<string, unknown>;
            orderBy?: { column: string; ascending?: boolean };
            limit?: number;
            offset?: number;
          };

          const options: QueryOptions = {
            select,
            filter: filters,
            orderBy,
            limit,
            offset,
          };

          const result = await mcpHelpers.queryTable(table, options);

          if (result.error) {
            return {
              content: [{ type: 'text', text: `Error: ${result.error}` }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
          };
        }

        case 'supabase_insert': {
          const { table, data } = args as {
            table: string;
            data: Record<string, unknown>;
          };

          const result = await mcpHelpers.insertRow(table, data);

          if (result.error) {
            return {
              content: [{ type: 'text', text: `Error: ${result.error}` }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
          };
        }

        case 'supabase_update': {
          const { table, filters, data } = args as {
            table: string;
            filters: Record<string, unknown>;
            data: Record<string, unknown>;
          };

          const result = await mcpHelpers.updateRow(table, filters, data);

          if (result.error) {
            return {
              content: [{ type: 'text', text: `Error: ${result.error}` }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
          };
        }

        case 'supabase_delete': {
          const { table, filters } = args as {
            table: string;
            filters: Record<string, unknown>;
          };

          const result = await mcpHelpers.deleteRow(table, filters);

          if (result.error) {
            return {
              content: [{ type: 'text', text: `Error: ${result.error}` }],
            };
          }

          return {
            content: [{ type: 'text', text: 'Delete successful' }],
          };
        }

        case 'supabase_rpc': {
          const { functionName, params } = args as {
            functionName: string;
            params?: Record<string, unknown>;
          };

          const result = await mcpHelpers.callRpc(functionName, params);

          if (result.error) {
            return {
              content: [{ type: 'text', text: `Error: ${result.error}` }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
          };
        }

        case 'supabase_list_tables': {
          const tables = mcpHelpers.listTables();
          return {
            content: [{ type: 'text', text: JSON.stringify(tables, null, 2) }],
          };
        }

        case 'supabase_describe_table': {
          const { table } = args as { table: string };

          const result = await mcpHelpers.describeTable(table);

          if (result.error) {
            return {
              content: [{ type: 'text', text: `Error: ${result.error}` }],
            };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
          };
        }

        case 'supabase_count': {
          const { table, filters } = args as {
            table: string;
            filters?: Record<string, unknown>;
          };

          const result = await mcpHelpers.countRows(table, filters);

          if (result.error) {
            return {
              content: [{ type: 'text', text: `Error: ${result.error}` }],
            };
          }

          return {
            content: [{ type: 'text', text: `Count: ${result.count}` }],
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
