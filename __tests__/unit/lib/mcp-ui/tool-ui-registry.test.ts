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
  EmptyLegWatchCreated: vi.fn(),
  EmptyLegWatchList: vi.fn(),
  EmptyLegMatchViewer: vi.fn(),
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

  // ONEK-202: Empty Leg Watch tool registrations
  describe('empty leg watch tools', () => {
    it('registers create_empty_leg_watch', () => {
      expect(getToolUIEntry('create_empty_leg_watch')).toBeDefined();
    });

    it('registers get_empty_leg_watches', () => {
      expect(getToolUIEntry('get_empty_leg_watches')).toBeDefined();
    });

    it('registers get_watch_matches', () => {
      expect(getToolUIEntry('get_watch_matches')).toBeDefined();
    });

    it('extracts create_empty_leg_watch props', () => {
      const extractProps = TOOL_UI_REGISTRY.create_empty_leg_watch.extractProps;
      const input = {
        departure_airport: 'KTEB',
        arrival_airport: 'KMIA',
        date_range_start: '2026-03-01',
        date_range_end: '2026-03-15',
        passengers: 4,
        max_price: 25000,
      };
      const result = {
        watch_id: 'watch-1',
        status: 'active',
        departure_airport: 'KTEB',
        arrival_airport: 'KMIA',
        date_range: { start: '2026-03-01', end: '2026-03-15' },
        passengers: 4,
        matches_count: 0,
      };

      const props = extractProps(input, result, mockOnAction);

      expect(props.watchId).toBe('watch-1');
      expect(props.status).toBe('active');
      expect(props.departureAirport).toBe('KTEB');
      expect(props.arrivalAirport).toBe('KMIA');
      expect(props.passengers).toBe(4);
      expect(props.maxPrice).toBe(25000);
      expect(props.matchesCount).toBe(0);
    });

    it('extracts get_empty_leg_watches props', () => {
      const extractProps = TOOL_UI_REGISTRY.get_empty_leg_watches.extractProps;
      const result = {
        watches: [
          {
            watch_id: 'w1',
            status: 'active',
            departure_airport: 'KTEB',
            arrival_airport: 'KMIA',
            date_range: { start: '2026-03-01', end: '2026-03-15' },
            passengers: 4,
            matches_count: 3,
            created_at: '2026-02-20T10:00:00Z',
            expires_at: '2026-05-20T10:00:00Z',
          },
        ],
      };

      const props = extractProps({}, result, mockOnAction);
      const watches = props.watches as Array<Record<string, unknown>>;

      expect(watches).toHaveLength(1);
      expect(watches[0].watch_id).toBe('w1');
      expect(watches[0].status).toBe('active');
      expect(watches[0].matches_count).toBe(3);
    });

    it('extracts get_watch_matches props', () => {
      const extractProps = TOOL_UI_REGISTRY.get_watch_matches.extractProps;
      const result = {
        watch_id: 'w1',
        total_count: 2,
        unviewed_count: 1,
        matches: [
          {
            match_id: 'm1',
            watch_id: 'w1',
            empty_leg_id: 'el-1',
            departure: { airport: 'KTEB', date: '2026-03-05' },
            arrival: { airport: 'KMIA' },
            price: 18000,
            currency: 'USD',
            aircraft: { type: 'Citation XLS', model: 'XLS+', category: 'midsize', capacity: 8 },
            operator: { id: 'op-1', name: 'Jet Aviation' },
            viewed: false,
            interested: false,
            matched_at: '2026-02-20T12:00:00Z',
          },
        ],
      };

      const props = extractProps({}, result, mockOnAction);

      expect(props.watchId).toBe('w1');
      expect(props.totalCount).toBe(2);
      expect(props.unviewedCount).toBe(1);
      const matches = props.matches as Array<Record<string, unknown>>;
      expect(matches).toHaveLength(1);
      expect(matches[0].match_id).toBe('m1');
      expect(matches[0].price).toBe(18000);
    });
  });
});
