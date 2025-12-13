/**
 * Analytics API Route - Usage analytics and metrics
 *
 * Note: This route is currently stubbed as the custom RPC functions
 * (get_requests_summary, get_quote_conversion, etc.) need to be created
 * in Supabase before this route can be fully implemented.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  withErrorHandling,
  ErrorResponses,
} from '@/lib/utils/api';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

/**
 * Supported metrics (will be implemented when RPC functions are created)
 */
const SUPPORTED_METRICS = [
  'requests_summary',
  'quote_conversion',
  'agent_performance',
  'response_times',
  'revenue',
] as const;

type MetricType = typeof SUPPORTED_METRICS[number];

/**
 * GET /api/analytics
 * Retrieve analytics metrics for the authenticated user
 *
 * Query parameters:
 * - metric: string (required) - One of: requests_summary, quote_conversion, agent_performance, response_times, revenue
 * - start_date: string (required) - ISO date string
 * - end_date: string (required) - ISO date string
 * - iso_agent_id?: string - Filter by specific agent
 * - group_by?: 'day' | 'week' | 'month' - Grouping interval (default: 'day')
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Authenticate
  const isoAgentOrError = await getAuthenticatedAgent();
  if (isErrorResponse(isoAgentOrError)) return isoAgentOrError;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const metric = searchParams.get('metric') as MetricType | null;
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const groupBy = searchParams.get('group_by') || 'day';

  // Validate required parameters
  if (!metric || !startDate || !endDate) {
    return ErrorResponses.badRequest('Missing required parameters: metric, start_date, end_date');
  }

  // Validate metric type
  if (!SUPPORTED_METRICS.includes(metric)) {
    return ErrorResponses.badRequest(`Invalid metric. Must be one of: ${SUPPORTED_METRICS.join(', ')}`);
  }

  // TODO: Implement RPC function calls when they are created in Supabase
  // For now, return placeholder data
  return NextResponse.json({
    analytics: [],
    metric,
    period: { start_date: startDate, end_date: endDate },
    group_by: groupBy,
    message: 'Analytics RPC functions not yet implemented. Please create the required PostgreSQL functions in Supabase.',
  });
});
