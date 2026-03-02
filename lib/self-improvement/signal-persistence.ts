// ---------------------------------------------------------------------------
// Self-Improving Agent -- Signal Persistence Service
// ---------------------------------------------------------------------------
// Database layer for saving detected signals and workflow stage transitions.
// Uses selfImprovementDb (service role) for all operations.
// ---------------------------------------------------------------------------

import { selfImprovementDb } from './db';
import type { AgentSignal } from './types';

/**
 * Persist detected signals to the agent_signals table.
 * Silently logs errors -- callers should not need to handle DB failures.
 */
export async function saveSignals(signals: AgentSignal[]): Promise<void> {
  if (signals.length === 0) return;

  const { error } = await selfImprovementDb
    .from('agent_signals')
    .insert(signals);

  if (error) {
    console.error('[Self-Improvement] Failed to save signals:', error.message);
  }
}

/**
 * Record a workflow stage transition with timestamps.
 * Closes the previous stage (sets exited_at) and opens the new one.
 */
export async function recordStageTransition(
  requestId: string,
  newStage: string,
  previousStage?: string,
): Promise<void> {
  const now = new Date().toISOString();

  // Close the previous stage entry (set exited_at)
  if (previousStage) {
    await selfImprovementDb
      .from('workflow_stage_timestamps')
      .update({ exited_at: now })
      .eq('request_id', requestId)
      .eq('stage', previousStage)
      .is('exited_at', null);
  }

  // Insert the new stage entry
  const { error } = await selfImprovementDb
    .from('workflow_stage_timestamps')
    .insert({
      request_id: requestId,
      stage: newStage,
      entered_at: now,
      previous_stage: previousStage || null,
    });

  if (error) {
    console.error('[Self-Improvement] Failed to record stage transition:', error.message);
  }
}

/**
 * Get all signals since the last reflection log entry.
 * Falls back to epoch if no reflection has been recorded yet.
 */
export async function getSignalsSinceLastReflection(): Promise<AgentSignal[]> {
  // Find last reflection timestamp
  const { data: lastReflection } = await selfImprovementDb
    .from('reflection_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const since = lastReflection?.created_at || '2000-01-01T00:00:00Z';

  const { data, error } = await selfImprovementDb
    .from('agent_signals')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Self-Improvement] Failed to fetch signals:', error.message);
    return [];
  }

  return (data || []) as AgentSignal[];
}

/**
 * Count completed sessions (archived) since the last reflection.
 * Used to decide whether enough data has accumulated for a new reflection cycle.
 */
export async function countCompletedSessionsSinceLastReflection(): Promise<number> {
  const { data: lastReflection } = await selfImprovementDb
    .from('reflection_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const since = lastReflection?.created_at || '2000-01-01T00:00:00Z';

  const { count, error } = await selfImprovementDb
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .in('session_status', ['archived'])
    .gte('updated_at', since);

  if (error) {
    console.error('[Self-Improvement] Failed to count sessions:', error.message);
    return 0;
  }

  return count || 0;
}
