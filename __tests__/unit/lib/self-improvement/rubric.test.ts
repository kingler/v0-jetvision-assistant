// ---------------------------------------------------------------------------
// Self-Improving Agent -- Rubric Tests
// ---------------------------------------------------------------------------
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

    it('should return perfect score when all scores are 5', () => {
      const scores: ReflectionScores = {
        deal_progression_score: 5,
        domain_accuracy_score: 5,
        proactive_sales_score: 5,
        communication_score: 5,
        scope_score: 5,
        overall_score: 0,
      };
      expect(computeOverallScore(scores)).toBeCloseTo(5.0, 1);
    });

    it('should return minimum score when all scores are 1', () => {
      const scores: ReflectionScores = {
        deal_progression_score: 1,
        domain_accuracy_score: 1,
        proactive_sales_score: 1,
        communication_score: 1,
        scope_score: 1,
        overall_score: 0,
      };
      expect(computeOverallScore(scores)).toBeCloseTo(1.0, 1);
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

    it('should include scoring scale', () => {
      const prompt = getEvaluatorSystemPrompt();
      expect(prompt).toContain('1');
      expect(prompt).toContain('5');
    });

    it('should include output format instructions', () => {
      const prompt = getEvaluatorSystemPrompt();
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('scores');
      expect(prompt).toContain('suggested_improvements');
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

    it('should include tool call status', () => {
      const convos: ConversationForEval[] = [
        {
          conversation_id: 'c1',
          messages: [{ role: 'user', content: 'Search flights' }],
          workflow_stage: 'searching',
          tool_calls: [
            { name: 'create_trip', success: true },
            { name: 'get_quote', success: false },
          ],
        },
      ];
      const result = formatEvaluationRequest(convos, [], []);
      expect(result).toContain('create_trip(ok)');
      expect(result).toContain('get_quote(fail)');
    });

    it('should include signal summary when signals provided', () => {
      const result = formatEvaluationRequest(
        [],
        [
          {
            conversation_id: 'c1',
            signal_type: 'correction',
            signal_strength: 0.8,
          },
          {
            conversation_id: 'c2',
            signal_type: 'correction',
            signal_strength: 0.6,
          },
          {
            conversation_id: 'c3',
            signal_type: 'drop_off',
            signal_strength: -0.5,
          },
        ],
        []
      );
      expect(result).toContain('Implicit Signals');
      expect(result).toContain('correction: 2');
      expect(result).toContain('drop_off: 1');
    });

    it('should include workflow outcome summary', () => {
      const result = formatEvaluationRequest(
        [],
        [],
        [
          {
            request_id: 'r1',
            final_stage: 'completed',
            stage_timestamps: [],
            total_messages: 10,
            deal_closed: true,
          },
          {
            request_id: 'r2',
            final_stage: 'abandoned',
            stage_timestamps: [],
            total_messages: 4,
            deal_closed: false,
          },
        ]
      );
      expect(result).toContain('Workflow Outcomes');
      expect(result).toContain('Deals closed: 1/2');
      expect(result).toContain('Sessions abandoned: 1');
      expect(result).toContain('7.0');
    });

    it('should handle empty inputs gracefully', () => {
      const result = formatEvaluationRequest([], [], []);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
