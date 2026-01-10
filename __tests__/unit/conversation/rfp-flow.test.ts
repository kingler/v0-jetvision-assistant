/**
 * RFP Flow State Tracker Unit Tests
 *
 * Tests for the conversational RFP gathering flow.
 * Following TDD: RED phase - write failing tests first
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('RFPFlow', () => {
  let RFPFlow: any;
  let flow: any;

  beforeEach(async () => {
    // Dynamic import to support TDD
    const module = await import('@/lib/conversation/rfp-flow');
    RFPFlow = module.RFPFlow;
    flow = new RFPFlow();
  });

  describe('Initialization', () => {
    it('should initialize with the first step (route)', () => {
      expect(flow.getCurrentStep()).toBe('route');
      expect(flow.isComplete()).toBe(false);
    });

    it('should track RFP data fields', () => {
      const data = flow.getData();
      expect(data).toBeDefined();
      expect(data.departure).toBeUndefined();
      expect(data.arrival).toBeUndefined();
    });

    it('should provide initial question', () => {
      const question = flow.getCurrentQuestion();
      expect(question).toBeDefined();
      expect(question).toContain('Where');
    });
  });

  describe('Step Progression', () => {
    it('should progress from route to date after valid input', () => {
      flow.processInput('From New York to Los Angeles');
      expect(flow.getCurrentStep()).toBe('date');
    });

    it('should progress through all 5 steps in order', () => {
      const steps = ['route', 'date', 'passengers', 'aircraft', 'budget'];

      expect(flow.getCurrentStep()).toBe(steps[0]);

      flow.processInput('From JFK to LAX');
      expect(flow.getCurrentStep()).toBe(steps[1]);

      flow.processInput('Tomorrow at 2pm');
      expect(flow.getCurrentStep()).toBe(steps[2]);

      flow.processInput('5 passengers');
      expect(flow.getCurrentStep()).toBe(steps[3]);

      flow.processInput('Light jet');
      expect(flow.getCurrentStep()).toBe(steps[4]);
    });

    it('should mark flow as complete after final step', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');
      flow.processInput('Light jet');
      flow.processInput('Budget is $50,000');

      expect(flow.isComplete()).toBe(true);
    });
  });

  describe('Field Extraction', () => {
    it('should extract departure and arrival from route input', () => {
      flow.processInput('From New York JFK to Los Angeles LAX');

      const data = flow.getData();
      expect(data.departure).toBeDefined();
      expect(data.arrival).toBeDefined();
    });

    it('should extract departure date from date input', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('December 25th, 2026');

      const data = flow.getData();
      expect(data.departureDate).toBeDefined();
    });

    it('should extract return date if mentioned', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Leave December 25th, return December 28th');

      const data = flow.getData();
      expect(data.departureDate).toBeDefined();
      expect(data.returnDate).toBeDefined();
    });

    it('should extract passenger count from passengers input', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('8 passengers');

      const data = flow.getData();
      expect(data.passengers).toBe(8);
    });

    it('should extract aircraft type preference', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');
      flow.processInput('Midsize jet');

      const data = flow.getData();
      expect(data.aircraftType).toBeDefined();
    });

    it('should extract budget from budget input', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');
      flow.processInput('Light jet');
      flow.processInput('Budget around $50,000');

      const data = flow.getData();
      expect(data.budget).toBeDefined();
    });
  });

  describe('Field Tracking', () => {
    it('should track which fields are missing', () => {
      const missing = flow.getMissingFields();
      expect(missing).toContain('departure');
      expect(missing).toContain('arrival');
      expect(missing).toContain('departureDate');
      expect(missing).toContain('passengers');
    });

    it('should update missing fields as data is collected', () => {
      flow.processInput('From JFK to LAX');

      const missing = flow.getMissingFields();
      expect(missing).not.toContain('departure');
      expect(missing).not.toContain('arrival');
      expect(missing).toContain('departureDate');
    });

    it('should track which fields are completed', () => {
      flow.processInput('From JFK to LAX');

      const completed = flow.getCompletedFields();
      expect(completed).toContain('departure');
      expect(completed).toContain('arrival');
    });
  });

  describe('Navigation', () => {
    it('should allow going back to previous step', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');

      expect(flow.getCurrentStep()).toBe('passengers');

      flow.goBack();
      expect(flow.getCurrentStep()).toBe('date');
    });

    it('should preserve data when going back', () => {
      flow.processInput('From JFK to LAX');
      const data1 = flow.getData();

      flow.processInput('Tomorrow');
      flow.goBack();

      const data2 = flow.getData();
      expect(data2.departure).toBe(data1.departure);
      expect(data2.arrival).toBe(data1.arrival);
    });

    it('should not go back beyond first step', () => {
      flow.goBack();
      expect(flow.getCurrentStep()).toBe('route');
    });
  });

  describe('Contextual Questions', () => {
    it('should generate contextual question based on current step', () => {
      const question1 = flow.getCurrentQuestion();
      expect(question1).toContain('Where');

      flow.processInput('From JFK to LAX');
      const question2 = flow.getCurrentQuestion();
      expect(question2).toContain('When');
    });

    it('should include context from previous answers in questions', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');

      const question = flow.getCurrentQuestion();
      expect(question).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should validate route has both departure and arrival', () => {
      const result = flow.processInput('Just New York');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(flow.getCurrentStep()).toBe('route');
    });

    it('should validate date is in the future', () => {
      flow.processInput('From JFK to LAX');
      const result = flow.processInput('Yesterday');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should validate passenger count is positive', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');
      const result = flow.processInput('0 passengers');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should allow skipping optional fields', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');
      const result = flow.processInput('skip');

      expect(result.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('budget');
    });
  });

  describe('Error Handling', () => {
    it('should handle unclear input gracefully', () => {
      const result = flow.processInput('asdfasdf');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should provide suggestions for invalid input', () => {
      const result = flow.processInput('To Paris');

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle ambiguous dates', () => {
      flow.processInput('From JFK to LAX');
      const result = flow.processInput('next week');

      if (!result.valid) {
        expect(result.clarification).toBeDefined();
      }
    });
  });

  describe('Data Export', () => {
    it('should export complete RFP data in correct format', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');
      flow.processInput('Light jet');
      flow.processInput('Budget $50,000');

      const rfpData = flow.exportRFPData();

      expect(rfpData.departure).toBeDefined();
      expect(rfpData.arrival).toBeDefined();
      expect(rfpData.departureDate).toBeDefined();
      expect(rfpData.passengers).toBe(5);
    });

    it('should include optional fields if provided', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Leave tomorrow, return in 3 days');
      flow.processInput('5 passengers');
      flow.processInput('Midsize jet');
      flow.processInput('Budget $75,000');

      const rfpData = flow.exportRFPData();

      expect(rfpData.returnDate).toBeDefined();
      expect(rfpData.aircraftType).toBeDefined();
      expect(rfpData.budget).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should support serialization for session storage', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');

      const serialized = flow.serialize();
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
    });

    it('should restore from serialized state', () => {
      flow.processInput('From JFK to LAX');
      flow.processInput('Tomorrow');

      const serialized = flow.serialize();
      const newFlow = RFPFlow.deserialize(serialized);

      expect(newFlow.getCurrentStep()).toBe(flow.getCurrentStep());
      expect(newFlow.getData()).toEqual(flow.getData());
    });
  });
});
