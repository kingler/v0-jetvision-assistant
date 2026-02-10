/**
 * GET /api/onboarding/status
 *
 * Returns the authenticated agent's onboarding status.
 * Requires Clerk authentication.
 *
 * @returns { onboardingStatus: string }
 */
import { NextResponse } from 'next/server';
import { getAuthenticatedAgent, isErrorResponse, ErrorResponses } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const agentOrError = await getAuthenticatedAgent();
    if (isErrorResponse(agentOrError)) return agentOrError;

    const { data, error } = await supabaseAdmin
      .from('iso_agents')
      .select('onboarding_status')
      .eq('id', agentOrError.id)
      .single();

    if (error) {
      return ErrorResponses.internalError('Failed to fetch onboarding status');
    }

    return NextResponse.json({ onboardingStatus: data.onboarding_status });
  } catch {
    return ErrorResponses.internalError('Failed to fetch onboarding status');
  }
}
