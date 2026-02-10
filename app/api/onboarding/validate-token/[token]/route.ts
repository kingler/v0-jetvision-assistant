/**
 * GET /api/onboarding/validate-token/[token]
 *
 * Validates a contract review token.
 * Returns contract details if the token is valid, or an error with a specific error code.
 *
 * Token security:
 * - 256-bit entropy (crypto.randomBytes(32))
 * - 72-hour expiration
 * - Single-use (marked as used after signature)
 * - Email-bound (optional: checks against authenticated user's email)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { validateContractToken } from '@/lib/services/onboarding-service';
import { ErrorResponses, SuccessResponses } from '@/lib/utils/api';

export const dynamic = 'force-dynamic';

// Untyped client for queries involving new tables/columns
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return ErrorResponses.badRequest('Token is required');
    }

    // Get the authenticated user's email for email-binding check
    const { userId } = await auth();
    let authenticatedEmail: string | undefined;

    if (userId) {
      const { data: agent } = await db
        .from('iso_agents')
        .select('email')
        .eq('clerk_user_id', userId)
        .single();

      authenticatedEmail = agent?.email;
    }

    const result = await validateContractToken(token, authenticatedEmail);

    if (!result.valid) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        EXPIRED: 410,
        USED: 410,
        EMAIL_MISMATCH: 403,
      };

      const status = statusMap[result.errorCode || 'NOT_FOUND'] || 400;

      return new Response(
        JSON.stringify({
          error: result.error,
          errorCode: result.errorCode,
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get a signed URL for the PDF (valid for 1 hour)
    let pdfUrl: string | undefined;
    if (result.pdfStoragePath) {
      const { data: signedUrlData } = await db.storage
        .from('contracts')
        .createSignedUrl(result.pdfStoragePath, 3600);

      pdfUrl = signedUrlData?.signedUrl;
    }

    return SuccessResponses.ok({
      valid: true,
      contractId: result.contractId,
      agentEmail: result.agentEmail,
      pdfUrl,
    });
  } catch (error) {
    console.error('[/api/onboarding/validate-token] Error:', error);
    return ErrorResponses.internalError();
  }
}
