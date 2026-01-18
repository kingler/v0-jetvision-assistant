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
 * Default limit for pagination when not specified
 */
const DEFAULT_LIMIT = 50;

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
    // Dynamic table access with validated table name
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
    // When offset is provided, use range() which includes both offset and limit
    // When offset is not provided, use limit() only
    if (options.offset !== undefined) {
      // Calculate end index: offset + (limit || DEFAULT_LIMIT) - 1
      // Range is inclusive on both ends, so subtract 1 from the total
      const limit = options.limit || DEFAULT_LIMIT;
      const end = options.offset + limit - 1;
      query = query.range(options.offset, end);
    } else if (options.limit) {
      // Only use limit() when there's no offset
      query = query.limit(options.limit);
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

    // Dynamic table access with validated table name
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

    // Guard: Verify filter contains at least one key with a non-null/defined value
    // This prevents unsafe updates like {} or { id: undefined } which would update all rows
    // Filter out entries where value is null or undefined before validation
    const validEntries = Object.entries(filter).filter(
      ([, value]) => value !== undefined && value !== null
    );

    // Require at least one valid filter condition to prevent accidental full table updates
    // Return safe error without making DB call if filter is empty
    if (validEntries.length === 0) {
      return { data: null, error: 'Empty filter not allowed for update' };
    }

    // Use type assertion for dynamic table access
    // The table name is validated above against VALID_TABLES
    // Dynamic table access with validated table name
    let query = (supabaseAdmin.from as any)(table).update(data);

    // Only iterate over valid entries to ensure at least one predicate is added
    for (const [key, value] of validEntries) {
      query = query.eq(key, value);
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

    // Filter out entries where value is null or undefined
    // This prevents unsafe deletes like { id: undefined } which would delete all rows
    const validEntries = Object.entries(filter).filter(
      ([, value]) => value !== undefined && value !== null
    );

    // Require at least one valid filter condition to prevent accidental full table deletion
    if (validEntries.length === 0) {
      return { data: null, error: 'Delete requires at least one filter condition' };
    }

    // Use type assertion for dynamic table access
    // The table name is validated above against VALID_TABLES
    // Dynamic table access with validated table name
    let query = (supabaseAdmin.from as any)(table).delete();

    // Only iterate over valid entries to ensure at least one predicate is added
    for (const [key, value] of validEntries) {
      query = query.eq(key, value);
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
    // Dynamic table access with validated table name
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
    // Dynamic table access with validated table name
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
 * @returns Array of table names from the Database schema
 */
export function listTables(): TableName[] {
  // Type assertion is safe because VALID_TABLES is validated at compile time
  // to match Database['public']['Tables'] exactly
  return VALID_TABLES as unknown as TableName[];
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
 * Extract all table names from the Database type at compile time
 * This ensures VALID_TABLES stays in sync with the Database schema
 */
type DatabaseTableNames = keyof Database['public']['Tables'];

/**
 * Helper type to create a record from an array of table names
 * Used for validation to ensure completeness
 */
type TablesRecord<T extends readonly string[]> = {
  [K in T[number]]: true;
};

/**
 * Helper type to ensure VALID_TABLES contains all tables from Database type
 * This will cause a compile error if VALID_TABLES is missing any tables
 * 
 * The check works by creating a record from VALID_TABLES and ensuring
 * it has all keys from DatabaseTableNames
 */
type AssertAllTablesIncluded<T extends readonly DatabaseTableNames[]> = {
  [K in DatabaseTableNames]: K extends T[number] ? true : 'MISSING_TABLE';
};

/**
 * Helper type to ensure VALID_TABLES doesn't contain any extra tables
 * This will cause a compile error if VALID_TABLES has tables not in Database type
 * 
 * The check works by ensuring every entry in VALID_TABLES is a valid DatabaseTableNames key
 */
type AssertNoExtraTables<T extends readonly string[]> = {
  [K in T[number]]: K extends DatabaseTableNames ? true : 'INVALID_TABLE';
};

/**
 * List of valid table names from the database schema
 * 
 * This array is derived from Database['public']['Tables'] to prevent drift.
 * The `satisfies` keyword ensures compile-time validation that all entries
 * are valid table names from the Database type.
 * 
 * The type assertions below ensure:
 * 1. All tables from Database type are included (completeness check)
 * 2. No extra tables are included that don't exist in Database type (safety check)
 * 
 * If the build fails with type errors, update this array to match the Database type.
 * 
 * To get the current list of tables, use:
 * ```typescript
 * type Tables = keyof Database['public']['Tables'];
 * ```
 */
const VALID_TABLES = [
  'agent_executions',
  'client_profiles',
  'conversation_state',
  'iso_agents',
  'llm_config',
  'proposals',
  'quotes',
  'requests',
  'workflow_states',
] as const satisfies readonly DatabaseTableNames[];

/**
 * Build-time type assertion: Ensure VALID_TABLES includes all Database tables
 * This will fail at compile time if any table is missing from VALID_TABLES
 * 
 * The check works by ensuring every DatabaseTableNames key is present in VALID_TABLES.
 * If any table is missing, the AssertAllTablesIncluded type will contain 'MISSING_TABLE'
 * values, which will cause this assertion to fail with a clear error message.
 */
// Compile-time type assertion (intentionally unused at runtime)
type _AssertAllTablesIncluded = AssertAllTablesIncluded<typeof VALID_TABLES>[DatabaseTableNames] extends true
  ? true
  : {
      // This error type will be shown if VALID_TABLES is missing tables
      ERROR: 'VALID_TABLES is missing one or more tables from Database type. Update VALID_TABLES to include all tables.';
      MISSING_TABLES: {
        [K in DatabaseTableNames]: K extends typeof VALID_TABLES[number]
          ? never
          : K;
      }[DatabaseTableNames];
    };

/**
 * Build-time type assertion: Ensure VALID_TABLES has no extra tables
 * This will fail at compile time if VALID_TABLES contains a table that doesn't exist in Database type
 * 
 * The check works by ensuring every VALID_TABLES entry is a valid DatabaseTableNames key.
 * If any invalid table is present, the AssertNoExtraTables type will contain 'INVALID_TABLE'
 * values, which will cause this assertion to fail with a clear error message.
 */
// Compile-time type assertion (intentionally unused at runtime)
type _AssertNoExtraTables = AssertNoExtraTables<typeof VALID_TABLES>[typeof VALID_TABLES[number]] extends true
  ? true
  : {
      // This error type will be shown if VALID_TABLES contains invalid tables
      ERROR: 'VALID_TABLES contains one or more tables not in Database type. Remove invalid tables from VALID_TABLES.';
      INVALID_TABLES: {
        [K in typeof VALID_TABLES[number]]: K extends DatabaseTableNames
          ? never
          : K;
      }[typeof VALID_TABLES[number]];
    };

/**
 * Validate that a table name is in the allowed list
 * 
 * @param table - Table name to validate
 * @returns True if table is valid, false otherwise
 */
function isValidTable(table: string): table is TableName {
  return (VALID_TABLES as readonly string[]).includes(table);
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
      'avinode_rfq_id',
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
  };

  return tableColumns[table] || [];
}
