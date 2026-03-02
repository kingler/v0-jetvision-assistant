// ---------------------------------------------------------------------------
// Self-Improving Agent -- Reflection Engine Tests
// ---------------------------------------------------------------------------
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabaseAdmin before importing modules that depend on it
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

// Mock dependent modules
vi.mock('@/lib/self-improvement/signal-persistence', () => ({
  countCompletedSessionsSinceLastReflection: vi.fn(),
  getSignalsSinceLastReflection: vi.fn(),
}));

vi.mock('@/lib/self-improvement/evaluator', () => ({
  evaluateConversations: vi.fn(),
}));

vi.mock('@/lib/self-improvement/knowledge-base', () => ({
  addKnowledgeEntry: vi.fn(),
  canAutoUpdate: vi.fn(),
}));

vi.mock('@/lib/self-improvement/prompt-version-manager', () => ({
  createPromptVersion: vi.fn(),
}));

import {
  decideAction,
  canRunReflection,
  runReflection,
} from '@/lib/self-improvement/reflection-engine';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  countCompletedSessionsSinceLastReflection,
  getSignalsSinceLastReflection,
} from '@/lib/self-improvement/signal-persistence';
import { evaluateConversations } from '@/lib/self-improvement/evaluator';
import { addKnowledgeEntry, canAutoUpdate } from '@/lib/self-improvement/knowledge-base';
import type { EvaluationResult } from '@/lib/self-improvement/types';

// ---- Helpers ----------------------------------------------------------------

function mockFromChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return chain;
}

function makeEvaluationResult(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    scores: {
      deal_progression_score: 4,
      domain_accuracy_score: 4,
      proactive_sales_score: 3,
      communication_score: 4,
      scope_score: 5,
      overall_score: 3.9,
    },
    strengths: ['Good deal flow'],
    weaknesses: ['Missed upsell'],
    patterns_noticed: ['Pattern A'],
    suggested_improvements: [],
    ...overrides,
  };
}

// ---- Tests ------------------------------------------------------------------

describe('reflection-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- decideAction (pure logic) ------------------------------------------

  describe('decideAction', () => {
    it('should return "none" for scores >= 4.0', () => {
      expect(decideAction(4.2)).toBe('none');
      expect(decideAction(4.0)).toBe('none');
      expect(decideAction(5.0)).toBe('none');
    });

    it('should return "suggestion" for scores 3.0-3.9', () => {
      expect(decideAction(3.5)).toBe('suggestion');
      expect(decideAction(3.0)).toBe('suggestion');
      expect(decideAction(3.99)).toBe('suggestion');
    });

    it('should return "auto_update" for scores 2.0-2.9', () => {
      expect(decideAction(2.5)).toBe('auto_update');
      expect(decideAction(2.0)).toBe('auto_update');
      expect(decideAction(2.99)).toBe('auto_update');
    });

    it('should return "escalate" for scores < 2.0', () => {
      expect(decideAction(1.5)).toBe('escalate');
      expect(decideAction(0)).toBe('escalate');
      expect(decideAction(1.99)).toBe('escalate');
    });
  });

  // ---- canRunReflection ---------------------------------------------------

  describe('canRunReflection', () => {
    it('should skip when cooldown has not elapsed', async () => {
      const recentTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

      const chain = mockFromChain({
        single: vi.fn().mockResolvedValue({
          data: { created_at: recentTimestamp },
          error: null,
        }),
      });
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await canRunReflection();

      expect(result.canRun).toBe(false);
      expect(result.reason).toContain('cooldown');
    });

    it('should skip when insufficient sessions', async () => {
      // No prior reflection (cooldown passes)
      const chain = mockFromChain({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      (countCompletedSessionsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue(3);

      const result = await canRunReflection();

      expect(result.canRun).toBe(false);
      expect(result.reason).toContain('insufficient_data');
    });

    it('should allow run when cooldown elapsed and enough sessions', async () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(); // 10 hours ago

      const chain = mockFromChain({
        single: vi.fn().mockResolvedValue({
          data: { created_at: oldTimestamp },
          error: null,
        }),
      });
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      (countCompletedSessionsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue(15);

      const result = await canRunReflection();

      expect(result.canRun).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow run when no prior reflection exists and enough sessions', async () => {
      const chain = mockFromChain({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      (countCompletedSessionsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue(12);

      const result = await canRunReflection();

      expect(result.canRun).toBe(true);
    });
  });

  // ---- runReflection (integration-level) ----------------------------------

  describe('runReflection', () => {
    it('should skip if canRunReflection returns false (cooldown)', async () => {
      const recentTimestamp = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

      const chain = mockFromChain({
        single: vi.fn().mockResolvedValue({
          data: { created_at: recentTimestamp },
          error: null,
        }),
      });
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await runReflection();

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('cooldown');
    });

    it('should skip if no conversations are found', async () => {
      // Pass cooldown + sessions check
      const callCount = { n: 0 };
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reflection_logs') {
          callCount.n++;
          // First call: canRunReflection cooldown check
          // Second call: gatherConversations "since" lookup
          return mockFromChain({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          });
        }
        if (table === 'requests') {
          return mockFromChain({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          });
        }
        return mockFromChain();
      });

      (countCompletedSessionsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue(15);

      const result = await runReflection();

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('no_conversations');
    });

    it('should run full reflection loop and return log', async () => {
      const reflectionLogId = 'rl-test-123';

      // Track which table is being queried
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reflection_logs') {
          // For cooldown check and gatherConversations "since" lookup
          const singleFn = vi.fn().mockResolvedValue({ data: null, error: null });
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: reflectionLogId,
                    conversations_analyzed: 1,
                    time_window_start: '2026-01-01T00:00:00Z',
                    time_window_end: '2026-03-02T00:00:00Z',
                    deal_progression_score: 4,
                    domain_accuracy_score: 4,
                    proactive_sales_score: 3,
                    communication_score: 4,
                    scope_score: 5,
                    overall_score: 3.9,
                    strengths: ['Good deal flow'],
                    weaknesses: ['Missed upsell'],
                    patterns_noticed: ['Pattern A'],
                    action_taken: 'suggestion',
                    raw_analysis: {},
                  },
                  error: null,
                }),
              }),
            }),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: singleFn,
          };
        }

        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'req-1',
                  workflow_state: { workflowStage: 'trip_created' },
                  session_status: 'archived',
                },
              ],
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: { workflow_state: { workflowStage: 'trip_created' } },
              error: null,
            }),
          };
        }

        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                { sender_type: 'iso_agent', content: 'I need a flight', metadata: {} },
                { sender_type: 'assistant', content: 'Let me search for you', metadata: {} },
              ],
              error: null,
            }),
          };
        }

        if (table === 'workflow_stage_timestamps') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }

        if (table === 'prompt_suggestions') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }

        return mockFromChain();
      });

      (countCompletedSessionsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue(15);
      (getSignalsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (evaluateConversations as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeEvaluationResult({
          scores: {
            deal_progression_score: 4,
            domain_accuracy_score: 4,
            proactive_sales_score: 3,
            communication_score: 4,
            scope_score: 5,
            overall_score: 3.9,
          },
        })
      );

      const result = await runReflection();

      expect(result.skipped).toBe(false);
      expect(result.reflectionLog).toBeDefined();
      expect(result.reflectionLog!.id).toBe(reflectionLogId);
      expect(evaluateConversations).toHaveBeenCalledOnce();
    });

    it('should apply auto_update improvements to knowledge base', async () => {
      const reflectionLogId = 'rl-auto-123';

      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reflection_logs') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: reflectionLogId,
                    conversations_analyzed: 1,
                    time_window_start: '2026-01-01T00:00:00Z',
                    time_window_end: '2026-03-02T00:00:00Z',
                    deal_progression_score: 2,
                    domain_accuracy_score: 2,
                    proactive_sales_score: 2,
                    communication_score: 3,
                    scope_score: 3,
                    overall_score: 2.3,
                    strengths: [],
                    weaknesses: ['Poor deal flow'],
                    patterns_noticed: [],
                    action_taken: 'auto_update',
                    raw_analysis: {},
                  },
                  error: null,
                }),
              }),
            }),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }

        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'req-1',
                  workflow_state: { workflowStage: 'trip_created' },
                  session_status: 'archived',
                },
              ],
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: { workflow_state: { workflowStage: 'trip_created' } },
              error: null,
            }),
          };
        }

        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                { sender_type: 'iso_agent', content: 'test', metadata: {} },
              ],
              error: null,
            }),
          };
        }

        if (table === 'workflow_stage_timestamps') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }

        if (table === 'prompt_suggestions') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }

        return mockFromChain();
      });

      (countCompletedSessionsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue(15);
      (getSignalsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (canAutoUpdate as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (addKnowledgeEntry as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'kb-1',
        category: 'workflow_tips',
        title: 'Test tip',
        content: 'Auto-applied tip',
        confidence: 0.7,
        times_relevant: 0,
        is_active: true,
      });

      (evaluateConversations as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeEvaluationResult({
          scores: {
            deal_progression_score: 2,
            domain_accuracy_score: 2,
            proactive_sales_score: 2,
            communication_score: 3,
            scope_score: 3,
            overall_score: 2.3,
          },
          suggested_improvements: [
            {
              target_section: 'scenario_handlers',
              change_type: 'add',
              content: 'Add handling for multi-city trips',
              severity: 'minor',
              reasoning: 'Multi-city trips are common but not well handled',
            },
          ],
        })
      );

      const result = await runReflection();

      expect(result.skipped).toBe(false);
      expect(result.reflectionLog!.action_taken).toBe('auto_update');
      expect(canAutoUpdate).toHaveBeenCalledOnce();
      expect(addKnowledgeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'workflow_tips',
          confidence: 0.7,
          source_reflection_id: reflectionLogId,
        })
      );
    });

    it('should create prompt_suggestions for non-minor improvements', async () => {
      const reflectionLogId = 'rl-suggest-123';
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reflection_logs') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: reflectionLogId,
                    conversations_analyzed: 1,
                    time_window_start: '2026-01-01T00:00:00Z',
                    time_window_end: '2026-03-02T00:00:00Z',
                    deal_progression_score: 3,
                    domain_accuracy_score: 3,
                    proactive_sales_score: 3,
                    communication_score: 3,
                    scope_score: 3,
                    overall_score: 3.0,
                    strengths: [],
                    weaknesses: [],
                    patterns_noticed: [],
                    action_taken: 'suggestion',
                    raw_analysis: {},
                  },
                  error: null,
                }),
              }),
            }),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }

        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'req-1',
                  workflow_state: { workflowStage: 'trip_created' },
                  session_status: 'archived',
                },
              ],
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: { workflow_state: { workflowStage: 'trip_created' } },
              error: null,
            }),
          };
        }

        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                { sender_type: 'iso_agent', content: 'test', metadata: {} },
              ],
              error: null,
            }),
          };
        }

        if (table === 'workflow_stage_timestamps') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }

        if (table === 'prompt_suggestions') {
          return { insert: insertMock };
        }

        return mockFromChain();
      });

      (countCompletedSessionsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue(15);
      (getSignalsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      (evaluateConversations as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeEvaluationResult({
          scores: {
            deal_progression_score: 3,
            domain_accuracy_score: 3,
            proactive_sales_score: 3,
            communication_score: 3,
            scope_score: 3,
            overall_score: 3.0,
          },
          suggested_improvements: [
            {
              target_section: 'response_formats',
              change_type: 'modify',
              content: 'Improve quote presentation format for better readability',
              severity: 'major',
              reasoning: 'Clients struggle to compare quotes in current format',
            },
          ],
        })
      );

      const result = await runReflection();

      expect(result.skipped).toBe(false);
      expect(result.reflectionLog!.action_taken).toBe('suggestion');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          reflection_log_id: reflectionLogId,
          severity: 'major',
          target_section: 'response_formats',
          suggestion_type: 'prompt_change',
          status: 'pending',
        })
      );
    });

    it('should return log_failed if reflection log insert fails', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reflection_logs') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'insert failed' },
                }),
              }),
            }),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }

        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'req-1',
                  workflow_state: { workflowStage: 'trip_created' },
                  session_status: 'archived',
                },
              ],
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: { workflow_state: { workflowStage: 'trip_created' } },
              error: null,
            }),
          };
        }

        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                { sender_type: 'iso_agent', content: 'test', metadata: {} },
              ],
              error: null,
            }),
          };
        }

        if (table === 'workflow_stage_timestamps') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }

        return mockFromChain();
      });

      (countCompletedSessionsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue(15);
      (getSignalsSinceLastReflection as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (evaluateConversations as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeEvaluationResult()
      );

      const result = await runReflection();

      expect(result.skipped).toBe(false);
      expect(result.reason).toBe('log_failed');
      expect(result.reflectionLog).toBeUndefined();
    });
  });
});
