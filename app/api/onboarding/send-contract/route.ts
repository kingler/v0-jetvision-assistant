/**
 * POST /api/onboarding/send-contract
 *
 * Sends the onboarding contract to the agent via email with a secure review link.
 * Creates a contract token, sends the email, and updates onboarding_status to 'contract_sent'.
 *
 * Expects body: { contractId: string, pdfBase64: string, fileName: string }
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import {
  createContractToken,
  updateOnboardingStatus,
} from '@/lib/services/onboarding-service';
import { sendOnboardingContractEmail } from '@/lib/services/email-service';
import { ErrorResponses, SuccessResponses } from '@/lib/utils/api';

export const dynamic = 'force-dynamic';

// Untyped client for new columns not yet in generated Supabase types
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const { contractId, pdfBase64, fileName } = body;

    if (!contractId || !pdfBase64 || !fileName) {
      return ErrorResponses.badRequest('Missing contractId, pdfBase64, or fileName');
    }

    // Get agent (uses untyped client for new columns like commission_percentage)
    const { data: agent, error: agentError } = await db
      .from('iso_agents')
      .select('id, email, full_name, commission_percentage')
      .eq('clerk_user_id', userId)
      .single();

    if (agentError || !agent) {
      return ErrorResponses.notFound('ISO agent not found');
    }

    // Create secure token
    const tokenResult = await createContractToken(
      contractId,
      agent.id,
      agent.email
    );

    if (!tokenResult) {
      return ErrorResponses.internalError('Failed to create contract token');
    }

    // Build review URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';
    const contractReviewUrl = `${baseUrl}/onboarding/contract-review/${tokenResult.token}`;

    // Send email
    const emailResult = await sendOnboardingContractEmail({
      to: agent.email,
      agentName: agent.full_name,
      contractReviewUrl,
      pdfBase64,
      pdfFilename: fileName,
      commissionPercentage: Number(agent.commission_percentage) || 10,
    });

    if (!emailResult.success) {
      console.error('[/api/onboarding/send-contract] Email failed:', emailResult.error);
      return ErrorResponses.internalError(`Failed to send email: ${emailResult.error}`);
    }

    // Update onboarding status
    await updateOnboardingStatus(agent.id, 'contract_sent');

    return SuccessResponses.ok({
      success: true,
      messageId: emailResult.messageId,
    });
  } catch (error) {
    console.error('[/api/onboarding/send-contract] Error:', error);
    return ErrorResponses.internalError();
  }
}
