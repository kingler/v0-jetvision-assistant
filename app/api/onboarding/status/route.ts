/**
 * GET /api/onboarding/status
 *
 * Returns the authenticated user's onboarding status and next action.
 * Used by the onboarding page to resume from the correct step.
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOnboardingStatus } from '@/lib/services/onboarding-service';
import { ErrorResponses, SuccessResponses } from '@/lib/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ErrorResponses.unauthorized();
    }

    const status = await getOnboardingStatus(userId);

    if (!status) {
      return ErrorResponses.notFound('ISO agent not found');
    }

    // Determine the next action based on status
    let nextAction: string;
    switch (status.onboardingStatus) {
      case 'pending':
        nextAction = 'complete_profile';
        break;
      case 'profile_complete':
        nextAction = 'generate_contract';
        break;
      case 'contract_sent':
        nextAction = 'check_email';
        break;
      case 'contract_signed':
      case 'completed':
        nextAction = 'done';
        break;
      default:
        nextAction = 'complete_profile';
    }

    return SuccessResponses.ok({
      ...status,
      nextAction,
    });
  } catch (error) {
    console.error('[/api/onboarding/status] Error:', error);
    return ErrorResponses.internalError();
  }
}
