# Self-Improving Jetvision Agent - Design Document

**Date**: 2026-03-02
**Status**: Approved
**Based on**: Self-Improving AI Systems Starter Kit (Mark Kashef)

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Learning sources | Implicit signals + outcome metrics + AI self-evaluation | Comprehensive; each compensates for others' blind spots |
| Prompt modification scope | Scenario handlers + response templates + additive knowledge base | Core identity/safety locked; domain knowledge grows freely |
| Top evaluation criteria | Deal progression, Domain accuracy, Proactive sales behavior | Maps to what separates great charter brokers from mediocre ones |
| Feedback mechanism | Implicit signals only (no UI changes) | Zero friction for busy sales reps; infer quality from behavior |
| Reflection cadence | After N completed sessions (default N=10) | Adapts to business volume; not tied to clock |
| Change approval | Tiered by severity (minor=auto, medium=human, major=admin+testing) | Balances iteration speed with safety for customer-facing tool |

---

## 1. High-Level Architecture

```
ISO Agent <-> JetvisionAgent <-> MCP Tools
     |              |               |
     |         [Implicit Signals]   [Tool Metrics]
     |              |               |
     +----------- --+-------+-------+
                            v
                   +------------------+
                   |  Signal Capture  |  (in chat API route)
                   |  Layer           |
                   +--------+---------+
                            v
                   +------------------+
                   |  Reflection      |  (triggered after N sessions)
                   |  Engine          |
                   +--------+---------+
                            v
                   +------------------+
                   |  AI Evaluator    |  (LLM-as-Judge)
                   |  + Rubric        |
                   +--------+---------+
                            v
                +-----------+-----------+
                v                       v
        +---------------+    +--------------------+
        | Knowledge     |    | Prompt Suggestions |
        | Base (auto)   |    | Queue (approval)   |
        +---------------+    +--------------------+
```

**Three tiers of changes:**
- **Minor** (knowledge base additions, phrasing tweaks): Auto-apply
- **Medium** (new scenario rules, response template changes): Human approval
- **Major** (workflow logic, tool behavior changes): Admin review + testing required

All changes are versioned with full rollback capability. The existing system prompt stays modular -- each section can be independently versioned and A/B tested.

---

## 2. Signal Capture Layer

Instruments `app/api/chat/route.ts` to detect implicit quality signals without UI changes.

### Correction Signals (strongest negative)
- User says "No, I meant..." or "That's wrong" after agent response
- Agent calls same tool twice with different parameters (self-correction)
- User restates a request the agent already responded to
- Detection: NLP pattern matching on user messages + duplicate tool call detection

### Workflow Signals (outcome-based)
- **Deal velocity**: Time from session start to each workflow stage transition
- **Drop-off point**: Which workflow stage a session was abandoned at
- **Backtracking**: Workflow stage going backwards
- **Tool failure rate**: How often tool calls fail per session
- Detection: Already tracked via `requests.workflow_state` -- needs timestamps per stage

### Engagement Signals (behavioral)
- Message count before workflow progresses (fewer = more efficient)
- User response latency (long pauses may indicate confusion)
- Session duration vs. complexity
- Detection: Timestamps on messages + workflow_state transitions

All signals stored in `agent_signals` table, keyed to conversation_id and message_id.

---

## 3. Database Schema

### `system_prompt_versions` -- Versioned prompt history
```sql
CREATE TABLE system_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  section TEXT NOT NULL,  -- 'scenario_handlers', 'response_formats', 'knowledge_base'
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by TEXT DEFAULT 'system',  -- 'system' | 'human'
  performance_score NUMERIC(3,2),
  change_reason TEXT,
  previous_version_id UUID REFERENCES system_prompt_versions(id),
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_system_prompt_versions_active
  ON system_prompt_versions(section, is_active) WHERE is_active = true;
CREATE INDEX idx_system_prompt_versions_section
  ON system_prompt_versions(section, version DESC);
```

### `agent_signals` -- Raw implicit feedback
```sql
CREATE TABLE agent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES requests(id),
  message_id UUID REFERENCES messages(id),
  signal_type TEXT NOT NULL,  -- 'correction', 'backtrack', 'drop_off', 'tool_retry', 'slow_progression', 'deal_closed'
  signal_strength NUMERIC(3,2),  -- -1.0 (very negative) to 1.0 (very positive)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_signals_conversation ON agent_signals(conversation_id);
CREATE INDEX idx_agent_signals_type ON agent_signals(signal_type);
CREATE INDEX idx_agent_signals_created ON agent_signals(created_at DESC);
```

### `reflection_logs` -- AI evaluation results
```sql
CREATE TABLE reflection_logs (
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
  action_taken TEXT CHECK (action_taken IN ('none', 'knowledge_update', 'suggestion', 'auto_update', 'escalate')),
  suggestion_id UUID,
  new_prompt_version INTEGER,
  raw_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reflection_logs_created ON reflection_logs(created_at DESC);
CREATE INDEX idx_reflection_logs_score ON reflection_logs(overall_score);
```

### `knowledge_base` -- Additive domain learnings (auto-applied)
```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,  -- 'aircraft_patterns', 'client_preferences', 'pricing_insights', 'workflow_tips', 'operator_notes'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence NUMERIC(3,2),
  source_reflection_id UUID REFERENCES reflection_logs(id),
  times_relevant INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_knowledge_base_active ON knowledge_base(is_active) WHERE is_active = true;
```

### `prompt_suggestions` -- Human-approval queue
```sql
CREATE TABLE prompt_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_log_id UUID REFERENCES reflection_logs(id),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'medium', 'major')),
  target_section TEXT NOT NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('prompt_change', 'scenario_addition', 'response_update')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_change TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  implemented_in_version INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_suggestions_status ON prompt_suggestions(status);
CREATE INDEX idx_prompt_suggestions_severity ON prompt_suggestions(severity);
```

### `workflow_stage_timestamps` -- Deal velocity tracking
```sql
CREATE TABLE workflow_stage_timestamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id),
  stage TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL,
  exited_at TIMESTAMPTZ,
  duration_ms INTEGER,
  previous_stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wst_request ON workflow_stage_timestamps(request_id);
CREATE INDEX idx_wst_stage ON workflow_stage_timestamps(stage);
```

---

## 4. Charter Aviation Evaluation Rubric

### Criteria & Weights

| Criterion | Weight | What It Measures |
|-----------|--------|------------------|
| Deal Progression | 25% | Did the agent advance the workflow? Create trips, fetch quotes, generate proposals when appropriate? |
| Domain Accuracy | 25% | Correct aircraft categories, proper segment counting, FBO awareness, charter industry terminology |
| Proactive Sales | 25% | Anticipated client needs (catering, ground transport), asked qualifying questions, suggested alternatives |
| Communication | 15% | Professional luxury-aviation tone, concise but thorough, proper email formatting |
| Scope | 10% | Stayed focused on the task, didn't over-explain or go on tangents |

### Domain-Specific Scoring (Deal Progression)
- **5**: Flight request → asks pax/dates/prefs → creates trip → all in 3-4 turns
- **4**: Same but takes 6+ turns due to unnecessary clarification
- **3**: Creates trip but forgets return leg or special requirements
- **2**: Gets stuck in info gathering, never progresses to trip creation
- **1**: Misinterprets request entirely, searches wrong airports

### Domain-Specific Scoring (Proactive Sales)
- **5**: Flags repositioning discounts, suggests catering for VIP, notes FBO hour limits
- **4**: Mentions one relevant upsell or consideration
- **3**: Presents quotes accurately but doesn't add broker value
- **2**: Misses obvious red flags (e.g., tight connections for elderly passengers)
- **1**: Provides incorrect recommendations that could lose the deal

### Evaluator Prompt Structure
```
You are evaluating a charter aviation sales AI assistant.
You are a senior charter broker with 15 years of experience.

## Rubric
${charterAviationRubric}

## System Prompt Being Evaluated
${activePromptSections}

## Conversation to Evaluate
${conversationHistory}

## Implicit Signals Detected
${signalsSummary}

## Workflow Outcome
${workflowResult}

Score each criterion 1-5 with specific evidence.
Identify patterns across the batch of conversations.
```

---

## 5. Reflection Engine & Improvement Pipeline

### Trigger
- After every N completed sessions (configurable, default N=10)
- Minimum 6-hour cooldown between reflections
- Manual trigger via admin endpoint

### Flow
1. **Trigger check**: Count completed sessions since last reflection; check cooldown
2. **Gather evidence**: Pull conversations, agent_signals, workflow_stage_timestamps, compute metrics
3. **AI evaluation**: Send batch to LLM evaluator with charter aviation rubric
4. **Decision logic**:
   - `overall_score >= 4.0` -> none (log only)
   - `overall_score >= 3.0` -> suggestion (human review)
   - `overall_score >= 2.0` -> auto_update (knowledge) + suggestion (prompt changes)
   - `overall_score < 2.0` -> escalate (pause auto-updates, flag admin)
5. **Generate improvements**: Tiered by severity (minor=auto, medium=human approval, major=admin+testing)
6. **Apply & version**: Create new `system_prompt_versions` row, link previous for rollback

### Prompt Rendering
```typescript
export async function buildSystemPrompt(workingMemory) {
  const scenarioHandlers = await getActivePromptSection('scenario_handlers');
  const responseFormats = await getActivePromptSection('response_formats');
  const knowledgeBase = await getActiveKnowledgeEntries();

  return [
    IDENTITY_SECTION,        // locked, never modified
    TOOL_REFERENCE,          // locked
    scenarioHandlers,        // versioned, modifiable
    responseFormats,         // versioned, modifiable
    CONTEXT_RULES,           // locked
    ERROR_HANDLING,          // locked
    renderKnowledgeBase(knowledgeBase),  // additive, auto-updated
    renderWorkingMemory(workingMemory),  // existing
  ].join('\n\n');
}
```

---

## 6. Integration Points

### Files Modified
1. **`app/api/chat/route.ts`** -- Signal capture after tool execution and working memory updates
2. **`lib/prompts/jetvision-system-prompt.ts`** -- Dynamic rendering from versioned sections + knowledge base
3. **`agents/jetvision-agent/tool-executor.ts`** -- Tool metrics instrumentation (timing, success/failure)

### Files Created
4. **`app/api/admin/reflection/route.ts`** -- Reflection trigger endpoint (POST trigger, GET status)
5. **`lib/self-improvement/signal-capture.ts`** -- Implicit signal detection logic
6. **`lib/self-improvement/reflection-engine.ts`** -- Core reflection loop
7. **`lib/self-improvement/evaluator.ts`** -- AI-as-Judge with charter aviation rubric
8. **`lib/self-improvement/prompt-updater.ts`** -- Version management, knowledge base updates
9. **`lib/self-improvement/rubric.ts`** -- Rubric configuration and scoring weights
10. **`lib/self-improvement/types.ts`** -- TypeScript types for all self-improvement entities
11. **`supabase/migrations/023_self_improvement.sql`** -- All new tables

### Safety Mechanisms

| Safety Net | Implementation |
|------------|----------------|
| Cooldown (6hr) | Check `reflection_logs.created_at` before running |
| Max 3 updates/day | Count `knowledge_base` entries created today |
| Version chain | `previous_version_id` on every prompt version |
| Locked sections | `locked: true` flag, reflection loop skips |
| Regression detection | Compare `overall_score` across last 5 reflections; pause if declining |
| Human override | Admin endpoint to lock prompt, clear queue, disable auto-updates |
| Fallback | If DB fetch fails, use hardcoded prompt (zero-downtime guarantee) |
