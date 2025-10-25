/**
 * Tests for /api/analytics route
 *
 * Tests GET endpoint for analytics metrics including requests summary,
 * quote conversion, agent performance, and revenue.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/analytics/route';

// Mock API utilities
vi.mock('@/lib/utils/api', () => ({
  getAuthenticatedAgent: vi.fn(),
  isErrorResponse: vi.fn(),
  withErrorHandling: vi.fn((handler) => handler),
  ErrorResponses: {
    badRequest: vi.fn((msg) => NextResponse.json({ error: msg }, { status: 400 })),
    internalError: vi.fn((msg, details) => NextResponse.json({ error: msg, details }, { status: 500 })),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { getAuthenticatedAgent, isErrorResponse } from '@/lib/utils/api';
import { supabase } from '@/lib/supabase/client';

describe('GET /api/analytics', () => {
  const mockISOAgent = { id: 'iso-agent-123' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    vi.mocked(isErrorResponse).mockReturnValue(true);

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=requests_summary&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for missing required parameters', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/analytics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Validation failed');
  });

  it('should return requests summary analytics', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const mockAnalytics = {
      total_requests: 50,
      completed: 35,
      in_progress: 10,
      cancelled: 5,
      average_turnaround_hours: 24.5,
    };

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockAnalytics,
      error: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=requests_summary&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analytics.total_requests).toBe(50);
    expect(data.analytics.completed).toBe(35);
    expect(supabase.rpc).toHaveBeenCalledWith('get_requests_summary', {
      p_agent_id: mockISOAgent.id,
      p_start_date: '2025-01-01T00:00:00Z',
      p_end_date: '2025-01-31T23:59:59Z',
      p_group_by: 'day',
    });
  });

  it('should return quote conversion analytics', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const mockAnalytics = {
      total_quotes: 150,
      accepted: 45,
      rejected: 90,
      pending: 15,
      conversion_rate: 0.30,
      average_quotes_per_request: 3.0,
    };

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockAnalytics,
      error: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=quote_conversion&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analytics.total_quotes).toBe(150);
    expect(data.analytics.conversion_rate).toBe(0.30);
    expect(supabase.rpc).toHaveBeenCalledWith('get_quote_conversion', {
      p_agent_id: mockISOAgent.id,
      p_start_date: '2025-01-01T00:00:00Z',
      p_end_date: '2025-01-31T23:59:59Z',
    });
  });

  it('should return agent performance analytics', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const mockAnalytics = {
      total_executions: 200,
      successful: 185,
      failed: 15,
      success_rate: 0.925,
      average_execution_time_ms: 1250,
      by_agent_type: [
        { agent_type: 'orchestrator', executions: 50, success_rate: 0.98 },
        { agent_type: 'flight_search', executions: 50, success_rate: 0.94 },
        { agent_type: 'proposal_analysis', executions: 50, success_rate: 0.92 },
        { agent_type: 'communication', executions: 50, success_rate: 0.88 },
      ],
    };

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockAnalytics,
      error: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=agent_performance&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analytics.total_executions).toBe(200);
    expect(data.analytics.success_rate).toBe(0.925);
    expect(data.analytics.by_agent_type).toHaveLength(4);
  });

  it('should return revenue analytics', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const mockAnalytics = {
      total_revenue: 875000,
      total_bookings: 35,
      average_booking_value: 25000,
      currency: 'USD',
    };

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockAnalytics,
      error: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=revenue&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analytics.total_revenue).toBe(875000);
    expect(data.analytics.average_booking_value).toBe(25000);
  });

  it('should return 500 on database error', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=requests_summary&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
