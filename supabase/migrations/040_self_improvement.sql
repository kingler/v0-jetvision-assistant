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
