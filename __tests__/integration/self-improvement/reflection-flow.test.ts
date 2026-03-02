// ---------------------------------------------------------------------------
// Integration Test -- Self-Improvement Reflection Flow
// ---------------------------------------------------------------------------
// Exercises the pure-logic functions together without database mocks or
// OpenAI API calls.  Verifies the full evaluation -> decision -> action flow.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { decideAction } from '@/lib/self-improvement/reflection-engine';
import { computeOverallScore } from '@/lib/self-improvement/rubric';
import { detectCorrectionSignals, detectToolRetrySignals } from '@/lib/self-improvement/signal-capture';
import { renderKnowledgeBase } from '@/lib/self-improvement/knowledge-base';
import { PromptCache } from '@/lib/self-improvement/prompt-version-manager';
import type { ReflectionScores, KnowledgeEntry } from '@/lib/self-improvement/types';

describe('Self-Improvement Integration', () => {
  it('should complete full evaluation -> decision -> action flow', () => {
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

  it('should detect tool retry signals', () => {
    const toolResults = [
      { name: 'search_airports', success: true, input: { query: 'KLAS' } },
      { name: 'search_airports', success: true, input: { query: 'KLAX' } },
    ];

    const signals = detectToolRetrySignals(toolResults, 'test-conv');
    expect(signals.length).toBe(1);
    expect(signals[0].signal_type).toBe('tool_retry');
    expect(signals[0].signal_strength).toBeLessThan(0);
  });

  it('should render knowledge base into prompt section', () => {
    const entries: KnowledgeEntry[] = [
      {
        category: 'aircraft_patterns',
        title: 'KTEB->TNCM winter preference',
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

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(cache.get('scenario_handlers')).toBeNull();
  });

  it('should handle edge case: all-5 scores yields "none" action', () => {
    const perfectScores: ReflectionScores = {
      deal_progression_score: 5,
      domain_accuracy_score: 5,
      proactive_sales_score: 5,
      communication_score: 5,
      scope_score: 5,
      overall_score: 0,
    };
    perfectScores.overall_score = computeOverallScore(perfectScores);
    expect(perfectScores.overall_score).toBe(5.0);
    expect(decideAction(perfectScores.overall_score)).toBe('none');
  });

  it('should handle edge case: all-1 scores yields "escalate" action', () => {
    const terribleScores: ReflectionScores = {
      deal_progression_score: 1,
      domain_accuracy_score: 1,
      proactive_sales_score: 1,
      communication_score: 1,
      scope_score: 1,
      overall_score: 0,
    };
    terribleScores.overall_score = computeOverallScore(terribleScores);
    expect(terribleScores.overall_score).toBe(1.0);
    expect(decideAction(terribleScores.overall_score)).toBe('escalate');
  });

  it('should not produce false positive correction signals', () => {
    const normalMessages = [
      { role: 'user', content: 'I need a flight to Miami for 6 passengers on March 15' },
      { role: 'assistant', content: 'I will search for flights to KMIA on March 15 for 6 passengers.' },
      { role: 'user', content: 'Great, please proceed with the search.' },
    ];
    const signals = detectCorrectionSignals(normalMessages, 'test-conv');
    expect(signals).toHaveLength(0);
  });
});
