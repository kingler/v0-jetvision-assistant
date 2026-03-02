import { describe, it, expect } from 'vitest';
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
