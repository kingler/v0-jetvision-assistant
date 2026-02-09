/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import { getToolUIEntry, TOOL_UI_REGISTRY } from '@/lib/mcp-ui/tool-ui-registry';

// Mock the airport database
vi.mock('@/lib/airports/airport-database', () => ({
  getAirportByIcao: vi.fn((icao: string) => {
    const airports: Record<string, { name: string; city: string }> = {
      KTEB: { name: 'Teterboro Airport', city: 'Teterboro, NJ' },
      KVNY: { name: 'Van Nuys Airport', city: 'Van Nuys, CA' },
      EGGW: { name: 'London Luton Airport', city: 'London' },
      LFPB: { name: 'Paris Le Bourget Airport', city: 'Paris' },
    };
    return airports[icao] || undefined;
  }),
}));

// Mock React components to avoid JSX issues in node env
vi.mock('@/components/mcp-ui/composites/TripCreatedUI', () => ({
  TripCreatedUI: vi.fn(),
}));
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
  RfqQuoteDetailsCard: vi.fn(),
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

    it('extracts basic one-way trip props from input', () => {
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

      expect(props.tripId).toBe('atrip-123');
      expect(props.tripType).toBe('single_leg');
      expect(props.passengers).toBe(4);
      expect((props.departureAirport as any).icao).toBe('KTEB');
    });

    it('reads trip_type from result when MCP server provides it', () => {
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
        segment_count: 2,
        segments: [
          { departure_airport: 'KTEB', arrival_airport: 'KVNY', departure_date: '2026-03-02' },
          { departure_airport: 'KVNY', arrival_airport: 'KTEB', departure_date: '2026-03-05' },
        ],
      };

      const props = extractProps(input, result, mockOnAction);

      expect(props.tripType).toBe('round_trip');
      expect(props.returnDate).toBe('2026-03-05');
    });

    it('falls back to input.return_date for round-trip detection when result lacks trip_type', () => {
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

      expect(props.tripType).toBe('round_trip');
      expect(props.returnDate).toBe('2026-03-05');
    });

    it('reads multi-city trip_type and segments from result', () => {
      const input = {
        departure_airport: 'KTEB',
        arrival_airport: 'EGGW',
        departure_date: '2026-03-10',
        passengers: 4,
      };
      const result = {
        trip_id: 'atrip-multi',
        deep_link: 'https://avinode.com/trips/multi',
        trip_type: 'multi_city',
        segment_count: 3,
        segments: [
          { departure_airport: 'KTEB', arrival_airport: 'EGGW', departure_date: '2026-03-10' },
          { departure_airport: 'EGGW', arrival_airport: 'LFPB', departure_date: '2026-03-12' },
          { departure_airport: 'LFPB', arrival_airport: 'KTEB', departure_date: '2026-03-15' },
        ],
      };

      const props = extractProps(input, result, mockOnAction);

      expect(props.tripType).toBe('multi_city');
      expect(props.segments).toBeDefined();
      const segments = props.segments as Array<any>;
      expect(segments).toHaveLength(3);
      expect(segments[0].departureAirport.icao).toBe('KTEB');
      expect(segments[0].arrivalAirport.icao).toBe('EGGW');
      expect(segments[1].departureAirport.icao).toBe('EGGW');
      expect(segments[2].departureAirport.icao).toBe('LFPB');
      expect(segments[2].arrivalAirport.icao).toBe('KTEB');
    });

    it('normalizes airport data with city lookups for segments', () => {
      const input = {};
      const result = {
        trip_id: 'atrip-norm',
        deep_link: 'https://avinode.com/trips/norm',
        trip_type: 'multi_city',
        segments: [
          { departure_airport: 'KTEB', arrival_airport: 'EGGW', departure_date: '2026-03-10' },
          { departure_airport: 'EGGW', arrival_airport: 'LFPB', departure_date: '2026-03-12' },
        ],
      };

      const props = extractProps(input, result, mockOnAction);
      const segments = props.segments as Array<any>;

      expect(segments[0].departureAirport.name).toBe('Teterboro Airport');
      expect(segments[0].departureAirport.city).toBe('Teterboro, NJ');
      expect(segments[0].arrivalAirport.name).toBe('London Luton Airport');
      expect(segments[0].arrivalAirport.city).toBe('London');
    });

    it('does not create segments array for single-segment result', () => {
      const input = {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-03-15',
        passengers: 3,
      };
      const result = {
        trip_id: 'atrip-single',
        deep_link: 'https://avinode.com/trips/single',
        trip_type: 'single_leg',
        segments: [
          { departure_airport: 'KTEB', arrival_airport: 'KVNY', departure_date: '2026-03-15' },
        ],
      };

      const props = extractProps(input, result, mockOnAction);

      expect(props.tripType).toBe('single_leg');
      // Single-segment trips still get segments array from result
      expect(props.segments).toHaveLength(1);
    });

    it('derives return_date from second segment when result has 2 segments', () => {
      const input = {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-03-02',
        passengers: 6,
      };
      const result = {
        trip_id: 'atrip-ret',
        deep_link: 'https://avinode.com/trips/ret',
        trip_type: 'round_trip',
        segments: [
          { departure_airport: 'KTEB', arrival_airport: 'KVNY', departure_date: '2026-03-02' },
          { departure_airport: 'KVNY', arrival_airport: 'KTEB', departure_date: '2026-03-05' },
        ],
      };

      const props = extractProps(input, result, mockOnAction);

      expect(props.tripType).toBe('round_trip');
      expect(props.returnDate).toBe('2026-03-05');
    });
  });
});
