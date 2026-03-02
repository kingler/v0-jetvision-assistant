// ---------------------------------------------------------------------------
// Self-Improving Agent -- Charter Aviation Evaluation Rubric
// ---------------------------------------------------------------------------
import { RUBRIC_WEIGHTS } from './constants';
import type {
  ReflectionScores,
  ConversationForEval,
  AgentSignal,
  WorkflowOutcome,
} from './types';

/**
 * Compute weighted overall score from individual rubric dimension scores.
 *
 * Uses the RUBRIC_WEIGHTS defined in constants.ts (weights sum to 1.0).
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
 * Get the evaluator system prompt for AI-as-Judge scoring.
 *
 * Returns a comprehensive rubric prompt that instructs the LLM to evaluate
 * charter aviation assistant conversations across five weighted dimensions.
 */
export function getEvaluatorSystemPrompt(): string {
  return `You are a senior charter aviation broker with 15 years of experience evaluating an AI sales assistant.
Your job is to score the AI's responses with extremely high standards. A good charter broker anticipates client needs, knows aircraft categories cold, and always moves deals forward.

## Evaluation Criteria

### 1. Deal Progression (25%)
Did the agent advance the workflow toward closing the deal?
- 5: Efficiently progressed (flight request \u2192 trip creation \u2192 quotes in minimal turns)
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
 * Format conversations, signals, and outcomes into a human-readable evaluation
 * request string suitable for sending to the LLM-as-Judge evaluator.
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
    parts.push(
      `Tools called: ${conv.tool_calls.map((t) => `${t.name}(${t.success ? 'ok' : 'fail'})`).join(', ')}`
    );
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
