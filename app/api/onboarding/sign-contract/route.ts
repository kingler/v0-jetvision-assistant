/**
 * POST /api/onboarding/sign-contract
 *
 * Captures the digital signature for an onboarding contract.
 * Validates the token, records signature data, marks token as used,
 * and transitions onboarding_status to 'completed'.
 *
 * Expects body: { token: string, signedName: string, acknowledgeSignature: boolean }
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contractSignatureSchema } from '@/lib/validations/onboarding';
import { signContract } from '@/lib/services/onboarding-service';
import { ErrorResponses, SuccessResponses } from '@/lib/utils/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const parsed = contractSignatureSchema.safeParse(body);

    if (!parsed.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        parsed.error.flatten().fieldErrors
      );
    }

    // Get IP address for audit trail
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const result = await signContract(
      parsed.data.token,
      parsed.data.signedName,
      ipAddress
    );

    if (!result.success) {
      return ErrorResponses.badRequest(result.error || 'Failed to sign contract');
    }

    return SuccessResponses.ok({
      success: true,
      message: 'Contract signed successfully. Welcome to Jetvision!',
    });
  } catch (error) {
    console.error('[/api/onboarding/sign-contract] Error:', error);
    return ErrorResponses.internalError();
  }
}
