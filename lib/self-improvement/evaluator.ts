// ---------------------------------------------------------------------------
// Self-Improving Agent -- AI Evaluator (LLM-as-Judge)
// ---------------------------------------------------------------------------
import OpenAI from 'openai';
import { getEvaluatorSystemPrompt, formatEvaluationRequest, computeOverallScore } from './rubric';
import type { EvaluationRequest, EvaluationResult, ReflectionScores } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Evaluate a batch of conversations using AI-as-Judge.
 *
 * Sends conversations, implicit signals, and workflow outcomes to an LLM
 * with the charter aviation rubric prompt. The LLM scores across five
 * weighted dimensions, identifies strengths/weaknesses/patterns, and
 * optionally suggests prompt improvements.
 *
 * @param request - Conversations, signals, and outcomes to evaluate.
 * @returns Typed evaluation result with scores, insights, and suggestions.
 * @throws Error if the LLM returns an empty or unparseable response.
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
    temperature: 0.3, // Low temperature for consistent scoring
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
