/**
 * RFP Flow Integration Tests
 *
 * Tests the complete end-to-end conversational RFP gathering flow
 * with all components (RFPFlow, IntentExtractor, FieldValidator) working together.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RFPFlow } from '@/lib/conversation/rfp-flow';
import type { RFPData } from '@/lib/conversation/rfp-flow';

describe('RFP Flow Integration Tests', () => {
  let flow: RFPFlow;

  beforeEach(() => {
    flow = new RFPFlow();
  });

  describe('Complete Happy Path Flow', () => {
    it('should complete full RFP flow with minimal inputs', () => {
      // Step 1: Route
      expect(flow.getCurrentStep()).toBe('route');
      const question1 = flow.getCurrentQuestion();
      expect(question1).toContain('Where');

      const routeResult = flow.processInput('JFK to LAX');
      expect(routeResult.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('date');

      // Step 2: Date
      const question2 = flow.getCurrentQuestion();
      expect(question2).toContain('JFK');
      expect(question2).toContain('LAX');
      expect(question2).toContain('When');

      const dateResult = flow.processInput('Tomorrow');
      expect(dateResult.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('passengers');

      // Step 3: Passengers
      const question3 = flow.getCurrentQuestion();
      expect(question3).toContain('passengers');

      const passengersResult = flow.processInput('5 passengers');
      expect(passengersResult.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('aircraft');

      // Step 4: Aircraft (skip)
      const aircraftResult = flow.processInput('skip');
      expect(aircraftResult.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('budget');

      // Step 5: Budget (skip)
      const budgetResult = flow.processInput('skip');
      expect(budgetResult.valid).toBe(true);
      expect(flow.isComplete()).toBe(true);

      // Verify final data
      const data = flow.getData();
      expect(data.departure).toBe('JFK');
      expect(data.arrival).toBe('LAX');
      expect(data.departureDate).toBeDefined();
      expect(data.passengers).toBe(5);
      expect(data.aircraftType).toBeUndefined();
      expect(data.budget).toBeUndefined();
    });

    it('should complete full RFP flow with all optional fields', () => {
      flow.processInput('From New York to Los Angeles');
      flow.processInput('Leave December 25th, return December 28th');
      flow.processInput('8 passengers');
      flow.processInput('Midsize jet');
      flow.processInput('Budget around $75,000 with WiFi and catering');

      expect(flow.isComplete()).toBe(true);

      const data = flow.getData();
      expect(data.departure).toBe('New York');
      expect(data.arrival).toBe('Los Angeles');
      expect(data.departureDate).toBeDefined();
      expect(data.returnDate).toBeDefined();
      expect(data.passengers).toBe(8);
      expect(data.aircraftType).toBeDefined();
      expect(data.budget).toBe(75000);
      expect(data.specialRequirements).toContain('WiFi');
      expect(data.specialRequirements).toContain('Catering');
    });

    it('should handle various natural language phrasings', () => {
      // Route: City names instead of codes
      flow.processInput('flying from Miami to Seattle');
      expect(flow.getData().departure).toBe('Miami');
      expect(flow.getData().arrival).toBe('Seattle');

      // Date: Relative date
      flow.processInput('next Monday, returning in 5 days');
      expect(flow.getData().departureDate).toBeDefined();
      expect(flow.getData().returnDate).toBeDefined();

      // Passengers: Written number
      flow.processInput('party of four');
      expect(flow.getData().passengers).toBe(4);

      // Aircraft: Specific model
      flow.processInput('Gulfstream G650');
      expect(flow.getData().aircraftType).toBeDefined();

      // Budget: K notation
      flow.processInput('Budget is 50k');
      expect(flow.getData().budget).toBe(50000);

      expect(flow.isComplete()).toBe(true);
    });
  });

  describe('Error Recovery and Validation', () => {
    it('should recover from invalid route and continue', () => {
      // Invalid: Missing arrival
      let result = flow.processInput('Just New York');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(flow.getCurrentStep()).toBe('route'); // Still on route step

      // Valid: Provide both locations
      result = flow.processInput('From New York to Boston');
      expect(result.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('date'); // Advanced
    });

    it('should reject past dates and request future date', () => {
      flow.processInput('JFK to LAX');

      // Invalid: Past date
      let result = flow.processInput('Yesterday');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
      expect(flow.getCurrentStep()).toBe('date'); // Still on date step

      // Valid: Future date
      result = flow.processInput('Tomorrow');
      expect(result.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('passengers'); // Advanced
    });

    it('should reject invalid passenger counts', () => {
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow');

      // Invalid: Zero passengers
      let result = flow.processInput('0 passengers');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(flow.getCurrentStep()).toBe('passengers');

      // Valid: Positive count
      result = flow.processInput('5 passengers');
      expect(result.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('aircraft');
    });

    it('should handle same departure and arrival gracefully', () => {
      const result = flow.processInput('JFK to JFK');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('same');
      expect(flow.getCurrentStep()).toBe('route');
    });

    it('should validate return date is after departure', () => {
      flow.processInput('JFK to LAX');

      // Using explicit dates to ensure proper ordering
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const month = tomorrow.toLocaleString('default', { month: 'long' });
      const day = tomorrow.getDate();

      const result = flow.processInput(`Leave ${month} ${day}, return ${month} ${day}`);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('after');
    });
  });

  describe('Navigation and State Management', () => {
    it('should allow going back and preserve data', () => {
      // Complete first 3 steps
      flow.processInput('JFK to LAX');
      const routeData = flow.getData();

      flow.processInput('Tomorrow');
      const dateData = flow.getData();

      flow.processInput('5 passengers');
      expect(flow.getCurrentStep()).toBe('aircraft');

      // Go back to passengers
      flow.goBack();
      expect(flow.getCurrentStep()).toBe('passengers');

      // Verify data preserved
      const currentData = flow.getData();
      expect(currentData.departure).toBe(routeData.departure);
      expect(currentData.arrival).toBe(routeData.arrival);
      expect(currentData.departureDate).toBe(dateData.departureDate);

      // Change passenger count
      flow.processInput('8 passengers');
      expect(flow.getData().passengers).toBe(8);
      expect(flow.getCurrentStep()).toBe('aircraft');
    });

    it('should not go back beyond first step', () => {
      expect(flow.getCurrentStep()).toBe('route');
      flow.goBack();
      expect(flow.getCurrentStep()).toBe('route'); // Still on route
    });

    it('should track missing and completed fields correctly', () => {
      // Initially all required fields missing
      let missing = flow.getMissingFields();
      expect(missing).toContain('departure');
      expect(missing).toContain('arrival');
      expect(missing).toContain('departureDate');
      expect(missing).toContain('passengers');

      let completed = flow.getCompletedFields();
      expect(completed.length).toBe(0);

      // Add route
      flow.processInput('JFK to LAX');
      missing = flow.getMissingFields();
      expect(missing).not.toContain('departure');
      expect(missing).not.toContain('arrival');

      completed = flow.getCompletedFields();
      expect(completed).toContain('departure');
      expect(completed).toContain('arrival');

      // Add date with return
      flow.processInput('Tomorrow, returning in 3 days');
      completed = flow.getCompletedFields();
      expect(completed).toContain('departureDate');
      expect(completed).toContain('returnDate');

      // Add passengers
      flow.processInput('5 passengers');
      missing = flow.getMissingFields();
      expect(missing.length).toBe(0); // All required fields complete
    });
  });

  describe('Session Persistence', () => {
    it('should serialize and restore flow state', () => {
      // Build partial flow
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');

      const currentStep = flow.getCurrentStep();
      const currentData = flow.getData();

      // Serialize
      const serialized = flow.serialize();
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');

      // Deserialize into new flow
      const restoredFlow = RFPFlow.deserialize(serialized);

      // Verify state restored
      expect(restoredFlow.getCurrentStep()).toBe(currentStep);
      expect(restoredFlow.getData()).toEqual(currentData);
      expect(restoredFlow.getMissingFields()).toEqual(flow.getMissingFields());
      expect(restoredFlow.getCompletedFields()).toEqual(flow.getCompletedFields());

      // Continue from restored state
      restoredFlow.processInput('Light jet');
      expect(restoredFlow.getCurrentStep()).toBe('budget');
    });

    it('should preserve complete flow state including history', () => {
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow');
      flow.goBack(); // Create history

      const serialized = flow.serialize();
      const restoredFlow = RFPFlow.deserialize(serialized);

      // Should be able to go back
      restoredFlow.goBack();
      expect(restoredFlow.getCurrentStep()).toBe('route');
    });
  });

  describe('Data Export', () => {
    it('should export complete RFP data in correct format', () => {
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow, returning in 3 days');
      flow.processInput('5 passengers');
      flow.processInput('Midsize jet');
      flow.processInput('Budget $50,000 with WiFi');

      const rfpData = flow.exportRFPData();

      // Required fields
      expect(rfpData.departure).toBe('JFK');
      expect(rfpData.arrival).toBe('LAX');
      expect(rfpData.departureDate).toBeDefined();
      expect(rfpData.passengers).toBe(5);

      // Optional fields
      expect(rfpData.returnDate).toBeDefined();
      expect(rfpData.aircraftType).toBeDefined();
      expect(rfpData.budget).toBe(50000);
      expect(rfpData.specialRequirements).toContain('WiFi');

      // Verify dates are ISO strings
      expect(() => new Date(rfpData.departureDate!)).not.toThrow();
      expect(() => new Date(rfpData.returnDate!)).not.toThrow();
    });

    it('should export partial data before completion', () => {
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow');

      const rfpData = flow.exportRFPData();

      expect(rfpData.departure).toBe('JFK');
      expect(rfpData.arrival).toBe('LAX');
      expect(rfpData.departureDate).toBeDefined();
      expect(rfpData.passengers).toBeUndefined();
      expect(rfpData.aircraftType).toBeUndefined();
      expect(rfpData.budget).toBeUndefined();
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle multi-word city names', () => {
      flow.processInput('From Los Angeles to New York');
      const data = flow.getData();

      expect(data.departure).toBe('Los Angeles');
      expect(data.arrival).toBe('New York');
    });

    it('should handle mixed case input', () => {
      flow.processInput('from MIAMI to boston');
      const data = flow.getData();

      expect(data.departure).toBe('Miami');
      expect(data.arrival).toBe('Boston');
    });

    it('should handle large passenger counts with warning', () => {
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow');

      const result = flow.processInput('25 passengers');
      expect(result.valid).toBe(true);
      // Large groups accepted but may trigger warning in real implementation
      expect(flow.getData().passengers).toBe(25);
    });

    it('should handle various budget formats', () => {
      // Test k notation
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');
      flow.processInput('skip'); // Skip aircraft
      flow.processInput('Budget 50k');
      expect(flow.getData().budget).toBe(50000);

      // Create new flow for comma notation
      const flow2 = new RFPFlow();
      flow2.processInput('JFK to LAX');
      flow2.processInput('Tomorrow');
      flow2.processInput('5 passengers');
      flow2.processInput('skip');
      flow2.processInput('Budget $100,000');
      expect(flow2.getData().budget).toBe(100000);

      // Create new flow for plain number
      const flow3 = new RFPFlow();
      flow3.processInput('JFK to LAX');
      flow3.processInput('Tomorrow');
      flow3.processInput('5 passengers');
      flow3.processInput('skip');
      flow3.processInput('Budget 75000');
      expect(flow3.getData().budget).toBe(75000);
    });

    it('should handle multiple special requirements', () => {
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');
      flow.processInput('skip');
      flow.processInput('Need WiFi, catering, and pet-friendly aircraft');

      const data = flow.getData();
      expect(data.specialRequirements).toContain('WiFi');
      expect(data.specialRequirements).toContain('Catering');
      expect(data.specialRequirements).toContain('Pet-friendly');
    });

    it('should handle relative dates correctly', () => {
      flow.processInput('JFK to LAX');

      // Next week
      flow.processInput('next week');
      let data = flow.getData();
      const nextWeekDate = new Date(data.departureDate!);
      const now = new Date();
      const daysDiff = Math.floor((nextWeekDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);

      // Go back and try "in 3 days"
      flow.goBack();
      flow.processInput('in 3 days');
      data = flow.getData();
      const threeDaysDate = new Date(data.departureDate!);
      const threeDaysDiff = Math.floor((threeDaysDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(threeDaysDiff).toBeGreaterThanOrEqual(2);
      expect(threeDaysDiff).toBeLessThanOrEqual(4);
    });

    it('should handle skip command only for optional fields', () => {
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');

      // Skip works on aircraft (optional)
      let result = flow.processInput('skip');
      expect(result.valid).toBe(true);
      expect(flow.getCurrentStep()).toBe('budget');

      // Skip works on budget (optional)
      result = flow.processInput('skip');
      expect(result.valid).toBe(true);
      expect(flow.isComplete()).toBe(true);

      // Create new flow and try to skip required field
      const newFlow = new RFPFlow();
      result = newFlow.processInput('skip');
      expect(result.valid).toBe(false); // Skip doesn't work on route
      expect(newFlow.getCurrentStep()).toBe('route');
    });
  });

  describe('Contextual Questions', () => {
    it('should generate questions with context from previous answers', () => {
      // Route question has no context
      const q1 = flow.getCurrentQuestion();
      expect(q1).toBeDefined();

      flow.processInput('JFK to LAX');

      // Date question includes route context
      const q2 = flow.getCurrentQuestion();
      expect(q2).toContain('JFK');
      expect(q2).toContain('LAX');

      flow.processInput('Tomorrow');
      flow.processInput('5 passengers');

      // Aircraft question includes passenger count
      const q4 = flow.getCurrentQuestion();
      expect(q4).toContain('5 passenger');
    });
  });

  describe('Real-world Conversation Flows', () => {
    it('should handle executive assistant scenario', () => {
      // Professional, all details provided
      flow.processInput('Need to fly from New York JFK to Los Angeles LAX');
      flow.processInput('Departing December 15th at 9am, returning December 18th');
      flow.processInput('Party of 6 executives');
      flow.processInput('Prefer a Gulfstream G650 or similar heavy jet');
      flow.processInput('Budget up to $150,000, require WiFi, catering, and conference seating');

      expect(flow.isComplete()).toBe(true);
      const data = flow.getData();

      expect(data.passengers).toBe(6);
      expect(data.budget).toBe(150000);
      expect(data.specialRequirements).toContain('WiFi');
      expect(data.specialRequirements).toContain('Catering');
    });

    it('should handle last-minute urgent booking', () => {
      // Minimal details, urgent
      flow.processInput('JFK to LAX');
      flow.processInput('Tomorrow ASAP');
      flow.processInput('Just me');
      flow.processInput('Any available jet');
      flow.processInput('No budget constraints');

      expect(flow.isComplete()).toBe(true);
      const data = flow.getData();

      expect(data.passengers).toBe(1);
      expect(data.departure).toBe('JFK');
      expect(data.arrival).toBe('LAX');
    });

    it('should handle family vacation booking', () => {
      // Round trip, specific dates, budget conscious
      flow.processInput('Flying from Miami to Aspen');
      flow.processInput('Leave December 20th, return December 27th');
      flow.processInput('Family of 4');
      flow.processInput('Light jet is fine');
      flow.processInput('Budget around 40k, need pet-friendly for our dog');

      expect(flow.isComplete()).toBe(true);
      const data = flow.getData();

      expect(data.passengers).toBe(4);
      expect(data.returnDate).toBeDefined();
      expect(data.budget).toBe(40000);
      expect(data.specialRequirements).toContain('Pet-friendly');
    });
  });
});
