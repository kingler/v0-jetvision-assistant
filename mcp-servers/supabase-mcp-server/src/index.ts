#!/usr/bin/env node

/**
 * Supabase MCP Server
 *
 * Provides MCP tools for interacting with Supabase database:
 * - query: Execute SELECT queries with filters
 * - insert: Insert records into tables
 * - update: Update records
 * - delete: Delete records
 * - rpc: Call stored procedures/functions
 * - list_tables: List all accessible tables
 * - describe_table: Get table schema information
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  QueryParams,
  InsertParams,
  UpdateParams,
  DeleteParams,
  RpcParams,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
config({ path: resolve(__dirname, '../../../.env.local') });

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Define MCP tools
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
        returning: {
          type: 'boolean',
          description: 'Return the inserted records (default: true)',
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
        returning: {
          type: 'boolean',
          description: 'Return the updated records (default: true)',
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
        returning: {
          type: 'boolean',
          description: 'Return the deleted records (default: false)',
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

// Initialize MCP server
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

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'supabase_query': {
        const params = args as unknown as QueryParams;
        let query = supabase.from(params.table).select(params.select || '*');

        // Apply filters
        if (params.filters) {
          Object.entries(params.filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        // Apply ordering
        if (params.orderBy) {
          query = query.order(params.orderBy.column, {
            ascending: params.orderBy.ascending ?? true,
          });
        }

        // Apply pagination
        if (params.limit) {
          query = query.limit(params.limit);
        }
        if (params.offset) {
          query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
        }

        const { data, error } = await query;

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'supabase_insert': {
        const params = args as unknown as InsertParams;
        const returning = params.returning ?? true;

        let query = supabase.from(params.table).insert(params.data);

        if (returning) {
          query = query.select();
        }

        const { data, error } = await query;

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: returning
                ? JSON.stringify(data, null, 2)
                : 'Insert successful',
            },
          ],
        };
      }

      case 'supabase_update': {
        const params = args as unknown as UpdateParams;
        const returning = params.returning ?? true;

        let query = supabase.from(params.table).update(params.data);

        // Apply filters
        Object.entries(params.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });

        if (returning) {
          query = query.select();
        }

        const { data, error } = await query;

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: returning
                ? JSON.stringify(data, null, 2)
                : 'Update successful',
            },
          ],
        };
      }

      case 'supabase_delete': {
        const params = args as unknown as DeleteParams;
        const returning = params.returning ?? false;

        let query = supabase.from(params.table).delete();

        // Apply filters
        Object.entries(params.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });

        if (returning) {
          query = query.select();
        }

        const { data, error } = await query;

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: returning
                ? JSON.stringify(data, null, 2)
                : 'Delete successful',
            },
          ],
        };
      }

      case 'supabase_rpc': {
        const params = args as unknown as RpcParams;
        const { data, error } = await supabase.rpc(
          params.functionName,
          params.params || {}
        );

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'supabase_list_tables': {
        const { data, error } = await supabase.rpc('list_tables');

        if (error) {
          // Fallback to information_schema query
          const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

          if (tablesError) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${tablesError.message}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tables, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'supabase_describe_table': {
        const { table } = args as { table: string };

        const { data, error } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', table);

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'supabase_count': {
        const params = args as unknown as QueryParams;
        let query = supabase
          .from(params.table)
          .select('*', { count: 'exact', head: true });

        // Apply filters
        if (params.filters) {
          Object.entries(params.filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        const { count, error } = await query;

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Count: ${count}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
