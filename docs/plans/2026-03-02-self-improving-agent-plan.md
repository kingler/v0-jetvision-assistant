# Self-Improving Jetvision Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a self-improvement feedback loop that captures implicit signals from ISO agent conversations, periodically evaluates agent performance using an AI-as-Judge with a charter aviation rubric, and automatically improves the system prompt and knowledge base.

**Architecture:** Three-layer system -- (1) Signal Capture instruments the existing chat API to detect correction patterns, workflow backtracking, and deal velocity; (2) Reflection Engine runs after every N completed sessions to evaluate performance via LLM-as-Judge; (3) Improvement Pipeline generates knowledge base entries (auto-applied) and prompt suggestions (tiered approval). The system prompt becomes dynamically rendered from versioned sections stored in Supabase.

**Tech Stack:** TypeScript, Next.js API routes, Supabase (Postgres), OpenAI API (for evaluation LLM), existing `supabaseAdmin` client

**Design Doc:** `docs/plans/2026-03-02-self-improving-agent-design.md`

---

## Task 1: Types & Constants

**Files:**
- Create: `lib/self-improvement/types.ts`
- Create: `lib/self-improvement/constants.ts`

**Step 1: Create the types file**

```typescript
// lib/self-improvement/types.ts

// === Signal Types ===

export type SignalType =
  | 'correction'       // User corrected agent ("No, I meant...")
  | 'backtrack'        // Workflow stage went backwards
  | 'drop_off'         // Session abandoned at a stage
  | 'tool_retry'       // Same tool called twice with different params
  | 'slow_progression' // Too many messages before stage advance
  | 'deal_closed';     // Positive: deal completed successfully

export interface AgentSignal {
  id?: string;
  conversation_id: string;
  message_id?: string;
  signal_type: SignalType;
  signal_strength: number; // -1.0 to 1.0
  metadata?: Record<string, unknown>;
  created_at?: string;
}

// === Prompt Versioning ===

export type PromptSection =
  | 'scenario_handlers'
  | 'response_formats';

export interface SystemPromptVersion {
  id?: string;
  version: number;
  section: PromptSection;
  content: string;
  is_active: boolean;
  created_by: 'system' | 'human';
  performance_score?: number;
  change_reason?: string;
  previous_version_id?: string;
  locked: boolean;
  created_at?: string;
}

// === Knowledge Base ===

export type KnowledgeCategory =
  | 'aircraft_patterns'
  | 'client_preferences'
  | 'pricing_insights'
  | 'workflow_tips'
  | 'operator_notes';

export interface KnowledgeEntry {
  id?: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  confidence: number;
  source_reflection_id?: string;
  times_relevant: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// === Reflection ===

export interface ReflectionScores {
  deal_progression_score: number;
  domain_accuracy_score: number;
  proactive_sales_score: number;
  communication_score: number;
  scope_score: number;
  overall_score: number;
}

export type ReflectionAction =
  | 'none'
  | 'knowledge_update'
  | 'suggestion'
  | 'auto_update'
  | 'escalate';

export interface ReflectionLog {
  id?: string;
  conversations_analyzed: number;
  time_window_start: string;
  time_window_end: string;
  prompt_versions_evaluated?: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  patterns_noticed: string[];
  action_taken: ReflectionAction;
  suggestion_id?: string;
  new_prompt_version?: number;
  raw_analysis?: Record<string, unknown>;
  created_at?: string;
}

export type ReflectionLogWithScores = ReflectionLog & ReflectionScores;

// === Suggestions ===

export type SuggestionSeverity = 'minor' | 'medium' | 'major';
export type SuggestionType = 'prompt_change' | 'scenario_addition' | 'response_update';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'implemented';

export interface PromptSuggestion {
  id?: string;
  reflection_log_id?: string;
  severity: SuggestionSeverity;
  target_section: PromptSection;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  proposed_change?: string;
  status: SuggestionStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  implemented_in_version?: number;
  created_at?: string;
}

// === Workflow Stage Timestamps ===

export interface WorkflowStageTimestamp {
  id?: string;
  request_id: string;
  stage: string;
  entered_at: string;
  exited_at?: string;
  duration_ms?: number;
  previous_stage?: string;
}

// === Evaluation ===

export interface EvaluationRequest {
  conversations: ConversationForEval[];
  signals: AgentSignal[];
  workflow_outcomes: WorkflowOutcome[];
}

export interface ConversationForEval {
  conversation_id: string;
  messages: Array<{ role: string; content: string }>;
  workflow_stage: string;
  tool_calls: Array<{ name: string; success: boolean }>;
}

export interface WorkflowOutcome {
  request_id: string;
  final_stage: string;
  stage_timestamps: WorkflowStageTimestamp[];
  total_messages: number;
  deal_closed: boolean;
}

export interface EvaluationResult {
  scores: ReflectionScores;
  strengths: string[];
  weaknesses: string[];
  patterns_noticed: string[];
  suggested_improvements: SuggestedImprovement[];
}

export interface SuggestedImprovement {
  target_section: PromptSection;
  change_type: 'add' | 'modify' | 'remove';
  content: string;
  severity: SuggestionSeverity;
  reasoning: string;
}
```

**Step 2: Create the constants file**

```typescript
// lib/self-improvement/constants.ts

/** Minimum completed sessions before triggering reflection */
export const MIN_SESSIONS_FOR_REFLECTION = 10;

/** Minimum hours between reflections */
export const COOLDOWN_HOURS = 6;

/** Maximum auto-applied knowledge entries per day */
export const MAX_AUTO_UPDATES_PER_DAY = 3;

/** Score thresholds for deciding action */
export const THRESHOLDS = {
  excellent: 4.0,    // >= 4.0: no action needed
  suggestion: 3.0,   // >= 3.0: create suggestion for review
  autoUpdate: 2.0,   // >= 2.0: auto-update knowledge + suggest prompt
  escalate: 0,       // < 2.0: escalate to admin
} as const;

/** Rubric criteria weights (must sum to 1.0) */
export const RUBRIC_WEIGHTS = {
  deal_progression: 0.25,
  domain_accuracy: 0.25,
  proactive_sales: 0.25,
  communication: 0.15,
  scope: 0.10,
} as const;

/** Correction detection patterns */
export const CORRECTION_PATTERNS = [
  /\bno[,.]?\s+i\s+meant\b/i,
  /\bthat'?s\s+(wrong|incorrect|not\s+(right|what))\b/i,
  /\bi\s+said\b/i,
  /\bnot\s+\w+[,.]?\s+(i\s+want|i\s+need|i\s+meant)\b/i,
  /\bactually[,.]?\s+(i|it|the)\b/i,
  /\bplease?\s+(correct|fix|change)\s+that\b/i,
] as const;

/** Cache TTL for prompt versions (5 minutes) */
export const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000;
```

**Step 3: Create barrel export**

```typescript
// lib/self-improvement/index.ts
export * from './types';
export * from './constants';
```

**Step 4: Commit**

```bash
git add lib/self-improvement/types.ts lib/self-improvement/constants.ts lib/self-improvement/index.ts
git commit -m "feat(self-improvement): add types and constants for self-improving agent"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/040_self_improvement.sql`

**Step 1: Write the migration**

```sql
-- 040_self_improvement.sql
-- Self-improving agent: signal capture, reflection logs, knowledge base, prompt versioning

-- 1. System prompt versions (versioned, section-based)
CREATE TABLE IF NOT EXISTS system_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by TEXT DEFAULT 'system' CHECK (created_by IN ('system', 'human')),
  performance_score NUMERIC(3,2),
  change_reason TEXT,
  previous_version_id UUID REFERENCES system_prompt_versions(id),
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active version per section
CREATE UNIQUE INDEX IF NOT EXISTS idx_spv_active_section
  ON system_prompt_versions(section) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_spv_section_version
  ON system_prompt_versions(section, version DESC);

-- 2. Agent signals (implicit feedback)
CREATE TABLE IF NOT EXISTS agent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'correction', 'backtrack', 'drop_off', 'tool_retry',
    'slow_progression', 'deal_closed'
  )),
  signal_strength NUMERIC(3,2) CHECK (signal_strength BETWEEN -1.0 AND 1.0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_conversation ON agent_signals(conversation_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON agent_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_created ON agent_signals(created_at DESC);

-- 3. Reflection logs (AI evaluation results)
CREATE TABLE IF NOT EXISTS reflection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversations_analyzed INTEGER NOT NULL,
  time_window_start TIMESTAMPTZ NOT NULL,
  time_window_end TIMESTAMPTZ NOT NULL,
  prompt_versions_evaluated JSONB,
  deal_progression_score INTEGER CHECK (deal_progression_score BETWEEN 1 AND 5),
  domain_accuracy_score INTEGER CHECK (domain_accuracy_score BETWEEN 1 AND 5),
  proactive_sales_score INTEGER CHECK (proactive_sales_score BETWEEN 1 AND 5),
  communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
  scope_score INTEGER CHECK (scope_score BETWEEN 1 AND 5),
  overall_score NUMERIC(3,2),
  strengths TEXT[],
  weaknesses TEXT[],
  patterns_noticed TEXT[],
  action_taken TEXT CHECK (action_taken IN (
    'none', 'knowledge_update', 'suggestion', 'auto_update', 'escalate'
  )),
  suggestion_id UUID,
  new_prompt_version INTEGER,
  raw_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reflection_created ON reflection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflection_score ON reflection_logs(overall_score);

-- 4. Knowledge base (additive domain learnings)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'aircraft_patterns', 'client_preferences', 'pricing_insights',
    'workflow_tips', 'operator_notes'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0.0 AND 1.0),
  source_reflection_id UUID REFERENCES reflection_logs(id) ON DELETE SET NULL,
  times_relevant INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_active ON knowledge_base(is_active) WHERE is_active = true;

-- 5. Prompt suggestions (human approval queue)
CREATE TABLE IF NOT EXISTS prompt_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_log_id UUID REFERENCES reflection_logs(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'medium', 'major')),
  target_section TEXT NOT NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'prompt_change', 'scenario_addition', 'response_update'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_change TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'implemented'
  )),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  implemented_in_version INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_status ON prompt_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ps_severity ON prompt_suggestions(severity);

-- 6. Workflow stage timestamps (deal velocity tracking)
CREATE TABLE IF NOT EXISTS workflow_stage_timestamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_ms INTEGER,
  previous_stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wst_request ON workflow_stage_timestamps(request_id);
CREATE INDEX IF NOT EXISTS idx_wst_stage ON workflow_stage_timestamps(stage);

-- 7. RLS policies
ALTER TABLE system_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stage_timestamps ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes)
CREATE POLICY "service_role_all_spv" ON system_prompt_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_signals" ON agent_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_reflection" ON reflection_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kb" ON knowledge_base FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ps" ON prompt_suggestions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_wst" ON workflow_stage_timestamps FOR ALL USING (true) WITH CHECK (true);
```

**Step 2: Verify migration syntax**

Run: `npx supabase db lint --file supabase/migrations/040_self_improvement.sql` (or review manually since Supabase CLI may not be configured locally)

**Step 3: Commit**

```bash
git add supabase/migrations/040_self_improvement.sql
git commit -m "feat(self-improvement): add database migration for 6 self-improvement tables"
```

---

## Task 3: Signal Capture Service

**Files:**
- Create: `lib/self-improvement/signal-capture.ts`
- Test: `__tests__/unit/lib/self-improvement/signal-capture.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/unit/lib/self-improvement/signal-capture.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectCorrectionSignals,
  detectToolRetrySignals,
  detectWorkflowBacktrack,
  computeSignalStrength,
} from '@/lib/self-improvement/signal-capture';

describe('signal-capture', () => {
  describe('detectCorrectionSignals', () => {
    it('should detect "No, I meant" pattern', () => {
      const messages = [
        { role: 'assistant', content: 'I found flights from KLAS to KLAX.' },
        { role: 'user', content: 'No, I meant KTEB not KLAS.' },
      ];
      const signals = detectCorrectionSignals(messages, 'conv-123');
      expect(signals).toHaveLength(1);
      expect(signals[0].signal_type).toBe('correction');
      expect(signals[0].signal_strength).toBeLessThan(0);
    });

    it('should detect "that\'s wrong" pattern', () => {
      const messages = [
        { role: 'assistant', content: 'The flight is on March 15.' },
        { role: 'user', content: "That's wrong, the date is March 20." },
      ];
      const signals = detectCorrectionSignals(messages, 'conv-123');
      expect(signals).toHaveLength(1);
    });

    it('should return empty array for normal conversation', () => {
      const messages = [
        { role: 'user', content: 'I need a flight from KTEB to KLAX.' },
        { role: 'assistant', content: 'How many passengers?' },
        { role: 'user', content: '6 passengers, next Tuesday.' },
      ];
      const signals = detectCorrectionSignals(messages, 'conv-123');
      expect(signals).toHaveLength(0);
    });
  });

  describe('detectToolRetrySignals', () => {
    it('should detect same tool called with different params', () => {
      const toolResults = [
        { name: 'search_airports', success: true, input: { query: 'KLAS' } },
        { name: 'search_airports', success: true, input: { query: 'KTEB' } },
      ];
      const signals = detectToolRetrySignals(toolResults, 'conv-123');
      expect(signals).toHaveLength(1);
      expect(signals[0].signal_type).toBe('tool_retry');
    });

    it('should not flag different tools', () => {
      const toolResults = [
        { name: 'search_airports', success: true, input: { query: 'KTEB' } },
        { name: 'create_trip', success: true, input: { departure: 'KTEB' } },
      ];
      const signals = detectToolRetrySignals(toolResults, 'conv-123');
      expect(signals).toHaveLength(0);
    });
  });

  describe('detectWorkflowBacktrack', () => {
    it('should detect stage regression', () => {
      const signal = detectWorkflowBacktrack(
        'quotes_received',
        'trip_created',
        'conv-123'
      );
      expect(signal).not.toBeNull();
      expect(signal!.signal_type).toBe('backtrack');
    });

    it('should return null for forward progression', () => {
      const signal = detectWorkflowBacktrack(
        'trip_created',
        'quotes_received',
        'conv-123'
      );
      expect(signal).toBeNull();
    });
  });

  describe('computeSignalStrength', () => {
    it('should return negative for corrections', () => {
      expect(computeSignalStrength('correction')).toBeLessThan(0);
    });

    it('should return positive for deal_closed', () => {
      expect(computeSignalStrength('deal_closed')).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/self-improvement/signal-capture.test.ts`
Expected: FAIL - module not found

**Step 3: Implement signal capture**

```typescript
// lib/self-improvement/signal-capture.ts
import { CORRECTION_PATTERNS } from './constants';
import type { AgentSignal, SignalType } from './types';

/** Ordered workflow stages for regression detection */
const STAGE_ORDER = [
  'trip_created',
  'quotes_received',
  'proposal_ready',
  'proposal_sent',
  'contract_generated',
  'contract_sent',
  'payment_received',
  'closed_won',
  'deal_closed',
];

interface MessageForSignal {
  role: string;
  content: string;
  id?: string;
}

interface ToolResultForSignal {
  name: string;
  success: boolean;
  input?: Record<string, unknown>;
}

/**
 * Detect correction signals from user messages.
 * Scans for patterns like "No, I meant...", "That's wrong", etc.
 */
export function detectCorrectionSignals(
  messages: MessageForSignal[],
  conversationId: string
): AgentSignal[] {
  const signals: AgentSignal[] = [];

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== 'user') continue;

    const isCorrection = CORRECTION_PATTERNS.some((pattern) =>
      pattern.test(msg.content)
    );

    if (isCorrection) {
      signals.push({
        conversation_id: conversationId,
        message_id: msg.id,
        signal_type: 'correction',
        signal_strength: computeSignalStrength('correction'),
        metadata: {
          user_message: msg.content.slice(0, 200),
          previous_assistant_message: messages[i - 1]?.content?.slice(0, 200),
        },
      });
    }
  }

  return signals;
}

/**
 * Detect tool retry signals (same tool called twice with different params in one turn).
 */
export function detectToolRetrySignals(
  toolResults: ToolResultForSignal[],
  conversationId: string
): AgentSignal[] {
  const signals: AgentSignal[] = [];
  const toolCalls = new Map<string, Record<string, unknown>>();

  for (const tr of toolResults) {
    const prevInput = toolCalls.get(tr.name);
    if (prevInput) {
      const inputChanged =
        JSON.stringify(prevInput) !== JSON.stringify(tr.input);
      if (inputChanged) {
        signals.push({
          conversation_id: conversationId,
          signal_type: 'tool_retry',
          signal_strength: computeSignalStrength('tool_retry'),
          metadata: {
            tool_name: tr.name,
            first_input: prevInput,
            second_input: tr.input,
          },
        });
      }
    }
    toolCalls.set(tr.name, tr.input || {});
  }

  return signals;
}

/**
 * Detect workflow stage backtracking (regression).
 * Returns a signal if previousStage is further along than currentStage.
 */
export function detectWorkflowBacktrack(
  previousStage: string | undefined,
  currentStage: string | undefined,
  conversationId: string
): AgentSignal | null {
  if (!previousStage || !currentStage) return null;

  const prevIdx = STAGE_ORDER.indexOf(previousStage);
  const currIdx = STAGE_ORDER.indexOf(currentStage);

  if (prevIdx === -1 || currIdx === -1) return null;
  if (currIdx >= prevIdx) return null; // forward or same = ok

  return {
    conversation_id: conversationId,
    signal_type: 'backtrack',
    signal_strength: computeSignalStrength('backtrack'),
    metadata: {
      from_stage: previousStage,
      to_stage: currentStage,
      stages_regressed: prevIdx - currIdx,
    },
  };
}

/**
 * Compute default signal strength for a given signal type.
 */
export function computeSignalStrength(signalType: SignalType): number {
  switch (signalType) {
    case 'correction':
      return -0.7;
    case 'backtrack':
      return -0.8;
    case 'drop_off':
      return -0.5;
    case 'tool_retry':
      return -0.4;
    case 'slow_progression':
      return -0.3;
    case 'deal_closed':
      return 1.0;
    default:
      return 0;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/self-improvement/signal-capture.test.ts`
Expected: PASS

**Step 5: Update barrel export**

Add to `lib/self-improvement/index.ts`:
```typescript
export * from './signal-capture';
```

**Step 6: Commit**

```bash
git add lib/self-improvement/signal-capture.ts __tests__/unit/lib/self-improvement/signal-capture.test.ts lib/self-improvement/index.ts
git commit -m "feat(self-improvement): add implicit signal capture with correction, retry, and backtrack detection"
```

---

## Task 4: Signal Persistence Service

**Files:**
- Create: `lib/self-improvement/signal-persistence.ts`
- Test: `__tests__/unit/lib/self-improvement/signal-persistence.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/unit/lib/self-improvement/signal-persistence.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase admin before importing
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    upsert: vi.fn().mockReturnThis(),
  },
}));

import {
  saveSignals,
  recordStageTransition,
  getSignalsSinceLastReflection,
} from '@/lib/self-improvement/signal-persistence';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AgentSignal } from '@/lib/self-improvement/types';

describe('signal-persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveSignals', () => {
    it('should insert signals into agent_signals table', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

      const signals: AgentSignal[] = [
        {
          conversation_id: 'conv-123',
          signal_type: 'correction',
          signal_strength: -0.7,
        },
      ];

      await saveSignals(signals);
      expect(mockFrom).toHaveBeenCalledWith('agent_signals');
    });

    it('should skip empty signal array', async () => {
      await saveSignals([]);
      expect(supabaseAdmin.from).not.toHaveBeenCalled();
    });
  });

  describe('recordStageTransition', () => {
    it('should close previous stage and open new one', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

      await recordStageTransition('req-123', 'quotes_received', 'trip_created');
      expect(mockFrom).toHaveBeenCalledWith('workflow_stage_timestamps');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/self-improvement/signal-persistence.test.ts`
Expected: FAIL - module not found

**Step 3: Implement signal persistence**

```typescript
// lib/self-improvement/signal-persistence.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AgentSignal } from './types';

/**
 * Persist detected signals to the agent_signals table.
 */
export async function saveSignals(signals: AgentSignal[]): Promise<void> {
  if (signals.length === 0) return;

  const { error } = await supabaseAdmin
    .from('agent_signals')
    .insert(signals);

  if (error) {
    console.error('[Self-Improvement] Failed to save signals:', error.message);
  }
}

/**
 * Record a workflow stage transition with timestamps.
 * Closes the previous stage and opens the new one.
 */
export async function recordStageTransition(
  requestId: string,
  newStage: string,
  previousStage?: string
): Promise<void> {
  const now = new Date().toISOString();

  // Close the previous stage entry (set exited_at and compute duration)
  if (previousStage) {
    await supabaseAdmin
      .from('workflow_stage_timestamps')
      .update({
        exited_at: now,
        duration_ms: supabaseAdmin.rpc
          ? undefined // compute in DB if possible
          : undefined,
      })
      .eq('request_id', requestId)
      .eq('stage', previousStage)
      .is('exited_at', null);
  }

  // Insert the new stage entry
  const { error } = await supabaseAdmin
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
 */
export async function getSignalsSinceLastReflection(): Promise<AgentSignal[]> {
  // Find last reflection timestamp
  const { data: lastReflection } = await supabaseAdmin
    .from('reflection_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const since = lastReflection?.created_at || '2000-01-01T00:00:00Z';

  const { data, error } = await supabaseAdmin
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
 * Count completed sessions (archived or closed_won) since the last reflection.
 */
export async function countCompletedSessionsSinceLastReflection(): Promise<number> {
  const { data: lastReflection } = await supabaseAdmin
    .from('reflection_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const since = lastReflection?.created_at || '2000-01-01T00:00:00Z';

  const { count, error } = await supabaseAdmin
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/self-improvement/signal-persistence.test.ts`
Expected: PASS

**Step 5: Update barrel export**

Add to `lib/self-improvement/index.ts`:
```typescript
export * from './signal-persistence';
```

**Step 6: Commit**

```bash
git add lib/self-improvement/signal-persistence.ts __tests__/unit/lib/self-improvement/signal-persistence.test.ts lib/self-improvement/index.ts
git commit -m "feat(self-improvement): add signal persistence and workflow stage timestamp tracking"
```

---

## Task 5: Integrate Signal Capture into Chat API

**Files:**
- Modify: `app/api/chat/route.ts` (lines 395-446 and 599-603)

**Step 1: Add imports at top of route.ts**

At the top of `app/api/chat/route.ts`, add:
```typescript
import {
  detectCorrectionSignals,
  detectToolRetrySignals,
  detectWorkflowBacktrack,
} from '@/lib/self-improvement/signal-capture';
import {
  saveSignals,
  recordStageTransition,
} from '@/lib/self-improvement/signal-persistence';
```

**Step 2: Add signal capture after working memory update (after line 446)**

Insert after the existing working memory update loop (line 446), before the rfpData capture (line 448):

```typescript
    // 7c. Capture implicit signals (self-improvement)
    try {
      const allSignals = [
        ...detectCorrectionSignals(
          conversationHistory.map((m) => ({ role: m.role, content: m.content })),
          conversationId
        ),
        ...detectToolRetrySignals(
          result.toolResults.map((tr) => ({
            name: tr.name as string,
            success: tr.success,
            input: tr.input as Record<string, unknown>,
          })),
          conversationId
        ),
      ];

      // Detect workflow backtracking
      const previousStage = previousWorkflowStage; // capture before update loop
      const currentStage = workingMemory.workflowStage as string | undefined;
      const backtrackSignal = detectWorkflowBacktrack(
        previousStage,
        currentStage,
        conversationId
      );
      if (backtrackSignal) allSignals.push(backtrackSignal);

      // Save signals (fire-and-forget, don't block response)
      if (allSignals.length > 0) {
        saveSignals(allSignals).catch((err) =>
          console.error('[Chat API] Signal save failed:', err)
        );
      }
    } catch (signalError) {
      // Signal capture must never break chat
      console.error('[Chat API] Signal capture error:', signalError);
    }
```

**Step 3: Capture previousWorkflowStage before the update loop**

Insert at line 394 (just before the working memory update loop):

```typescript
    const previousWorkflowStage = workingMemory.workflowStage as string | undefined;
```

**Step 4: Add stage transition recording after working memory persist (after line 603)**

Insert after the `workflow_state` persist (line 603):

```typescript
    // 8c. Record workflow stage transition for deal velocity tracking
    const newStage = workingMemory.workflowStage as string | undefined;
    if (newStage && newStage !== previousWorkflowStage) {
      recordStageTransition(conversationId, newStage, previousWorkflowStage).catch(
        (err) => console.error('[Chat API] Stage transition record failed:', err)
      );
    }
```

**Step 5: Run the app and verify no regressions**

Run: `npm run dev:app` and send a test message through the chat to confirm no errors.

**Step 6: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(self-improvement): integrate signal capture into chat API route"
```

---

## Task 6: Charter Aviation Rubric

**Files:**
- Create: `lib/self-improvement/rubric.ts`
- Test: `__tests__/unit/lib/self-improvement/rubric.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/unit/lib/self-improvement/rubric.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeOverallScore,
  getEvaluatorSystemPrompt,
  formatEvaluationRequest,
} from '@/lib/self-improvement/rubric';
import type { ReflectionScores, ConversationForEval } from '@/lib/self-improvement/types';

describe('rubric', () => {
  describe('computeOverallScore', () => {
    it('should compute weighted average', () => {
      const scores: ReflectionScores = {
        deal_progression_score: 4,
        domain_accuracy_score: 4,
        proactive_sales_score: 4,
        communication_score: 4,
        scope_score: 4,
        overall_score: 0, // will be computed
      };
      const result = computeOverallScore(scores);
      expect(result).toBeCloseTo(4.0, 1);
    });

    it('should weight deal progression higher than scope', () => {
      const highDeal: ReflectionScores = {
        deal_progression_score: 5,
        domain_accuracy_score: 3,
        proactive_sales_score: 3,
        communication_score: 3,
        scope_score: 1,
        overall_score: 0,
      };
      const highScope: ReflectionScores = {
        deal_progression_score: 1,
        domain_accuracy_score: 3,
        proactive_sales_score: 3,
        communication_score: 3,
        scope_score: 5,
        overall_score: 0,
      };
      expect(computeOverallScore(highDeal)).toBeGreaterThan(
        computeOverallScore(highScope)
      );
    });
  });

  describe('getEvaluatorSystemPrompt', () => {
    it('should return non-empty string with rubric criteria', () => {
      const prompt = getEvaluatorSystemPrompt();
      expect(prompt).toContain('Deal Progression');
      expect(prompt).toContain('Domain Accuracy');
      expect(prompt).toContain('Proactive Sales');
      expect(prompt).toContain('charter');
    });
  });

  describe('formatEvaluationRequest', () => {
    it('should format conversations for evaluation', () => {
      const convos: ConversationForEval[] = [
        {
          conversation_id: 'c1',
          messages: [
            { role: 'user', content: 'I need a flight' },
            { role: 'assistant', content: 'Where to?' },
          ],
          workflow_stage: 'trip_created',
          tool_calls: [{ name: 'create_trip', success: true }],
        },
      ];
      const result = formatEvaluationRequest(convos, [], []);
      expect(result).toContain('Conversation 1');
      expect(result).toContain('I need a flight');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/self-improvement/rubric.test.ts`
Expected: FAIL

**Step 3: Implement rubric**

```typescript
// lib/self-improvement/rubric.ts
import { RUBRIC_WEIGHTS } from './constants';
import type {
  ReflectionScores,
  ConversationForEval,
  AgentSignal,
  WorkflowOutcome,
} from './types';

/**
 * Compute weighted overall score from individual criteria scores.
 */
export function computeOverallScore(scores: ReflectionScores): number {
  const weighted =
    scores.deal_progression_score * RUBRIC_WEIGHTS.deal_progression +
    scores.domain_accuracy_score * RUBRIC_WEIGHTS.domain_accuracy +
    scores.proactive_sales_score * RUBRIC_WEIGHTS.proactive_sales +
    scores.communication_score * RUBRIC_WEIGHTS.communication +
    scores.scope_score * RUBRIC_WEIGHTS.scope;

  return Math.round(weighted * 100) / 100;
}

/**
 * Get the evaluator system prompt for AI-as-Judge.
 */
export function getEvaluatorSystemPrompt(): string {
  return `You are a senior charter aviation broker with 15 years of experience evaluating an AI sales assistant.
Your job is to score the AI's responses with extremely high standards. A good charter broker anticipates client needs, knows aircraft categories cold, and always moves deals forward.

## Evaluation Criteria

### 1. Deal Progression (25%)
Did the agent advance the workflow toward closing the deal?
- 5: Efficiently progressed (flight request → trip creation → quotes in minimal turns)
- 4: Progressed but with unnecessary back-and-forth
- 3: Created trip but missed asking about return leg or special requirements
- 2: Got stuck in information gathering, never progressed to trip creation
- 1: Misinterpreted request, searched wrong airports or dates

### 2. Domain Accuracy (25%)
Did the agent use correct charter aviation knowledge?
- 5: Correct aircraft categories for route/pax, proper FBO awareness, accurate terminology
- 4: Mostly accurate with minor terminology issues
- 3: Correct basics but missed important charter nuances (e.g., segment counting)
- 2: Recommended inappropriate aircraft category for the route
- 1: Fundamentally wrong aviation information

### 3. Proactive Sales Behavior (25%)
Did the agent act like a skilled broker who adds value?
- 5: Flagged repositioning discounts, suggested catering for VIP, noted FBO limitations, mentioned WiFi-equipped options
- 4: Mentioned one relevant upsell or consideration
- 3: Presented quotes accurately but added no broker insight
- 2: Missed obvious red flags (tight connections, elderly passengers on long flights)
- 1: Made recommendations that could lose the deal

### 4. Communication Quality (15%)
Was the tone appropriate for luxury aviation sales?
- 5: Professional, concise, confident without being pushy
- 4: Appropriate with minor tone mismatches
- 3: Generic but acceptable
- 2: Too verbose, too casual, or too robotic for the context
- 1: Inappropriate tone for high-value client interaction

### 5. Scope (10%)
Did the agent stay focused on the task at hand?
- 5: Answered exactly what was needed with appropriate context
- 4: Slightly more info than needed but still useful
- 3: Included unnecessary information
- 2: Went on tangents or repeated information unnecessarily
- 1: Off-topic or addressed the wrong request

## Output Format
Respond with valid JSON only:
{
  "scores": {
    "deal_progression": <1-5>,
    "domain_accuracy": <1-5>,
    "proactive_sales": <1-5>,
    "communication": <1-5>,
    "scope": <1-5>
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "patterns_noticed": ["<pattern 1>"],
  "suggested_improvements": [
    {
      "target_section": "scenario_handlers" | "response_formats",
      "change_type": "add" | "modify" | "remove",
      "content": "<what to add/change>",
      "severity": "minor" | "medium" | "major",
      "reasoning": "<why this change would help>"
    }
  ]
}`;
}

/**
 * Format conversations, signals, and outcomes into an evaluation request string.
 */
export function formatEvaluationRequest(
  conversations: ConversationForEval[],
  signals: AgentSignal[],
  outcomes: WorkflowOutcome[]
): string {
  const parts: string[] = [];

  // Format conversations
  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    parts.push(`## Conversation ${i + 1} (${conv.conversation_id})`);
    parts.push(`Workflow stage reached: ${conv.workflow_stage}`);
    parts.push(`Tools called: ${conv.tool_calls.map((t) => `${t.name}(${t.success ? 'ok' : 'fail'})`).join(', ')}`);
    parts.push('');
    for (const msg of conv.messages) {
      parts.push(`**${msg.role}**: ${msg.content}`);
    }
    parts.push('---');
  }

  // Format signals summary
  if (signals.length > 0) {
    parts.push('## Implicit Signals Detected');
    const signalCounts = new Map<string, number>();
    for (const s of signals) {
      signalCounts.set(s.signal_type, (signalCounts.get(s.signal_type) || 0) + 1);
    }
    for (const [type, count] of signalCounts) {
      parts.push(`- ${type}: ${count} occurrences`);
    }
    parts.push('');
  }

  // Format outcomes
  if (outcomes.length > 0) {
    parts.push('## Workflow Outcomes');
    const closed = outcomes.filter((o) => o.deal_closed).length;
    const abandoned = outcomes.length - closed;
    parts.push(`- Deals closed: ${closed}/${outcomes.length}`);
    parts.push(`- Sessions abandoned: ${abandoned}`);
    const avgMessages =
      outcomes.reduce((sum, o) => sum + o.total_messages, 0) / outcomes.length;
    parts.push(`- Average messages per session: ${avgMessages.toFixed(1)}`);
  }

  return parts.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/self-improvement/rubric.test.ts`
Expected: PASS

**Step 5: Update barrel export and commit**

```bash
git add lib/self-improvement/rubric.ts __tests__/unit/lib/self-improvement/rubric.test.ts lib/self-improvement/index.ts
git commit -m "feat(self-improvement): add charter aviation evaluation rubric with weighted scoring"
```

---

## Task 7: Knowledge Base Service

**Files:**
- Create: `lib/self-improvement/knowledge-base.ts`
- Test: `__tests__/unit/lib/self-improvement/knowledge-base.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/unit/lib/self-improvement/knowledge-base.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { renderKnowledgeBase, addKnowledgeEntry, canAutoUpdate } from '@/lib/self-improvement/knowledge-base';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { KnowledgeEntry } from '@/lib/self-improvement/types';

describe('knowledge-base', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renderKnowledgeBase', () => {
    it('should format entries by category', () => {
      const entries: KnowledgeEntry[] = [
        {
          category: 'aircraft_patterns',
          title: 'Heavy jets for KTEB-TNCM',
          content: 'Winter flights KTEB→TNCM: clients prefer heavy jets with WiFi.',
          confidence: 0.85,
          times_relevant: 3,
          is_active: true,
        },
        {
          category: 'workflow_tips',
          title: 'Always ask about pets for Aspen',
          content: 'Flights to KASE: always ask about pet travel.',
          confidence: 0.9,
          times_relevant: 5,
          is_active: true,
        },
      ];
      const rendered = renderKnowledgeBase(entries);
      expect(rendered).toContain('## Learned Patterns');
      expect(rendered).toContain('Aircraft Patterns');
      expect(rendered).toContain('heavy jets with WiFi');
      expect(rendered).toContain('Workflow Tips');
    });

    it('should return empty string for no entries', () => {
      expect(renderKnowledgeBase([])).toBe('');
    });
  });

  describe('canAutoUpdate', () => {
    it('should return false when daily limit reached', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      });
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

      const result = await canAutoUpdate();
      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run test, verify fail, then implement**

```typescript
// lib/self-improvement/knowledge-base.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MAX_AUTO_UPDATES_PER_DAY } from './constants';
import type { KnowledgeEntry, KnowledgeCategory } from './types';

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  aircraft_patterns: 'Aircraft Patterns',
  client_preferences: 'Client Preferences',
  pricing_insights: 'Pricing Insights',
  workflow_tips: 'Workflow Tips',
  operator_notes: 'Operator Notes',
};

/**
 * Render active knowledge base entries into a prompt section.
 */
export function renderKnowledgeBase(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return '';

  const byCategory = new Map<KnowledgeCategory, KnowledgeEntry[]>();
  for (const entry of entries) {
    const cat = entry.category as KnowledgeCategory;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(entry);
  }

  const sections: string[] = ['## Learned Patterns\n'];

  for (const [category, items] of byCategory) {
    sections.push(`### ${CATEGORY_LABELS[category] || category}`);
    for (const item of items) {
      sections.push(`- **${item.title}**: ${item.content}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Fetch all active knowledge base entries from the database.
 */
export async function getActiveKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('knowledge_base')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('times_relevant', { ascending: false });

  if (error) {
    console.error('[Self-Improvement] Failed to fetch knowledge base:', error.message);
    return [];
  }

  return (data || []) as KnowledgeEntry[];
}

/**
 * Add a new entry to the knowledge base.
 */
export async function addKnowledgeEntry(
  entry: Omit<KnowledgeEntry, 'id' | 'times_relevant' | 'is_active' | 'created_at' | 'updated_at'>
): Promise<KnowledgeEntry | null> {
  const { data, error } = await supabaseAdmin
    .from('knowledge_base')
    .insert({
      ...entry,
      times_relevant: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[Self-Improvement] Failed to add knowledge entry:', error.message);
    return null;
  }

  return data as KnowledgeEntry;
}

/**
 * Check if we can auto-update today (haven't exceeded daily limit).
 */
export async function canAutoUpdate(): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString());

  if (error) {
    console.error('[Self-Improvement] Failed to check auto-update limit:', error.message);
    return false;
  }

  return (count || 0) < MAX_AUTO_UPDATES_PER_DAY;
}
```

**Step 3: Run tests, update exports, commit**

```bash
git add lib/self-improvement/knowledge-base.ts __tests__/unit/lib/self-improvement/knowledge-base.test.ts lib/self-improvement/index.ts
git commit -m "feat(self-improvement): add knowledge base service with rendering and auto-update limits"
```

---

## Task 8: Prompt Version Manager

**Files:**
- Create: `lib/self-improvement/prompt-version-manager.ts`
- Test: `__tests__/unit/lib/self-improvement/prompt-version-manager.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/unit/lib/self-improvement/prompt-version-manager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import {
  getActivePromptSection,
  createPromptVersion,
  rollbackPromptVersion,
  PromptCache,
} from '@/lib/self-improvement/prompt-version-manager';

describe('prompt-version-manager', () => {
  describe('PromptCache', () => {
    it('should return cached value within TTL', () => {
      const cache = new PromptCache(1000);
      cache.set('scenario_handlers', 'cached content');
      expect(cache.get('scenario_handlers')).toBe('cached content');
    });

    it('should return null for expired cache', async () => {
      const cache = new PromptCache(10); // 10ms TTL
      cache.set('scenario_handlers', 'cached content');
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(cache.get('scenario_handlers')).toBeNull();
    });
  });
});
```

**Step 2: Implement prompt version manager**

```typescript
// lib/self-improvement/prompt-version-manager.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PROMPT_CACHE_TTL_MS } from './constants';
import type { PromptSection, SystemPromptVersion } from './types';

/**
 * Simple in-memory cache with TTL for prompt sections.
 */
export class PromptCache {
  private cache = new Map<string, { value: string; expiry: number }>();
  private ttl: number;

  constructor(ttlMs: number = PROMPT_CACHE_TTL_MS) {
    this.ttl = ttlMs;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string): void {
    this.cache.set(key, { value, expiry: Date.now() + this.ttl });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton cache instance
const promptCache = new PromptCache();

/**
 * Get the active prompt content for a section.
 * Uses in-memory cache with 5-minute TTL.
 * Returns null if no active version exists (caller should use hardcoded fallback).
 */
export async function getActivePromptSection(
  section: PromptSection
): Promise<string | null> {
  // Check cache first
  const cached = promptCache.get(section);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from('system_prompt_versions')
    .select('content')
    .eq('section', section)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null; // Caller uses hardcoded fallback
  }

  promptCache.set(section, data.content);
  return data.content;
}

/**
 * Create a new prompt version for a section.
 * Deactivates the current version and activates the new one.
 */
export async function createPromptVersion(
  section: PromptSection,
  content: string,
  changeReason: string,
  createdBy: 'system' | 'human' = 'system'
): Promise<SystemPromptVersion | null> {
  // Get current active version
  const { data: current } = await supabaseAdmin
    .from('system_prompt_versions')
    .select('id, version, locked')
    .eq('section', section)
    .eq('is_active', true)
    .single();

  // Don't modify locked prompts
  if (current?.locked) {
    console.warn(`[Self-Improvement] Prompt section "${section}" is locked, skipping update`);
    return null;
  }

  const newVersion = (current?.version || 0) + 1;

  // Deactivate current
  if (current) {
    await supabaseAdmin
      .from('system_prompt_versions')
      .update({ is_active: false })
      .eq('id', current.id);
  }

  // Insert new version
  const { data: newPrompt, error } = await supabaseAdmin
    .from('system_prompt_versions')
    .insert({
      version: newVersion,
      section,
      content,
      is_active: true,
      created_by: createdBy,
      change_reason: changeReason,
      previous_version_id: current?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[Self-Improvement] Failed to create prompt version:', error.message);
    // Attempt to reactivate old version
    if (current) {
      await supabaseAdmin
        .from('system_prompt_versions')
        .update({ is_active: true })
        .eq('id', current.id);
    }
    return null;
  }

  // Clear cache for this section
  promptCache.clear();

  return newPrompt as SystemPromptVersion;
}

/**
 * Rollback to a specific version.
 */
export async function rollbackPromptVersion(
  section: PromptSection,
  targetVersionId: string
): Promise<boolean> {
  // Deactivate current
  await supabaseAdmin
    .from('system_prompt_versions')
    .update({ is_active: false })
    .eq('section', section)
    .eq('is_active', true);

  // Activate target
  const { error } = await supabaseAdmin
    .from('system_prompt_versions')
    .update({ is_active: true })
    .eq('id', targetVersionId);

  if (error) {
    console.error('[Self-Improvement] Rollback failed:', error.message);
    return false;
  }

  promptCache.clear();
  return true;
}

/** Export cache for testing */
export { promptCache };
```

**Step 3: Run tests, commit**

```bash
git add lib/self-improvement/prompt-version-manager.ts __tests__/unit/lib/self-improvement/prompt-version-manager.test.ts lib/self-improvement/index.ts
git commit -m "feat(self-improvement): add prompt version manager with cache and rollback"
```

---

## Task 9: Refactor System Prompt to Dynamic Rendering

**Files:**
- Modify: `lib/prompts/jetvision-system-prompt.ts` (lines 1154-1181)

**Step 1: Add imports**

At top of `lib/prompts/jetvision-system-prompt.ts`:
```typescript
import { getActivePromptSection } from '@/lib/self-improvement/prompt-version-manager';
import { getActiveKnowledgeEntries } from '@/lib/self-improvement/knowledge-base';
import { renderKnowledgeBase } from '@/lib/self-improvement/knowledge-base';
```

**Step 2: Add async buildDynamicSystemPrompt function**

Add after `buildCompleteSystemPrompt()` (line 1181):

```typescript
/**
 * Build system prompt with dynamic sections from database.
 * Falls back to hardcoded sections if DB fetch fails.
 * This is the self-improving variant that pulls versioned prompt sections.
 */
export async function buildDynamicSystemPrompt(
  workingMemory?: Record<string, unknown> | null
): Promise<string> {
  // Attempt to load versioned sections; fallback to hardcoded
  const scenarioHandlers =
    (await getActivePromptSection('scenario_handlers')) || SCENARIO_HANDLERS;
  const responseFormats =
    (await getActivePromptSection('response_formats')) || RESPONSE_FORMATS;

  // Load knowledge base entries
  let knowledgeSection = '';
  try {
    const entries = await getActiveKnowledgeEntries();
    knowledgeSection = renderKnowledgeBase(entries);
  } catch {
    // Knowledge base is optional, don't break if it fails
  }

  const sections = [
    IDENTITY,          // Locked: never modified by system
    TOOL_REFERENCE,    // Locked
    scenarioHandlers,  // Versioned, modifiable
    responseFormats,   // Versioned, modifiable
    CONTEXT_RULES,     // Locked
    ERROR_HANDLING,    // Locked
    AIRPORT_REFERENCE, // Locked
  ];

  if (knowledgeSection) {
    sections.push(knowledgeSection);
  }

  const memoryBlock = renderWorkingMemory(workingMemory);
  if (memoryBlock) {
    sections.push(memoryBlock);
  }

  return sections.join('\n\n---\n\n');
}
```

**Step 3: Keep existing functions unchanged (backward compatibility)**

The existing `buildCompleteSystemPrompt()` and `buildSystemPromptWithWorkingMemory()` remain untouched as synchronous fallbacks. The new `buildDynamicSystemPrompt()` is opt-in.

**Step 4: Verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 5: Commit**

```bash
git add lib/prompts/jetvision-system-prompt.ts
git commit -m "feat(self-improvement): add buildDynamicSystemPrompt with versioned sections and knowledge base"
```

---

## Task 10: AI Evaluator (LLM-as-Judge)

**Files:**
- Create: `lib/self-improvement/evaluator.ts`
- Test: `__tests__/unit/lib/self-improvement/evaluator.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/unit/lib/self-improvement/evaluator.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  scores: {
                    deal_progression: 4,
                    domain_accuracy: 3,
                    proactive_sales: 4,
                    communication: 4,
                    scope: 5,
                  },
                  strengths: ['Good deal flow'],
                  weaknesses: ['Missed upsell'],
                  patterns_noticed: ['Pattern A'],
                  suggested_improvements: [],
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

import { evaluateConversations } from '@/lib/self-improvement/evaluator';
import type { EvaluationRequest } from '@/lib/self-improvement/types';

describe('evaluator', () => {
  it('should parse LLM evaluation response into typed result', async () => {
    const request: EvaluationRequest = {
      conversations: [
        {
          conversation_id: 'c1',
          messages: [{ role: 'user', content: 'test' }],
          workflow_stage: 'trip_created',
          tool_calls: [],
        },
      ],
      signals: [],
      workflow_outcomes: [],
    };

    const result = await evaluateConversations(request);
    expect(result.scores.deal_progression_score).toBe(4);
    expect(result.strengths).toContain('Good deal flow');
    expect(result.weaknesses).toContain('Missed upsell');
  });
});
```

**Step 2: Implement evaluator**

```typescript
// lib/self-improvement/evaluator.ts
import OpenAI from 'openai';
import { getEvaluatorSystemPrompt, formatEvaluationRequest, computeOverallScore } from './rubric';
import type { EvaluationRequest, EvaluationResult, ReflectionScores } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Evaluate a batch of conversations using AI-as-Judge.
 * Sends conversations, signals, and outcomes to an LLM with the charter aviation rubric.
 */
export async function evaluateConversations(
  request: EvaluationRequest
): Promise<EvaluationResult> {
  const systemPrompt = getEvaluatorSystemPrompt();
  const userContent = formatEvaluationRequest(
    request.conversations,
    request.signals,
    request.workflow_outcomes
  );

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    temperature: 0.3, // Low temp for consistent scoring
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Evaluate the following ${request.conversations.length} conversations:\n\n${userContent}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from evaluator LLM');
  }

  const parsed = JSON.parse(content);

  const scores: ReflectionScores = {
    deal_progression_score: parsed.scores.deal_progression,
    domain_accuracy_score: parsed.scores.domain_accuracy,
    proactive_sales_score: parsed.scores.proactive_sales,
    communication_score: parsed.scores.communication,
    scope_score: parsed.scores.scope,
    overall_score: 0,
  };
  scores.overall_score = computeOverallScore(scores);

  return {
    scores,
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    patterns_noticed: parsed.patterns_noticed || [],
    suggested_improvements: parsed.suggested_improvements || [],
  };
}
```

**Step 3: Run tests, commit**

```bash
git add lib/self-improvement/evaluator.ts __tests__/unit/lib/self-improvement/evaluator.test.ts lib/self-improvement/index.ts
git commit -m "feat(self-improvement): add AI evaluator (LLM-as-Judge) with charter aviation rubric"
```

---

## Task 11: Reflection Engine

**Files:**
- Create: `lib/self-improvement/reflection-engine.ts`
- Test: `__tests__/unit/lib/self-improvement/reflection-engine.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/unit/lib/self-improvement/reflection-engine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decideAction } from '@/lib/self-improvement/reflection-engine';
import type { ReflectionScores } from '@/lib/self-improvement/types';

describe('reflection-engine', () => {
  describe('decideAction', () => {
    it('should return "none" for scores >= 4.0', () => {
      expect(decideAction(4.2)).toBe('none');
    });

    it('should return "suggestion" for scores 3.0-3.9', () => {
      expect(decideAction(3.5)).toBe('suggestion');
    });

    it('should return "auto_update" for scores 2.0-2.9', () => {
      expect(decideAction(2.5)).toBe('auto_update');
    });

    it('should return "escalate" for scores < 2.0', () => {
      expect(decideAction(1.5)).toBe('escalate');
    });
  });
});
```

**Step 2: Implement reflection engine**

```typescript
// lib/self-improvement/reflection-engine.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  MIN_SESSIONS_FOR_REFLECTION,
  COOLDOWN_HOURS,
  THRESHOLDS,
} from './constants';
import { countCompletedSessionsSinceLastReflection, getSignalsSinceLastReflection } from './signal-persistence';
import { evaluateConversations } from './evaluator';
import { addKnowledgeEntry, canAutoUpdate } from './knowledge-base';
import { createPromptVersion } from './prompt-version-manager';
import type {
  ReflectionAction,
  ReflectionLogWithScores,
  ConversationForEval,
  WorkflowOutcome,
  EvaluationResult,
} from './types';

/**
 * Decide what action to take based on overall score.
 */
export function decideAction(overallScore: number): ReflectionAction {
  if (overallScore >= THRESHOLDS.excellent) return 'none';
  if (overallScore >= THRESHOLDS.suggestion) return 'suggestion';
  if (overallScore >= THRESHOLDS.autoUpdate) return 'auto_update';
  return 'escalate';
}

/**
 * Check if reflection can run (cooldown + minimum sessions).
 */
export async function canRunReflection(): Promise<{
  canRun: boolean;
  reason?: string;
}> {
  // Check cooldown
  const { data: lastReflection } = await supabaseAdmin
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
      return { canRun: false, reason: `cooldown (${hoursSince.toFixed(1)}h < ${COOLDOWN_HOURS}h)` };
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
 */
async function gatherConversations(): Promise<ConversationForEval[]> {
  const { data: lastReflection } = await supabaseAdmin
    .from('reflection_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const since = lastReflection?.created_at || '2000-01-01T00:00:00Z';

  // Get recent completed sessions
  const { data: requests } = await supabaseAdmin
    .from('requests')
    .select('id, workflow_state, session_status')
    .in('session_status', ['archived'])
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (!requests || requests.length === 0) return [];

  const conversations: ConversationForEval[] = [];

  for (const req of requests) {
    const { data: messages } = await supabaseAdmin
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
      tool_calls: [], // Could be extracted from message metadata if needed
    });
  }

  return conversations;
}

/**
 * Gather workflow outcomes for evaluated conversations.
 */
async function gatherOutcomes(
  conversationIds: string[]
): Promise<WorkflowOutcome[]> {
  const outcomes: WorkflowOutcome[] = [];

  for (const id of conversationIds) {
    const { data: timestamps } = await supabaseAdmin
      .from('workflow_stage_timestamps')
      .select('*')
      .eq('request_id', id)
      .order('entered_at', { ascending: true });

    const { count: msgCount } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', id);

    const { data: req } = await supabaseAdmin
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
 */
async function applyImprovements(
  evaluation: EvaluationResult,
  action: ReflectionAction,
  reflectionLogId: string
): Promise<void> {
  for (const improvement of evaluation.suggested_improvements) {
    if (improvement.severity === 'minor' && action === 'auto_update') {
      // Auto-apply as knowledge base entry
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
      // Create suggestion for human review
      await supabaseAdmin.from('prompt_suggestions').insert({
        reflection_log_id: reflectionLogId,
        severity: improvement.severity,
        target_section: improvement.target_section,
        suggestion_type: improvement.change_type === 'add' ? 'scenario_addition' : 'prompt_change',
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
  const { data: reflectionLog, error } = await supabaseAdmin
    .from('reflection_logs')
    .insert({
      conversations_analyzed: conversations.length,
      time_window_start: new Date(
        Math.min(
          ...conversations.map((c) => Date.now()) // fallback
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
    console.error('[Self-Improvement] Failed to log reflection:', error?.message);
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
```

**Step 3: Run tests, commit**

```bash
git add lib/self-improvement/reflection-engine.ts __tests__/unit/lib/self-improvement/reflection-engine.test.ts lib/self-improvement/index.ts
git commit -m "feat(self-improvement): add reflection engine with evaluation, decision logic, and improvement pipeline"
```

---

## Task 12: Admin API Routes

**Files:**
- Create: `app/api/admin/reflection/route.ts`
- Create: `app/api/admin/suggestions/route.ts`

**Step 1: Create reflection API route**

```typescript
// app/api/admin/reflection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/middleware/rbac';
import { runReflection, canRunReflection } from '@/lib/self-improvement/reflection-engine';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/admin/reflection - Get reflection status and recent logs
 */
export const GET = withRoles(async () => {
  try {
    const { canRun, reason } = await canRunReflection();

    const { data: recentLogs } = await supabaseAdmin
      .from('reflection_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: pendingSuggestions } = await supabaseAdmin
      .from('prompt_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      can_run_now: canRun,
      blocked_reason: reason || null,
      recent_reflections: recentLogs || [],
      pending_suggestions: pendingSuggestions || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}, ['admin']);

/**
 * POST /api/admin/reflection - Trigger reflection manually
 */
export const POST = withRoles(async () => {
  try {
    const result = await runReflection();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}, ['admin']);
```

**Step 2: Create suggestions API route**

```typescript
// app/api/admin/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/middleware/rbac';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPromptVersion } from '@/lib/self-improvement/prompt-version-manager';
import type { PromptSection } from '@/lib/self-improvement/types';

/**
 * GET /api/admin/suggestions - List prompt suggestions
 */
export const GET = withRoles(async (req: NextRequest) => {
  try {
    const status = req.nextUrl.searchParams.get('status') || 'pending';

    const { data, error } = await supabaseAdmin
      .from('prompt_suggestions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ suggestions: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}, ['admin']);

/**
 * PATCH /api/admin/suggestions - Approve or reject a suggestion
 */
export const PATCH = withRoles(async (req: NextRequest) => {
  try {
    const { suggestion_id, action, reviewed_by, review_notes } = await req.json();

    if (!suggestion_id || !action) {
      return NextResponse.json(
        { error: 'suggestion_id and action (approve|reject) required' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Get the suggestion
      const { data: suggestion } = await supabaseAdmin
        .from('prompt_suggestions')
        .select('*')
        .eq('id', suggestion_id)
        .single();

      if (!suggestion) {
        return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
      }

      // Apply the change by creating a new prompt version
      const newVersion = await createPromptVersion(
        suggestion.target_section as PromptSection,
        suggestion.proposed_change || '',
        `Approved suggestion: ${suggestion.title}`,
        'human'
      );

      // Update suggestion status
      await supabaseAdmin
        .from('prompt_suggestions')
        .update({
          status: 'implemented',
          reviewed_by: reviewed_by || 'admin',
          reviewed_at: new Date().toISOString(),
          review_notes,
          implemented_in_version: newVersion?.version,
        })
        .eq('id', suggestion_id);

      return NextResponse.json({
        status: 'implemented',
        new_version: newVersion?.version,
      });
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('prompt_suggestions')
        .update({
          status: 'rejected',
          reviewed_by: reviewed_by || 'admin',
          reviewed_at: new Date().toISOString(),
          review_notes,
        })
        .eq('id', suggestion_id);

      return NextResponse.json({ status: 'rejected' });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "approve" or "reject".' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}, ['admin']);
```

**Step 3: Commit**

```bash
git add app/api/admin/reflection/route.ts app/api/admin/suggestions/route.ts
git commit -m "feat(self-improvement): add admin API routes for reflection trigger and suggestion management"
```

---

## Task 13: Wire Reflection Trigger into Session Completion

**Files:**
- Modify: `app/api/chat/route.ts` (around line 607-620 where archive_session is detected)

**Step 1: Add import**

At top of `app/api/chat/route.ts`:
```typescript
import { countCompletedSessionsSinceLastReflection } from '@/lib/self-improvement/signal-persistence';
import { canRunReflection, runReflection } from '@/lib/self-improvement/reflection-engine';
```

**Step 2: Add reflection check after session archive (after line 620)**

After the `wasArchived` check and session status update, add:

```typescript
    // 9b. Check if reflection should run (after session completion)
    if (wasArchived) {
      try {
        const { canRun } = await canRunReflection();
        if (canRun) {
          // Run reflection in background (don't block response)
          runReflection().catch((err) =>
            console.error('[Chat API] Background reflection failed:', err)
          );
        }
      } catch (reflectionError) {
        console.error('[Chat API] Reflection check error:', reflectionError);
      }
    }
```

**Step 3: Also add a positive signal for deal closed**

In the working memory update loop (around line 432), after `workingMemory.workflowStage = 'closed_won'`:

```typescript
      // Record positive signal for deal closed
      saveSignals([{
        conversation_id: conversationId,
        signal_type: 'deal_closed',
        signal_strength: 1.0,
        metadata: { stage: 'closed_won' },
      }]).catch(() => {});
```

**Step 4: Verify no regressions**

Run: `npm run dev:app` and test a chat interaction.

**Step 5: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(self-improvement): wire reflection trigger to session completion and add deal_closed signal"
```

---

## Task 14: Seed Initial Prompt Versions

**Files:**
- Create: `lib/self-improvement/seed-prompts.ts`

**Purpose:** Extract the current hardcoded SCENARIO_HANDLERS and RESPONSE_FORMATS into the `system_prompt_versions` table as version 1, so the dynamic rendering has something to work with.

**Step 1: Create seed script**

```typescript
// lib/self-improvement/seed-prompts.ts
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Seed initial prompt versions from the hardcoded system prompt.
 * Run once during setup. Idempotent -- skips if versions already exist.
 */
export async function seedInitialPromptVersions(
  scenarioHandlers: string,
  responseFormats: string
): Promise<void> {
  for (const section of [
    { name: 'scenario_handlers' as const, content: scenarioHandlers },
    { name: 'response_formats' as const, content: responseFormats },
  ]) {
    // Check if already seeded
    const { count } = await supabaseAdmin
      .from('system_prompt_versions')
      .select('*', { count: 'exact', head: true })
      .eq('section', section.name);

    if (count && count > 0) {
      console.log(`[Seed] Prompt section "${section.name}" already exists, skipping`);
      continue;
    }

    const { error } = await supabaseAdmin
      .from('system_prompt_versions')
      .insert({
        version: 1,
        section: section.name,
        content: section.content,
        is_active: true,
        created_by: 'human',
        change_reason: 'Initial seed from hardcoded prompt',
        locked: false,
      });

    if (error) {
      console.error(`[Seed] Failed to seed "${section.name}":`, error.message);
    } else {
      console.log(`[Seed] Seeded prompt section "${section.name}" v1`);
    }
  }
}
```

**Step 2: Create API route to trigger seed**

```typescript
// app/api/admin/seed-prompts/route.ts
import { NextResponse } from 'next/server';
import { withRoles } from '@/lib/middleware/rbac';
import { seedInitialPromptVersions } from '@/lib/self-improvement/seed-prompts';
// These are the hardcoded sections to seed from
import {
  SCENARIO_HANDLERS,
  RESPONSE_FORMATS,
} from '@/lib/prompts/jetvision-system-prompt';

export const POST = withRoles(async () => {
  try {
    await seedInitialPromptVersions(SCENARIO_HANDLERS, RESPONSE_FORMATS);
    return NextResponse.json({ success: true, message: 'Prompt versions seeded' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}, ['admin']);
```

Note: The `SCENARIO_HANDLERS` and `RESPONSE_FORMATS` constants need to be exported from `jetvision-system-prompt.ts`. Add `export` keyword to their declarations if not already exported.

**Step 3: Commit**

```bash
git add lib/self-improvement/seed-prompts.ts app/api/admin/seed-prompts/route.ts
git commit -m "feat(self-improvement): add prompt version seeding from hardcoded system prompt"
```

---

## Task 15: Update Chat API to Use Dynamic Prompt

**Files:**
- Modify: `app/api/chat/route.ts` (where system prompt is built)

**Step 1: Find where system prompt is built**

Search for `buildSystemPromptWithWorkingMemory` or `buildCompleteSystemPrompt` in route.ts and replace with the async dynamic version.

**Step 2: Replace static prompt building with dynamic**

Replace the call to `buildSystemPromptWithWorkingMemory(workingMemory)` with:
```typescript
import { buildDynamicSystemPrompt } from '@/lib/prompts/jetvision-system-prompt';

// Replace:
// const systemPrompt = buildSystemPromptWithWorkingMemory(workingMemory);
// With:
const systemPrompt = await buildDynamicSystemPrompt(workingMemory);
```

**Step 3: Verify no regressions**

Run: `npm run dev:app` and test a chat interaction. The behavior should be identical since `buildDynamicSystemPrompt` falls back to hardcoded sections when no DB versions exist.

**Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(self-improvement): switch chat API to dynamic prompt rendering with DB fallback"
```

---

## Task 16: Final Integration Test

**Files:**
- Create: `__tests__/integration/self-improvement/reflection-flow.test.ts`

**Step 1: Write integration test**

```typescript
// __tests__/integration/self-improvement/reflection-flow.test.ts
import { describe, it, expect, vi } from 'vitest';
import { decideAction } from '@/lib/self-improvement/reflection-engine';
import { computeOverallScore } from '@/lib/self-improvement/rubric';
import { detectCorrectionSignals, detectToolRetrySignals } from '@/lib/self-improvement/signal-capture';
import { renderKnowledgeBase } from '@/lib/self-improvement/knowledge-base';
import { PromptCache } from '@/lib/self-improvement/prompt-version-manager';
import type { ReflectionScores, KnowledgeEntry } from '@/lib/self-improvement/types';

describe('Self-Improvement Integration', () => {
  it('should complete full evaluation → decision → action flow', () => {
    // 1. Simulate scores from evaluator
    const scores: ReflectionScores = {
      deal_progression_score: 3,
      domain_accuracy_score: 2,
      proactive_sales_score: 3,
      communication_score: 4,
      scope_score: 4,
      overall_score: 0,
    };

    // 2. Compute weighted score
    scores.overall_score = computeOverallScore(scores);
    expect(scores.overall_score).toBeGreaterThan(2.0);
    expect(scores.overall_score).toBeLessThan(4.0);

    // 3. Decide action
    const action = decideAction(scores.overall_score);
    expect(['suggestion', 'auto_update']).toContain(action);
  });

  it('should detect signals from a problematic conversation', () => {
    const messages = [
      { role: 'user', content: 'I need a flight from Teterboro to LA' },
      { role: 'assistant', content: 'I found flights from KLAS.' },
      { role: 'user', content: 'No, I meant Los Angeles, not Las Vegas!' },
      { role: 'assistant', content: 'Let me search for KLAX.' },
    ];

    const signals = detectCorrectionSignals(messages, 'test-conv');
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].signal_type).toBe('correction');
  });

  it('should render knowledge base into prompt section', () => {
    const entries: KnowledgeEntry[] = [
      {
        category: 'aircraft_patterns',
        title: 'KTEB→TNCM winter preference',
        content: 'Clients flying KTEB to TNCM in winter prefer heavy jets with WiFi.',
        confidence: 0.85,
        times_relevant: 5,
        is_active: true,
      },
    ];

    const rendered = renderKnowledgeBase(entries);
    expect(rendered).toContain('Learned Patterns');
    expect(rendered).toContain('heavy jets with WiFi');
  });

  it('should cache and expire prompt versions', async () => {
    const cache = new PromptCache(50); // 50ms TTL
    cache.set('scenario_handlers', 'v1 content');
    expect(cache.get('scenario_handlers')).toBe('v1 content');

    await new Promise((r) => setTimeout(r, 60));
    expect(cache.get('scenario_handlers')).toBeNull();
  });
});
```

**Step 2: Run all self-improvement tests**

Run: `npx vitest run __tests__/unit/lib/self-improvement/ __tests__/integration/self-improvement/`
Expected: ALL PASS

**Step 3: Run full project test suite**

Run: `npm test`
Expected: No regressions in existing tests

**Step 4: Final commit**

```bash
git add __tests__/integration/self-improvement/reflection-flow.test.ts
git commit -m "test(self-improvement): add integration tests for full reflection flow"
```

---

## Summary

| Task | Component | New Files | Modified Files |
|------|-----------|-----------|----------------|
| 1 | Types & Constants | 3 | 0 |
| 2 | Database Migration | 1 | 0 |
| 3 | Signal Capture | 2 | 0 |
| 4 | Signal Persistence | 2 | 0 |
| 5 | Chat API Integration | 0 | 1 |
| 6 | Rubric | 2 | 0 |
| 7 | Knowledge Base | 2 | 0 |
| 8 | Prompt Version Manager | 2 | 0 |
| 9 | Dynamic System Prompt | 0 | 1 |
| 10 | AI Evaluator | 2 | 0 |
| 11 | Reflection Engine | 2 | 0 |
| 12 | Admin API Routes | 2 | 0 |
| 13 | Reflection Trigger Wiring | 0 | 1 |
| 14 | Seed Prompts | 2 | 0 |
| 15 | Dynamic Prompt in Chat API | 0 | 1 |
| 16 | Integration Tests | 1 | 0 |
| **Total** | | **23 new** | **4 modified** |
