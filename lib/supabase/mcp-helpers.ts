/**
 * MCP Server Helpers for Supabase
 *
 * Provides generic query operations for use by the Supabase MCP server.
 * These helpers wrap the supabaseAdmin client with a generic interface
 * suitable for AI agent tool calls.
 *
 * @module lib/supabase/mcp-helpers
 */

import { supabaseAdmin } from './admin';
import type { Database } from '../types/database';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Valid table names from the Database schema
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * Query options for table operations
 */
export interface QueryOptions {
  /** Columns to select (default: '*') */
  select?: string;
  /** Filter conditions as key-value pairs */
  filter?: Record<string, unknown>;
  /** Order by configuration */
  orderBy?: { column: string; ascending?: boolean };
  /** Maximum rows to return */
  limit?: number;
  /** Number of rows to skip */
  offset?: number;
}

/**
 * Result type for MCP operations
 */
export interface MCPResult<T = unknown> {
  data: T | null;
  error: string | null;
  count?: number;
}

/**
 * Query rows from a table with optional filtering, ordering, and pagination
 *
 * @param table - Table name to query
 * @param options - Query options (select, filter, orderBy, limit, offset)
 * @returns Query result with data or error
 */
export async function queryTable(
  table: string,
  options: QueryOptions = {}
): Promise<MCPResult<unknown[]>> {
  try {
    // Validate table name
    if (!isValidTable(table)) {
      return { data: null, error: `Invalid table name: ${table}` };
    }

    // Use type assertion for dynamic table access
    // The table name is validated above against VALID_TABLES
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin.from as any)(table).select(options.select || '*');

    // Apply filters
    if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      const end = options.offset + (options.limit || 10) - 1;
      query = query.range(options.offset, end);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: formatError(error) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: formatUnknownError(err) };
  }
}

/**
 * Insert a row into a table
 *
 * @param table - Table name to insert into
 * @param data - Row data to insert
 * @returns Insert result with created row or error
 */
export async function insertRow(
  table: string,
  data: Record<string, unknown>
): Promise<MCPResult<unknown>> {
  try {
    if (!isValidTable(table)) {
      return { data: null, error: `Invalid table name: ${table}` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabaseAdmin.from as any)(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      return { data: null, error: formatError(error) };
    }

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: formatUnknownError(err) };
  }
}

/**
 * Update rows in a table matching a filter
 *
 * @param table - Table name to update
 * @param filter - Filter conditions to match rows
 * @param data - Update data
 * @returns Update result with updated rows or error
 */
export async function updateRow(
  table: string,
  filter: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<MCPResult<unknown[]>> {
  try {
    if (!isValidTable(table)) {
      return { data: null, error: `Invalid table name: ${table}` };
    }

    // Use type assertion for dynamic table access
    // The table name is validated above against VALID_TABLES
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin.from as any)(table).update(data);

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { data: result, error } = await query.select();

    if (error) {
      return { data: null, error: formatError(error) };
    }

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: formatUnknownError(err) };
  }
}

/**
 * Delete rows from a table matching a filter
 *
 * @param table - Table name to delete from
 * @param filter - Filter conditions to match rows
 * @returns Delete result or error
 */
export async function deleteRow(
  table: string,
  filter: Record<string, unknown>
): Promise<MCPResult<null>> {
  try {
    if (!isValidTable(table)) {
      return { data: null, error: `Invalid table name: ${table}` };
    }

    if (Object.keys(filter).length === 0) {
      return { data: null, error: 'Delete requires at least one filter condition' };
    }

    // Use type assertion for dynamic table access
    // The table name is validated above against VALID_TABLES
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin.from as any)(table).delete();

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { error } = await query;

    if (error) {
      return { data: null, error: formatError(error) };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: formatUnknownError(err) };
  }
}

/**
 * Count rows in a table with optional filtering
 *
 * @param table - Table name to count
 * @param filter - Optional filter conditions
 * @returns Count result or error
 */
export async function countRows(
  table: string,
  filter?: Record<string, unknown>
): Promise<MCPResult<null>> {
  try {
    if (!isValidTable(table)) {
      return { data: null, error: `Invalid table name: ${table}` };
    }

    // Use type assertion for dynamic table access
    // The table name is validated above against VALID_TABLES
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin.from as any)(table).select('*', { count: 'exact', head: true });

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    const { count, error } = await query;

    if (error) {
      return { data: null, error: formatError(error) };
    }

    return { data: null, error: null, count: count ?? 0 };
  } catch (err) {
    return { data: null, error: formatUnknownError(err) };
  }
}

/**
 * Call a Supabase RPC function
 *
 * @param functionName - Name of the RPC function
 * @param params - Optional parameters for the function
 * @returns RPC result or error
 */
export async function callRpc(
  functionName: string,
  params?: Record<string, unknown>
): Promise<MCPResult<unknown>> {
  try {
    // Use type assertion for dynamic function name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.rpc as any)(functionName, params);

    if (error) {
      return { data: null, error: formatError(error) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: formatUnknownError(err) };
  }
}

/**
 * List all available tables
 *
 * @returns Array of table names
 */
export function listTables(): string[] {
  return VALID_TABLES;
}

/**
 * Describe a table's structure
 *
 * @param table - Table name to describe
 * @returns Table column information or error
 */
export async function describeTable(
  table: string
): Promise<MCPResult<{ columns: string[] }>> {
  if (!isValidTable(table)) {
    return { data: null, error: `Invalid table name: ${table}` };
  }

  // Return column names based on Database types
  const columns = getTableColumns(table);
  return { data: { columns }, error: null };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * List of valid table names from the database schema
 */
const VALID_TABLES: string[] = [
  'users',
  'client_profiles',
  'requests',
  'quotes',
  'proposals',
  'workflow_states',
  'agent_executions',
  'chatkit_sessions',
];

/**
 * Validate that a table name is in the allowed list
 */
function isValidTable(table: string): boolean {
  return VALID_TABLES.includes(table);
}

/**
 * Format a PostgrestError for MCP response
 */
function formatError(error: PostgrestError): string {
  return `${error.code}: ${error.message}${error.details ? ` - ${error.details}` : ''}`;
}

/**
 * Format an unknown error for MCP response
 */
function formatUnknownError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

/**
 * Get column names for a table based on Database types
 */
function getTableColumns(table: string): string[] {
  // Column definitions based on lib/types/supabase.ts
  const tableColumns: Record<string, string[]> = {
    users: [
      'id',
      'clerk_user_id',
      'email',
      'name',
      'role',
      'preferences',
      'created_at',
      'updated_at',
    ],
    client_profiles: [
      'id',
      'name',
      'contact_email',
      'contact_phone',
      'company_name',
      'preferences',
      'flight_history',
      'created_at',
      'updated_at',
      'user_id',
    ],
    requests: [
      'id',
      'user_id',
      'client_profile_id',
      'departure_airport',
      'arrival_airport',
      'departure_date',
      'return_date',
      'passengers',
      'special_requirements',
      'status',
      'avinode_rfp_id',
      'avinode_trip_id',
      'avinode_deep_link',
      'avinode_session_started_at',
      'created_at',
      'updated_at',
    ],
    quotes: [
      'id',
      'request_id',
      'operator_name',
      'aircraft_type',
      'price',
      'currency',
      'margin_type',
      'margin_value',
      'final_price',
      'valid_until',
      'status',
      'avinode_quote_id',
      'avinode_quote_data',
      'score',
      'score_breakdown',
      'created_at',
      'updated_at',
    ],
    proposals: [
      'id',
      'request_id',
      'quote_id',
      'status',
      'email_subject',
      'email_body',
      'sent_at',
      'opened_at',
      'responded_at',
      'created_at',
      'updated_at',
    ],
    workflow_states: [
      'id',
      'request_id',
      'current_state',
      'state_history',
      'context',
      'created_at',
      'updated_at',
    ],
    agent_executions: [
      'id',
      'request_id',
      'agent_type',
      'status',
      'input',
      'output',
      'error',
      'started_at',
      'completed_at',
      'duration_ms',
      'tokens_used',
      'created_at',
    ],
    chatkit_sessions: [
      'id',
      'user_id',
      'title',
      'status',
      'messages',
      'context',
      'created_at',
      'updated_at',
    ],
  };

  return tableColumns[table] || [];
}
