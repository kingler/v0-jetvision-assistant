/**
 * Unit tests for chat-session-to-ui.ts mapping functions
 *
 * Tests the conversion of database ChatSessionRow data to UI ChatSession format,
 * specifically verifying that all 10 workflow stages are correctly mapped.
 *
 * Related issues: ONEK-256, ONEK-275
 */
import { describe, it, expect } from 'vitest';
import { chatSessionToUIFormat } from '@/lib/utils/chat-session-to-ui';
import { FLIGHT_REQUEST_STAGES, type FlightRequestStage } from '@/components/flight-request-stage-badge';

/**
 * Minimal ChatSessionRow factory for testing.
 * Only includes fields that affect status/step/progress mapping.
 */
function makeChatSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-session-id',
    conversation_id: null,
    request_id: 'test-request-id',
    iso_agent_id: 'agent-1',
    status: 'active' as const,
    avinode_trip_id: null,
    avinode_rfq_id: null,
    primary_quote_id: null,
    proposal_id: null,
    session_started_at: '2026-01-01T00:00:00Z',
    session_ended_at: null,
    last_activity_at: '2026-01-01T00:00:00Z',
    current_step: null as string | null,
    workflow_state: null,
    message_count: null,
    quotes_received_count: null,
    quotes_expected_count: null,
    operators_contacted_count: null,
    metadata: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    request: {
      id: 'test-request-id',
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      departure_date: '2026-03-01',
      return_date: null,
      trip_type: 'one_way',
      passengers: 4,
      aircraft_type: null,
      budget: null,
      status: 'pending',
      avinode_trip_id: null,
      avinode_rfq_id: null,
      avinode_deep_link: null,
      created_at: '2026-01-01T00:00:00Z',
    },
    conversation: null,
    rfqFlights: [],
    ...overrides,
  };
}

// Expected step numbers for each stage
const EXPECTED_STEPS: Record<FlightRequestStage, number> = {
  understanding_request: 1,
  searching_aircraft: 2,
  requesting_quotes: 3,
  analyzing_options: 4,
  proposal_ready: 5,
  proposal_sent: 6,
  contract_generated: 7,
  contract_sent: 8,
  payment_pending: 9,
  closed_won: 10,
};

describe('chatSessionToUIFormat', () => {
  describe('primary path: current_step → status mapping', () => {
    it.each(FLIGHT_REQUEST_STAGES)(
      'maps current_step="%s" to correct status and step number',
      (stage) => {
        const row = makeChatSessionRow({ current_step: stage });
        const result = chatSessionToUIFormat(row);

        expect(result.status).toBe(stage);
        expect(result.currentStep).toBe(EXPECTED_STEPS[stage]);
        expect(result.totalSteps).toBe(10);
      }
    );

    it('defaults to understanding_request when current_step is null', () => {
      const row = makeChatSessionRow({ current_step: null });
      const result = chatSessionToUIFormat(row);

      // Falls through to request.status fallback (pending → understanding_request)
      expect(result.status).toBe('understanding_request');
      expect(result.currentStep).toBe(1);
    });

    it('defaults to understanding_request for unknown current_step', () => {
      const row = makeChatSessionRow({ current_step: 'nonexistent_stage' });
      const result = chatSessionToUIFormat(row);

      expect(result.status).toBe('understanding_request');
      expect(result.currentStep).toBe(1);
    });
  });

  describe('fallback path: request.status → status mapping (when current_step is null)', () => {
    const REQUEST_STATUS_TO_UI: Array<[string, string, number]> = [
      // [request.status, expected UI status, expected step]
      ['trip_created', 'searching_aircraft', 2],
      ['searching_flights', 'searching_aircraft', 2],
      ['awaiting_user_action', 'searching_aircraft', 2],
      ['avinode_session_active', 'searching_aircraft', 2],
      ['awaiting_quotes', 'requesting_quotes', 3],
      ['monitoring_for_quotes', 'requesting_quotes', 3],
      ['analyzing_proposals', 'analyzing_options', 4],
      ['generating_email', 'analyzing_options', 4],
      ['sending_proposal', 'proposal_ready', 5],
      ['proposal_sent', 'proposal_sent', 6],
      ['contract_generated', 'contract_generated', 7],
      ['contract_sent', 'contract_sent', 8],
      ['payment_pending', 'payment_pending', 9],
      ['completed', 'closed_won', 10],
      ['closed_won', 'closed_won', 10],
    ];

    it.each(REQUEST_STATUS_TO_UI)(
      'request.status="%s" → status="%s", step=%d (when current_step is null)',
      (requestStatus, expectedStatus, expectedStep) => {
        const row = makeChatSessionRow({
          current_step: null,
          request: {
            id: 'test-request-id',
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            departure_date: '2026-03-01',
            return_date: null,
            trip_type: 'one_way',
            passengers: 4,
            aircraft_type: null,
            budget: null,
            status: requestStatus,
            avinode_trip_id: null,
            avinode_rfq_id: null,
            avinode_deep_link: null,
            created_at: '2026-01-01T00:00:00Z',
          },
        });
        const result = chatSessionToUIFormat(row);

        expect(result.status).toBe(expectedStatus);
        expect(result.currentStep).toBe(expectedStep);
      }
    );
  });

  describe('totalSteps is always 10', () => {
    it('returns totalSteps=10 regardless of stage', () => {
      for (const stage of FLIGHT_REQUEST_STAGES) {
        const row = makeChatSessionRow({ current_step: stage });
        const result = chatSessionToUIFormat(row);
        expect(result.totalSteps).toBe(10);
      }
    });
  });

  describe('progress bar calculation correctness', () => {
    it.each([
      ['understanding_request', 10],
      ['searching_aircraft', 20],
      ['requesting_quotes', 30],
      ['analyzing_options', 40],
      ['proposal_ready', 50],
      ['proposal_sent', 60],
      ['contract_generated', 70],
      ['contract_sent', 80],
      ['payment_pending', 90],
      ['closed_won', 100],
    ] as [FlightRequestStage, number][])(
      'stage "%s" → progress bar %d%%',
      (stage, expectedPercent) => {
        const row = makeChatSessionRow({ current_step: stage });
        const result = chatSessionToUIFormat(row);

        const progressPercent = Math.min(
          (result.currentStep / result.totalSteps) * 100,
          100
        );
        expect(progressPercent).toBe(expectedPercent);
      }
    );
  });

  describe('rfqFlights passthrough', () => {
    it('passes through rfqFlights from the row', () => {
      const mockRfqs = [
        { id: 'q1', rfqStatus: 'quoted', totalPrice: 50000 },
        { id: 'q2', rfqStatus: 'sent', totalPrice: null },
      ];
      const row = makeChatSessionRow({ rfqFlights: mockRfqs });
      const result = chatSessionToUIFormat(row);

      expect(result.rfqFlights).toHaveLength(2);
    });

    it('defaults to empty array when rfqFlights is undefined', () => {
      const row = makeChatSessionRow({ rfqFlights: undefined });
      const result = chatSessionToUIFormat(row);

      expect(result.rfqFlights).toEqual([]);
    });
  });

  describe('quote statistics', () => {
    it('prefers database count fields over computing from rfqFlights', () => {
      const row = makeChatSessionRow({
        quotes_received_count: 3,
        quotes_expected_count: 5,
        rfqFlights: [{ id: 'q1', rfqStatus: 'quoted' }],
      });
      const result = chatSessionToUIFormat(row);

      expect(result.quotesReceived).toBe(3);
      expect(result.quotesTotal).toBe(5);
    });

    it('falls back to computing from rfqFlights when DB counts are null', () => {
      const row = makeChatSessionRow({
        quotes_received_count: null,
        quotes_expected_count: null,
        rfqFlights: [
          { id: 'q1', rfqStatus: 'quoted' },
          { id: 'q2', rfqStatus: 'sent' },
          { id: 'q3', rfqStatus: 'quoted' },
        ],
      });
      const result = chatSessionToUIFormat(row);

      expect(result.quotesReceived).toBe(2); // 2 with rfqStatus 'quoted'
      expect(result.quotesTotal).toBe(3); // total rfqFlights length
    });
  });
});
