/**
 * Analytics API Route - Usage analytics and metrics
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { validateQueryParams } from '@/lib/validation';
import { AnalyticsGetSchema } from '@/lib/validation/api-schemas';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  withErrorHandling,
  ErrorResponses,
} from '@/lib/utils/api';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

/**
 * Metric configuration mapping metrics to RPC functions
 */
const METRIC_CONFIG: Record<
  string,
  { rpc: string; needsGroupBy?: boolean }
> = {
  requests_summary: { rpc: 'get_requests_summary', needsGroupBy: true },
  quote_conversion: { rpc: 'get_quote_conversion' },
  agent_performance: { rpc: 'get_agent_performance' },
  response_times: { rpc: 'get_response_times' },
  revenue: { rpc: 'get_revenue_analytics' },
};

/**
 * GET /api/analytics
 * Retrieve analytics metrics for the authenticated user
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Authenticate and get ISO agent
  const isoAgentOrError = await getAuthenticatedAgent();
  if (isErrorResponse(isoAgentOrError)) return isoAgentOrError;
  const isoAgent = isoAgentOrError;

  // Validate query parameters
  const { searchParams } = new URL(request.url);
  const validation = validateQueryParams(searchParams, AnalyticsGetSchema);
  if (!validation.success) {
    return validation.response;
  }
  const { metric, start_date, end_date, iso_agent_id, group_by = 'day' } = validation.data;

  // Use the provided iso_agent_id or default to current user's agent
  const targetAgentId = iso_agent_id || isoAgent.id;

  // Get metric configuration
  const cfg = METRIC_CONFIG[metric];
  if (!cfg) {
    return ErrorResponses.badRequest('Invalid metric type');
  }

  // Build RPC parameters
  const params: Record<string, unknown> = {
    p_agent_id: targetAgentId,
    p_start_date: start_date,
    p_end_date: end_date,
    ...(cfg.needsGroupBy && { p_group_by: group_by }),
  };

  // Call PostgreSQL RPC function
  const { data, error } = await supabase.rpc(cfg.rpc, params);

  if (error) {
    return ErrorResponses.internalError('Failed to fetch analytics', error);
  }

  return NextResponse.json({
    analytics: data,
    metric,
    period: { start_date, end_date },
  });
});
