/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import { getToolUIEntry, TOOL_UI_REGISTRY } from '@/lib/mcp-ui/tool-ui-registry';

// Mock React components to avoid JSX issues in node env
vi.mock('@/components/mcp-ui/composites/RfqResultsUI', () => ({
  RfqResultsUI: vi.fn(),
}));
vi.mock('@/components/mcp-ui/composites/QuoteComparisonUI', () => ({
  QuoteComparisonUI: vi.fn(),
}));
vi.mock('@/components/mcp-ui/composites/EmailApprovalUI', () => ({
  EmailApprovalUI: vi.fn(),
}));
vi.mock('@/components/avinode', () => ({
  FlightSearchProgress: vi.fn(),
  RfqQuoteDetailsCard: vi.fn(),
  TripDetailsCard: vi.fn(),
}));
vi.mock('@/components/message-components/proposal-preview', () => ({
  ProposalPreview: vi.fn(),
}));
vi.mock('@/components/message-components/pipeline-dashboard', () => ({
  PipelineDashboard: vi.fn(),
}));
vi.mock('@/components/message-components/operator-chat-inline', () => ({
  OperatorChatInline: vi.fn(),
}));
vi.mock('@/components/proposal/proposal-sent-confirmation', () => ({
  ProposalSentConfirmation: vi.fn(),
}));
vi.mock('@/components/contract/contract-sent-confirmation', () => ({
  ContractSentConfirmation: vi.fn(),
}));

describe('tool-ui-registry', () => {
  const mockOnAction = vi.fn();

  describe('getToolUIEntry', () => {
    it('returns entry for registered tool', () => {
      expect(getToolUIEntry('create_trip')).toBeDefined();
    });

    it('returns undefined for unregistered tool', () => {
      expect(getToolUIEntry('unknown_tool')).toBeUndefined();
    });
  });

  describe('extractCreateTripProps', () => {
    const extractProps = TOOL_UI_REGISTRY.create_trip.extractProps;

    it('extracts one-way trip props mapped to FlightSearchProgress', () => {
      const input = {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-03-15',
        passengers: 4,
      };
      const result = {
        trip_id: 'atrip-123',
        deep_link: 'https://avinode.com/trips/123',
      };

      const props = extractProps(input, result, mockOnAction);

      expect(props.currentStep).toBe(2);
      expect(props.isTripCreated).toBe(true);
      expect(props.tripId).toBe('atrip-123');
      expect(props.deepLink).toBe('https://avinode.com/trips/123');
      expect(props.renderMode).toBe('steps-1-2');

      const flightRequest = props.flightRequest as Record<string, unknown>;
      expect(flightRequest.tripType).toBe('one_way');
      expect(flightRequest.passengers).toBe(4);
      expect((flightRequest.departureAirport as any).icao).toBe('KTEB');
      expect((flightRequest.arrivalAirport as any).icao).toBe('KVNY');
    });

    it('extracts round-trip props when result has trip_type', () => {
      const input = {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-03-02',
        passengers: 6,
        return_date: '2026-03-05',
      };
      const result = {
        trip_id: 'atrip-456',
        deep_link: 'https://avinode.com/trips/456',
        trip_type: 'round_trip',
      };

      const props = extractProps(input, result, mockOnAction);

      const flightRequest = props.flightRequest as Record<string, unknown>;
      expect(flightRequest.tripType).toBe('round_trip');
      expect(flightRequest.returnDate).toBe('2026-03-05');
    });

    it('falls back to input.return_date for round-trip detection', () => {
      const input = {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-03-02',
        passengers: 6,
        return_date: '2026-03-05',
      };
      const result = {
        trip_id: 'atrip-789',
        deep_link: 'https://avinode.com/trips/789',
      };

      const props = extractProps(input, result, mockOnAction);

      const flightRequest = props.flightRequest as Record<string, unknown>;
      expect(flightRequest.tripType).toBe('round_trip');
      expect(flightRequest.returnDate).toBe('2026-03-05');
    });
  });
});
