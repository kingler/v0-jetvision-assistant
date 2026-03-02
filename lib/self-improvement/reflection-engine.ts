// ---------------------------------------------------------------------------
// Self-Improving Agent -- Reflection Engine
// ---------------------------------------------------------------------------
// Core orchestration module that ties together signal persistence, evaluator,
// knowledge base, and prompt version manager into a single reflection loop.
//
// Exported functions:
//   - decideAction(overallScore)  -- pure logic, returns action type
//   - canRunReflection()          -- checks cooldown + minimum sessions
//   - runReflection()             -- full loop: check -> gather -> evaluate -> decide -> log -> apply
// ---------------------------------------------------------------------------

import { selfImprovementDb } from './db';
import {
  MIN_SESSIONS_FOR_REFLECTION,
  COOLDOWN_HOURS,
  THRESHOLDS,
} from './constants';
import {
  countCompletedSessionsSinceLastReflection,
  getSignalsSinceLastReflection,
} from './signal-persistence';
import { evaluateConversations } from './evaluator';
import { addKnowledgeEntry, canAutoUpdate } from './knowledge-base';
import type {
  ReflectionAction,
  ReflectionLogWithScores,
  ConversationForEval,
  WorkflowOutcome,
  EvaluationResult,
} from './types';

/**
 * Decide what action to take based on overall score.
 *
 * Score ranges map to actions:
 * - >= 4.0 (excellent): no action needed
 * - >= 3.0 (suggestion): create a human-reviewable suggestion
 * - >= 2.0 (autoUpdate): apply change automatically within daily limit
 * - < 2.0 (escalate): flag for immediate human attention
 */
export function decideAction(overallScore: number): ReflectionAction {
  if (overallScore >= THRESHOLDS.excellent) return 'none';
  if (overallScore >= THRESHOLDS.suggestion) return 'suggestion';
  if (overallScore >= THRESHOLDS.autoUpdate) return 'auto_update';
  return 'escalate';
}

/**
 * Check if reflection can run (cooldown + minimum sessions).
 *
 * Two conditions must be met:
 * 1. At least COOLDOWN_HOURS (6h) since the last reflection
 * 2. At least MIN_SESSIONS_FOR_REFLECTION (10) completed sessions since last reflection
 */
export async function canRunReflection(): Promise<{
  canRun: boolean;
  reason?: string;
}> {
  // Check cooldown
  const { data: lastReflection } = await selfImprovementDb
    .from('reflection_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastReflection) {
    const hoursSince =
      (Date.now() - new Date(lastReflection.created_at).getTime()) /
      (1000 * 60 * 60);
    if (hoursSince < COOLDOWN_HOURS) {
      return {
        canRun: false,
        reason: `cooldown (${hoursSince.toFixed(1)}h < ${COOLDOWN_HOURS}h)`,
      };
    }
  }

  // Check minimum sessions
  const sessionCount = await countCompletedSessionsSinceLastReflection();
  if (sessionCount < MIN_SESSIONS_FOR_REFLECTION) {
    return {
      canRun: false,
      reason: `insufficient_data (${sessionCount} < ${MIN_SESSIONS_FOR_REFLECTION} sessions)`,
    };
  }

  return { canRun: true };
}

/**
 * Gather recent conversations for evaluation.
 * Pulls archived sessions from the requests table since the last reflection,
 * along with their messages.
 */
async function gatherConversations(): Promise<ConversationForEval[]> {
  const { data: lastReflection } = await selfImprovementDb
    .from('reflection_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const since = lastReflection?.created_at || '2000-01-01T00:00:00Z';

  const { data: requests } = await selfImprovementDb
    .from('requests')
    .select('id, workflow_state, session_status')
    .in('session_status', ['archived'])
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (!requests || requests.length === 0) return [];

  const conversations: ConversationForEval[] = [];

  for (const req of requests) {
    const { data: messages } = await selfImprovementDb
      .from('messages')
      .select('sender_type, content, metadata')
      .eq('request_id', req.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!messages || messages.length === 0) continue;

    const ws = (req.workflow_state || {}) as Record<string, unknown>;

    conversations.push({
      conversation_id: req.id,
      messages: messages.map((m) => ({
        role: m.sender_type === 'iso_agent' ? 'user' : 'assistant',
        content: m.content || '',
      })),
      workflow_stage: (ws.workflowStage as string) || 'unknown',
      tool_calls: [],
    });
  }

  return conversations;
}

/**
 * Gather workflow outcomes for evaluated conversations.
 * Pulls workflow stage timestamps and message counts for each conversation.
 */
async function gatherOutcomes(
  conversationIds: string[]
): Promise<WorkflowOutcome[]> {
  const outcomes: WorkflowOutcome[] = [];

  for (const id of conversationIds) {
    const { data: timestamps } = await selfImprovementDb
      .from('workflow_stage_timestamps')
      .select('*')
      .eq('request_id', id)
      .order('entered_at', { ascending: true });

    const { count: msgCount } = await selfImprovementDb
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', id);

    const { data: req } = await selfImprovementDb
      .from('requests')
      .select('workflow_state')
      .eq('id', id)
      .single();

    const ws = (req?.workflow_state || {}) as Record<string, unknown>;
    const finalStage = (ws.workflowStage as string) || 'unknown';

    outcomes.push({
      request_id: id,
      final_stage: finalStage,
      stage_timestamps: timestamps || [],
      total_messages: msgCount || 0,
      deal_closed: ['closed_won', 'deal_closed'].includes(finalStage),
    });
  }

  return outcomes;
}

/**
 * Apply improvements from evaluation results.
 *
 * - Minor improvements with auto_update action: added to knowledge base (if within daily limit)
 * - All other improvements: saved as prompt_suggestions for human review
 */
async function applyImprovements(
  evaluation: EvaluationResult,
  action: ReflectionAction,
  reflectionLogId: string
): Promise<void> {
  for (const improvement of evaluation.suggested_improvements) {
    if (improvement.severity === 'minor' && action === 'auto_update') {
      const allowed = await canAutoUpdate();
      if (allowed) {
        await addKnowledgeEntry({
          category: 'workflow_tips',
          title: improvement.content.slice(0, 100),
          content: improvement.content,
          confidence: 0.7,
          source_reflection_id: reflectionLogId,
        });
      }
    } else {
      await selfImprovementDb.from('prompt_suggestions').insert({
        reflection_log_id: reflectionLogId,
        severity: improvement.severity,
        target_section: improvement.target_section,
        suggestion_type:
          improvement.change_type === 'add'
            ? 'scenario_addition'
            : 'prompt_change',
        title: improvement.content.slice(0, 100),
        description: improvement.reasoning,
        proposed_change: improvement.content,
        status: 'pending',
      });
    }
  }
}

/**
 * Run the full reflection loop.
 * This is the main entry point called by the admin API route.
 *
 * Steps:
 * 1. Check if we can run (cooldown + minimum sessions)
 * 2. Gather evidence (conversations, signals, outcomes)
 * 3. Evaluate with AI-as-Judge
 * 4. Decide action based on overall score
 * 5. Log reflection to database
 * 6. Apply improvements (knowledge base or suggestions)
 */
export async function runReflection(): Promise<{
  skipped: boolean;
  reason?: string;
  reflectionLog?: ReflectionLogWithScores;
}> {
  // 1. Check if we can run
  const { canRun, reason } = await canRunReflection();
  if (!canRun) {
    return { skipped: true, reason };
  }

  // 2. Gather evidence
  const conversations = await gatherConversations();
  if (conversations.length === 0) {
    return { skipped: true, reason: 'no_conversations' };
  }

  const signals = await getSignalsSinceLastReflection();
  const outcomes = await gatherOutcomes(
    conversations.map((c) => c.conversation_id)
  );

  // 3. Evaluate
  const evaluation = await evaluateConversations({
    conversations,
    signals,
    workflow_outcomes: outcomes,
  });

  // 4. Decide action
  const action = decideAction(evaluation.scores.overall_score);

  // 5. Log reflection
  const { data: reflectionLog, error } = await selfImprovementDb
    .from('reflection_logs')
    .insert({
      conversations_analyzed: conversations.length,
      time_window_start: new Date(
        Math.min(
          ...conversations.map(() => Date.now())
        )
      ).toISOString(),
      time_window_end: new Date().toISOString(),
      ...evaluation.scores,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      patterns_noticed: evaluation.patterns_noticed,
      action_taken: action,
      raw_analysis: evaluation as unknown as Record<string, unknown>,
    })
    .select()
    .single();

  if (error || !reflectionLog) {
    console.error(
      '[Self-Improvement] Failed to log reflection:',
      error?.message
    );
    return { skipped: false, reason: 'log_failed' };
  }

  // 6. Apply improvements
  if (action !== 'none') {
    await applyImprovements(evaluation, action, reflectionLog.id);
  }

  return {
    skipped: false,
    reflectionLog: reflectionLog as ReflectionLogWithScores,
  };
}
