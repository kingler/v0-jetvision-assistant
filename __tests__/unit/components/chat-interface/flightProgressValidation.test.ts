import { describe, it, expect } from 'vitest';
import {
  calculateCurrentStep,
  shouldShowFlightProgress,
  getStepLabel,
  isWorkflowAtQuotesStage,
  isUserActionRequired,
} from '@/components/chat-interface/utils/flightProgressValidation';

describe('calculateCurrentStep', () => {
  const baseChat = { route: 'KTEB → KLAX', date: '2025-06-15', passengers: 4 } as any;

  it('returns 4 when RFQs loaded and tripId submitted', () => {
    expect(calculateCurrentStep({ ...baseChat, tripId: 'trp123' }, 5, true)).toBe(4);
  });

  it('returns 3 when tripId exists (no RFQs)', () => {
    expect(calculateCurrentStep({ ...baseChat, tripId: 'trp123' }, 0, false)).toBe(3);
  });

  // tripId + RFQs loaded + NOT submitted → falls through to default (step 1)
  // Step 3 only applies when rfqFlightsCount === 0 (waiting for quotes)
  it('returns 1 when tripId exists with RFQs but not submitted', () => {
    expect(calculateCurrentStep({ ...baseChat, tripId: 'trp123' }, 5, false)).toBe(1);
  });

  it('returns 2 when only deepLink exists', () => {
    expect(
      calculateCurrentStep(
        { ...baseChat, deepLink: 'https://avinode.com/trip/123' },
        0,
        false
      )
    ).toBe(2);
  });

  it('returns 1 as default', () => {
    expect(calculateCurrentStep(baseChat, 0, false)).toBe(1);
  });

  it('returns currentStep from chat when no other conditions met', () => {
    expect(calculateCurrentStep({ ...baseChat, currentStep: 2 }, 0, false)).toBe(2);
  });
});

describe('shouldShowFlightProgress', () => {
  it('returns true when trip created with valid data', () => {
    expect(
      shouldShowFlightProgress({
        tripId: 'trp123',
        route: 'KTEB → KLAX',
        date: '2025-06-15',
        passengers: 4,
      } as any)
    ).toBe(true);
  });

  it('returns true when deepLink exists with valid data', () => {
    expect(
      shouldShowFlightProgress({
        deepLink: 'https://avinode.com/trip/123',
        route: 'KTEB → KLAX',
        date: '2025-06-15',
        passengers: 4,
      } as any)
    ).toBe(true);
  });

  it('returns false without tripId/deepLink/requestId', () => {
    expect(
      shouldShowFlightProgress({
        route: 'KTEB → KLAX',
        date: '2025-06-15',
        passengers: 4,
      } as any)
    ).toBe(false);
  });

  it('returns false with invalid route', () => {
    expect(
      shouldShowFlightProgress({
        tripId: 'trp123',
        route: 'TBD',
        date: '2025-06-15',
        passengers: 4,
      } as any)
    ).toBe(false);
  });

  it('returns false with zero passengers', () => {
    expect(
      shouldShowFlightProgress({
        tripId: 'trp123',
        route: 'KTEB → KLAX',
        date: '2025-06-15',
        passengers: 0,
      } as any)
    ).toBe(false);
  });

  it('returns false with "Select route"', () => {
    expect(
      shouldShowFlightProgress({
        tripId: 'trp123',
        route: 'Select route',
        date: '2025-06-15',
        passengers: 4,
      } as any)
    ).toBe(false);
  });
});

describe('getStepLabel', () => {
  it('returns correct labels for each step', () => {
    expect(getStepLabel(1)).toBe('Request Created');
    expect(getStepLabel(2)).toBe('Select Operators');
    expect(getStepLabel(3)).toBe('Awaiting Quotes');
    expect(getStepLabel(4)).toBe('Review Quotes');
  });

  it('returns Unknown Step for invalid step', () => {
    expect(getStepLabel(5)).toBe('Unknown Step');
    expect(getStepLabel(0)).toBe('Unknown Step');
  });
});

describe('isWorkflowAtQuotesStage', () => {
  it('true at step 4+', () => {
    expect(isWorkflowAtQuotesStage(4)).toBe(true);
    expect(isWorkflowAtQuotesStage(5)).toBe(true);
  });

  it('false below step 4', () => {
    expect(isWorkflowAtQuotesStage(3)).toBe(false);
    expect(isWorkflowAtQuotesStage(1)).toBe(false);
  });
});

describe('isUserActionRequired', () => {
  it('true at step 2 and 4', () => {
    expect(isUserActionRequired(2)).toBe(true);
    expect(isUserActionRequired(4)).toBe(true);
  });

  it('false at step 1 and 3', () => {
    expect(isUserActionRequired(1)).toBe(false);
    expect(isUserActionRequired(3)).toBe(false);
  });
});
