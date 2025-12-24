#!/usr/bin/env node

/**
 * Supabase MCP Server
 *
 * Provides MCP tools for interacting with Supabase database.
 * Uses shared helpers from lib/supabase/ for consistency.
 *
 * Tools:
 * - supabase_query: Execute SELECT queries with filters
 * - supabase_insert: Insert records into tables
 * - supabase_update: Update records
 * - supabase_delete: Delete records
 * - supabase_rpc: Call stored procedures/functions
 * - supabase_list_tables: List all accessible tables
 * - supabase_describe_table: Get table schema information
 * - supabase_count: Count records with optional filters
 *
 * @module mcp-servers/supabase-mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import shared helpers from lib/supabase/
// Note: Uses relative path for standalone MCP server execution
import {
  queryTable,
  insertRow,
  updateRow,
  deleteRow,
  countRows,
  callRpc,
  listTables,
  describeTable,
  type QueryOptions,
} from '../../../lib/supabase/mcp-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
config({ path: resolve(__dirname, '../../../.env.local') });

// ============================================================================
// MCP TOOL DEFINITIONS
// ============================================================================

const tools: Tool[] = [
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
          description: 'Filters to match records to delete (e.g., {"id": "123"})',
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
// MCP SERVER INITIALIZATION
// ============================================================================

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
  return { tools };
});

// ============================================================================
// TOOL EXECUTION HANDLERS
// ============================================================================

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

        const result = await queryTable(table, options);

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

        const result = await insertRow(table, data);

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

        const result = await updateRow(table, filters, data);

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

        const result = await deleteRow(table, filters);

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

        const result = await callRpc(functionName, params);

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
        const tables = listTables();
        return {
          content: [{ type: 'text', text: JSON.stringify(tables, null, 2) }],
        };
      }

      case 'supabase_describe_table': {
        const { table } = args as { table: string };

        const result = await describeTable(table);

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

        const result = await countRows(table, filters);

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

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
