/**
 * POST /api/onboarding/generate-contract
 *
 * Generates an employment commission contract PDF for the authenticated agent.
 * Stores the PDF in Supabase Storage and creates an onboarding_contracts record.
 * Requires onboarding_status = 'profile_complete'.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { generateOnboardingContract } from '@/lib/pdf/onboarding-contract-generator';
import {
  getAgentForContractGeneration,
  createContractRecord,
} from '@/lib/services/onboarding-service';
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

    // Get agent by clerk_user_id (uses untyped client for new columns)
    const { data: agentRow, error: agentError } = await db
      .from('iso_agents')
      .select('id, onboarding_status')
      .eq('clerk_user_id', userId)
      .single();

    if (agentError || !agentRow) {
      return ErrorResponses.notFound('ISO agent not found');
    }

    if (agentRow.onboarding_status !== 'profile_complete') {
      return ErrorResponses.badRequest(
        `Cannot generate contract. Current status: ${agentRow.onboarding_status}`
      );
    }

    // Get full agent data for contract
    const agent = await getAgentForContractGeneration(agentRow.id);
    if (!agent) {
      return ErrorResponses.internalError('Failed to load agent data');
    }

    // Generate PDF
    const contractOutput = await generateOnboardingContract({
      agentId: agent.id,
      agentName: agent.full_name,
      agentEmail: agent.email,
      agentAddress: agent.address_line_1 || '',
      agentCity: agent.city || '',
      agentState: agent.state || '',
      agentZipCode: agent.zip_code || '',
      agentDateOfBirth: agent.date_of_birth || '',
      commissionPercentage: Number(agent.commission_percentage) || 10,
    });

    // Upload to Supabase Storage (uses untyped client)
    const storagePath = `onboarding/${agent.id}/${contractOutput.fileName}`;
    const { error: uploadError } = await db.storage
      .from('contracts')
      .upload(storagePath, contractOutput.pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[/api/onboarding/generate-contract] Upload error:', uploadError);
      return ErrorResponses.internalError('Failed to store contract PDF');
    }

    // Create contract record
    const contractResult = await createContractRecord(
      agent.id,
      storagePath,
      Number(agent.commission_percentage) || 10
    );

    if (!contractResult.success) {
      return ErrorResponses.internalError(contractResult.error);
    }

    return SuccessResponses.ok({
      contractId: contractResult.contractId,
      pdfStoragePath: storagePath,
      fileName: contractOutput.fileName,
      pdfBase64: contractOutput.pdfBase64,
    });
  } catch (error) {
    console.error('[/api/onboarding/generate-contract] Error:', error);
    return ErrorResponses.internalError();
  }
}
