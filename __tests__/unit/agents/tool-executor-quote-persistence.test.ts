/**
 * Unit tests for ONEK-363: get_rfq flow saves quotes to CRM database
 *
 * Tests that ToolExecutor.storeQuotesToCRM() upserts quote records into
 * the CRM quotes table after get_rfq returns flight data.
 *
 * @see agents/jetvision-agent/tool-executor.ts
 * @see ONEK-363
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase admin
const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockEq = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEq });
const mockUpsert = vi.fn();
const mockSelectUpsert = vi.fn();
const mockSingleUpsert = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'requests') {
        return { select: mockSelectFn };
      }
      if (table === 'quotes') {
        return { upsert: mockUpsert };
      }
      return {};
    }),
  },
  findRequestByTripId: vi.fn(),
}));

vi.mock('@/lib/supabase/mcp-helpers', () => ({
  queryTable: vi.fn(),
  insertRow: vi.fn(),
  updateRow: vi.fn(),
  countRows: vi.fn(),
}));

vi.mock('@/lib/services/proposal-service', () => ({
  createProposalWithResolution: vi.fn(),
  getProposalById: vi.fn(),
  getProposalsByRequest: vi.fn(),
  updateProposalSent: vi.fn(),
  updateProposalStatus: vi.fn(),
}));

vi.mock('@/lib/services/contract-service', () => ({
  getContractById: vi.fn(),
  getContractByNumber: vi.fn(),
  getContractsByRequest: vi.fn(),
  getContractsByProposal: vi.fn(),
  updateContractGenerated: vi.fn(),
  updateContractSent: vi.fn(),
  updateContractStatus: vi.fn(),
}));

describe('ONEK-363: ToolExecutor — storeQuotesToCRM', () => {
  let ToolExecutor: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup upsert chain
    mockSingleUpsert.mockResolvedValue({ data: { id: 'quote-uuid' }, error: null });
    mockSelectUpsert.mockReturnValue({ single: mockSingleUpsert });
    mockUpsert.mockReturnValue({ error: null });

    // Setup request lookup
    mockMaybeSingle.mockResolvedValue({ data: { id: 'request-uuid-123' }, error: null });

    // Import ToolExecutor
    const mod = await import('@/agents/jetvision-agent/tool-executor');
    ToolExecutor = (mod as any).ToolExecutor || (mod as any).default;
  });

  it('should upsert quotes to CRM quotes table from get_rfq result', async () => {
    const mockAvinodeMCP = {
      callTool: vi.fn().mockResolvedValue({
        trip_id: 'atrip-64956150',
        flights: [
          {
            quoteId: 'aquote-398402416',
            operatorName: 'Executive Jets',
            aircraftType: 'Heavy Jet',
            tailNumber: 'N123EJ',
            sellerPrice: { price: 45000, currency: 'USD' },
            schedule: { departureTime: '2025-02-15T10:00:00Z', arrivalTime: '2025-02-15T15:30:00Z' },
          },
          {
            quoteId: 'aquote-398402417',
            operatorName: 'Sky Charter',
            aircraftType: 'Super Midsize',
            sellerPrice: { price: 32000, currency: 'USD' },
            schedule: {},
          },
        ],
      }),
      isConnected: vi.fn().mockReturnValue(true),
    };

    // Create executor with mock context
    const executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: 'agent-789',
      requestId: null,
    });
    executor.setAvinodeMCP(mockAvinodeMCP);

    // Execute get_rfq
    await executor.execute('get_rfq', { rfq_id: 'atrip-64956150' });

    // Allow async storeQuotesToCRM to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have upserted 2 quotes
    expect(mockUpsert).toHaveBeenCalledTimes(2);

    // Check first quote
    const firstCall = mockUpsert.mock.calls[0][0];
    expect(firstCall.avinode_quote_id).toBe('aquote-398402416');
    expect(firstCall.operator_name).toBe('Executive Jets');
    expect(firstCall.aircraft_type).toBe('Heavy Jet');
    expect(firstCall.total_price).toBe(45000);
    expect(firstCall.status).toBe('received');
    expect(firstCall.request_id).toBe('request-uuid-123');

    // Check second quote
    const secondCall = mockUpsert.mock.calls[1][0];
    expect(secondCall.avinode_quote_id).toBe('aquote-398402417');
    expect(secondCall.operator_name).toBe('Sky Charter');
    expect(secondCall.total_price).toBe(32000);
  });

  it('should be idempotent — upsert on avinode_quote_id conflict', async () => {
    const mockAvinodeMCP = {
      callTool: vi.fn().mockResolvedValue({
        trip_id: 'atrip-123',
        flights: [
          {
            quoteId: 'aquote-same-id',
            operatorName: 'Test Op',
            aircraftType: 'Light Jet',
            sellerPrice: { price: 20000, currency: 'USD' },
          },
        ],
      }),
      isConnected: vi.fn().mockReturnValue(true),
    };

    const executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: 'agent-789',
      requestId: 'request-uuid-123',
    });
    executor.setAvinodeMCP(mockAvinodeMCP);

    // Execute twice
    await executor.execute('get_rfq', { rfq_id: 'atrip-123' });
    await new Promise(resolve => setTimeout(resolve, 100));
    await executor.execute('get_rfq', { rfq_id: 'atrip-123' });
    await new Promise(resolve => setTimeout(resolve, 100));

    // All upserts should use onConflict: 'avinode_quote_id'
    for (const call of mockUpsert.mock.calls) {
      expect(call[1]).toEqual({ onConflict: 'avinode_quote_id' });
    }
  });

  it('should skip quotes with no quoteId', async () => {
    const mockAvinodeMCP = {
      callTool: vi.fn().mockResolvedValue({
        trip_id: 'atrip-123',
        flights: [
          { operatorName: 'No ID Op', aircraftType: 'Unknown' }, // no quoteId
          { quoteId: 'aquote-valid', operatorName: 'Valid Op', aircraftType: 'Light' },
        ],
      }),
      isConnected: vi.fn().mockReturnValue(true),
    };

    const executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: 'agent-789',
      requestId: 'request-uuid-123',
    });
    executor.setAvinodeMCP(mockAvinodeMCP);

    await executor.execute('get_rfq', { rfq_id: 'atrip-123' });
    await new Promise(resolve => setTimeout(resolve, 100));

    // Only 1 quote should be upserted (the one with a valid quoteId)
    const quotesUpserts = mockUpsert.mock.calls.filter(
      (call: any[]) => call[0]?.avinode_quote_id
    );
    expect(quotesUpserts).toHaveLength(1);
    expect(quotesUpserts[0][0].avinode_quote_id).toBe('aquote-valid');
  });
});
