/**
 * Tests for /api/analytics route
 *
 * Tests GET endpoint for analytics metrics.
 * Note: Most analytics functionality is stubbed pending Supabase RPC function creation.
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
    expect(data.error).toContain('Missing required parameters');
  });

  it('should return 400 for invalid metric type', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=invalid_metric&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid metric');
  });

  it('should return placeholder response for requests_summary metric (RPC not implemented)', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=requests_summary&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analytics).toEqual([]);
    expect(data.metric).toBe('requests_summary');
    expect(data.period.start_date).toBe('2025-01-01T00:00:00Z');
    expect(data.period.end_date).toBe('2025-01-31T23:59:59Z');
    expect(data.message).toContain('RPC functions not yet implemented');
  });

  it('should return placeholder response for quote_conversion metric (RPC not implemented)', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=quote_conversion&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analytics).toEqual([]);
    expect(data.metric).toBe('quote_conversion');
  });

  it('should return placeholder response for agent_performance metric (RPC not implemented)', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=agent_performance&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analytics).toEqual([]);
    expect(data.metric).toBe('agent_performance');
  });

  it('should return placeholder response for revenue metric (RPC not implemented)', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=revenue&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analytics).toEqual([]);
    expect(data.metric).toBe('revenue');
  });

  it('should respect group_by parameter with default value', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=requests_summary&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.group_by).toBe('day');
  });

  it('should use custom group_by parameter when provided', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost:3000/api/analytics?metric=requests_summary&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z&group_by=week'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.group_by).toBe('week');
  });
});
