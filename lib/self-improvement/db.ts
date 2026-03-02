// ---------------------------------------------------------------------------
// Self-Improving Agent -- Database Helper
// ---------------------------------------------------------------------------
// The 6 self-improvement tables (from migration 040) are not yet in the
// generated Supabase types.  This module provides a thin wrapper that
// bypasses the strict `supabaseAdmin.from()` overload so the rest of
// the self-improvement code compiles without `any` casts scattered
// throughout.
//
// Once `supabase gen types typescript` is re-run against the database
// (after migration 040 is applied), this file can be removed and all
// imports replaced with a direct `supabaseAdmin` import.
// ---------------------------------------------------------------------------

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Self-improvement table names added by migration 040.
 * These are not yet present in the generated Database type.
 */
export type SelfImprovementTable =
  | 'system_prompt_versions'
  | 'agent_signals'
  | 'reflection_logs'
  | 'knowledge_base'
  | 'prompt_suggestions'
  | 'workflow_stage_timestamps';

/**
 * Untyped Supabase client reference.
 *
 * Usage:
 * ```ts
 * import { selfImprovementDb } from './db';
 * const { data } = await selfImprovementDb.from('knowledge_base').select('*');
 * ```
 */
export const selfImprovementDb = supabaseAdmin as SupabaseClient<any, 'public', any>; // intentional: tables not yet in generated types
