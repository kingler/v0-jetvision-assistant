/**
 * POST /api/onboarding/register
 *
 * Registers an ISO agent's personal details from the onboarding form.
 * Updates the existing iso_agents row (created by Clerk webhook)
 * and transitions onboarding_status from 'pending' to 'profile_complete'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { onboardingFormSchema } from '@/lib/validations/onboarding';
import { registerAgent } from '@/lib/services/onboarding-service';
import { ErrorResponses, SuccessResponses } from '@/lib/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const parsed = onboardingFormSchema.safeParse(body);

    if (!parsed.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        parsed.error.flatten().fieldErrors
      );
    }

    const result = await registerAgent(userId, parsed.data);

    if (!result.success) {
      return ErrorResponses.internalError(result.error);
    }

    return SuccessResponses.ok({
      agentId: result.agentId,
      onboardingStatus: result.onboardingStatus,
    });
  } catch (error) {
    console.error('[/api/onboarding/register] Error:', error);
    return ErrorResponses.internalError();
  }
}
