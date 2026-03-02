// ---------------------------------------------------------------------------
// Self-Improving Agent -- Type Definitions
// ---------------------------------------------------------------------------

// ---- Signal Types ---------------------------------------------------------

export type SignalType =
  | 'correction'
  | 'backtrack'
  | 'drop_off'
  | 'tool_retry'
  | 'slow_progression'
  | 'deal_closed';

export interface AgentSignal {
  id?: string;
  conversation_id: string;
  message_id?: string;
  signal_type: SignalType;
  /** Strength of the signal, ranging from -1.0 (strongly negative) to 1.0 (strongly positive). */
  signal_strength: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

// ---- Prompt Versioning ----------------------------------------------------

export type PromptSection = 'scenario_handlers' | 'response_formats';

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

// ---- Knowledge Base -------------------------------------------------------

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

// ---- Reflection -----------------------------------------------------------

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
  prompt_versions_evaluated?: string[];
  strengths: string[];
  weaknesses: string[];
  patterns_noticed: string[];
  action_taken: ReflectionAction;
  suggestion_id?: string;
  new_prompt_version?: string;
  raw_analysis?: string;
  created_at?: string;
}

export type ReflectionLogWithScores = ReflectionLog & ReflectionScores;

// ---- Suggestions ----------------------------------------------------------

export type SuggestionSeverity = 'minor' | 'medium' | 'major';

export type SuggestionType =
  | 'prompt_change'
  | 'scenario_addition'
  | 'response_update';

export type SuggestionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'implemented';

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
  implemented_in_version?: string;
  created_at?: string;
}

// ---- Workflow -------------------------------------------------------------

export interface WorkflowStageTimestamp {
  id?: string;
  request_id: string;
  stage: string;
  entered_at: string;
  exited_at?: string;
  duration_ms?: number;
  previous_stage?: string;
}

// ---- Evaluation -----------------------------------------------------------

export interface ConversationForEval {
  conversation_id: string;
  messages: { role: string; content: string }[];
  workflow_stage: string;
  tool_calls: { name: string; success: boolean }[];
}

export interface WorkflowOutcome {
  request_id: string;
  final_stage: string;
  stage_timestamps: WorkflowStageTimestamp[];
  total_messages: number;
  deal_closed: boolean;
}

export interface EvaluationRequest {
  conversations: ConversationForEval[];
  signals: AgentSignal[];
  workflow_outcomes: WorkflowOutcome[];
}

export interface SuggestedImprovement {
  target_section: PromptSection;
  change_type: 'add' | 'modify' | 'remove';
  content: string;
  severity: SuggestionSeverity;
  reasoning: string;
}

export interface EvaluationResult {
  scores: ReflectionScores;
  strengths: string[];
  weaknesses: string[];
  patterns_noticed: string[];
  suggested_improvements: SuggestedImprovement[];
}
