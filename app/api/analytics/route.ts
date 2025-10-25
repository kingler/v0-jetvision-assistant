/**
 * Analytics API Route - Usage analytics and metrics
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import { validateQueryParams } from '@/lib/validation';
import { AnalyticsGetSchema } from '@/lib/validation/api-schemas';

/**
 * GET /api/analytics
 * Retrieve analytics metrics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const validation = validateQueryParams(searchParams, AnalyticsGetSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { metric, start_date, end_date, iso_agent_id, group_by = 'day' } = validation.data;

    // Get ISO agent
    const { data: isoAgent, error: agentError } = await supabase
      .from('iso_agents')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (agentError || !isoAgent) {
      return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });
    }

    // Use the provided iso_agent_id or default to current user's agent
    const targetAgentId = iso_agent_id || isoAgent.id;

    // TODO: In production, these would be implemented as PostgreSQL functions
    // For now, we'll return mock data based on the metric type
    let analyticsData;

    switch (metric) {
      case 'requests_summary':
        analyticsData = await getRequestsSummary(targetAgentId, start_date, end_date, group_by);
        break;
      case 'quote_conversion':
        analyticsData = await getQuoteConversion(targetAgentId, start_date, end_date);
        break;
      case 'agent_performance':
        analyticsData = await getAgentPerformance(targetAgentId, start_date, end_date);
        break;
      case 'response_times':
        analyticsData = await getResponseTimes(targetAgentId, start_date, end_date);
        break;
      case 'revenue':
        analyticsData = await getRevenue(targetAgentId, start_date, end_date);
        break;
      default:
        return NextResponse.json({ error: 'Invalid metric type' }, { status: 400 });
    }

    if (analyticsData.error) {
      return NextResponse.json(
        { error: 'Failed to fetch analytics', details: analyticsData.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analytics: analyticsData.data,
      metric,
      period: { start_date, end_date },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get requests summary analytics
 */
async function getRequestsSummary(
  agentId: string,
  startDate: string,
  endDate: string,
  groupBy: string
) {
  // TODO: Implement actual database query
  // For now, using RPC call which can be implemented as a PostgreSQL function
  const { data, error } = await supabase.rpc('get_requests_summary', {
    p_agent_id: agentId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_group_by: groupBy,
  });

  return { data, error };
}

/**
 * Get quote conversion analytics
 */
async function getQuoteConversion(agentId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_quote_conversion', {
    p_agent_id: agentId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  return { data, error };
}

/**
 * Get agent performance analytics
 */
async function getAgentPerformance(agentId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_agent_performance', {
    p_agent_id: agentId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  return { data, error };
}

/**
 * Get response times analytics
 */
async function getResponseTimes(agentId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_response_times', {
    p_agent_id: agentId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  return { data, error };
}

/**
 * Get revenue analytics
 */
async function getRevenue(agentId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_revenue_analytics', {
    p_agent_id: agentId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  return { data, error };
}
