/**
 * Supabase MCP Server Types
 */

export interface QueryParams {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export interface InsertParams {
  table: string;
  data: Record<string, any> | Record<string, any>[];
  returning?: boolean;
}

export interface UpdateParams {
  table: string;
  filters: Record<string, any>;
  data: Record<string, any>;
  returning?: boolean;
}

export interface DeleteParams {
  table: string;
  filters: Record<string, any>;
  returning?: boolean;
}

export interface RpcParams {
  functionName: string;
  params?: Record<string, any>;
}

export interface TableSchema {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}
