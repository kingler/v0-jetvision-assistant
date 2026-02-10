/**
 * POST /api/onboarding/submit
 *
 * Atomic onboarding submission endpoint.
 * Validates form data, updates agent profile, generates a commission contract PDF,
 * uploads to storage, creates a contract record with a secure review token,
 * and emails the contract to the agent.
 *
 * Requires Clerk authentication.
 */
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getAuthenticatedAgent, isErrorResponse, ErrorResponses, SuccessResponses } from '@/lib/utils/api';
import { supabaseAdmin, uploadContractPdf } from '@/lib/supabase/admin';
import { onboardingFormSchema } from '@/lib/validations/onboarding-form-schema';
import { generateOnboardingContract } from '@/lib/pdf/onboarding-contract-generator';
import { sendEmail } from '@/lib/services/email-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const agentOrError = await getAuthenticatedAgent();
    if (isErrorResponse(agentOrError)) return agentOrError;

    // 2. Parse and validate form data
    const body = await request.json();
    const parsed = onboardingFormSchema.safeParse(body);
    if (!parsed.success) {
      return ErrorResponses.badRequest('Validation failed', parsed.error.flatten());
    }
    const form = parsed.data;

    // 3. Check current onboarding status
    const { data: agent } = await supabaseAdmin
      .from('iso_agents')
      .select('id, email, onboarding_status, commission_percentage')
      .eq('id', agentOrError.id)
      .single();

    if (!agent) {
      return ErrorResponses.notFound('Agent not found');
    }
    if (agent.onboarding_status === 'completed') {
      return ErrorResponses.badRequest('Onboarding already completed');
    }

    // 4. Update agent profile with form data
    const { error: updateError } = await supabaseAdmin
      .from('iso_agents')
      .update({
        first_name: form.firstName,
        last_name: form.lastName,
        date_of_birth: form.dateOfBirth,
        phone: form.phone,
        street_address: form.streetAddress,
        address_line_2: form.addressLine2 || null,
        city: form.city,
        state: form.state,
        zip_code: form.zipCode,
        country: form.country,
      })
      .eq('id', agent.id);

    if (updateError) {
      return ErrorResponses.internalError('Failed to update profile');
    }

    // 5. Generate contract PDF
    const address = [
      form.streetAddress,
      form.addressLine2,
      form.city,
      form.state,
      form.zipCode,
      form.country,
    ]
      .filter(Boolean)
      .join(', ');

    const { pdfBuffer, pdfBase64, fileName } = await generateOnboardingContract({
      agentName: `${form.firstName} ${form.lastName}`,
      agentEmail: agent.email,
      agentAddress: address,
      agentDOB: form.dateOfBirth,
      commissionPercentage: agent.commission_percentage ?? 10,
      effectiveDate: new Date().toISOString().split('T')[0],
    });

    // 6. Upload PDF to Supabase Storage
    const storagePath = `onboarding/${agent.id}/${fileName}`;
    const uploadResult = await uploadContractPdf(pdfBuffer, storagePath, agent.id);
    if (!uploadResult.success) {
      return ErrorResponses.internalError('Failed to upload contract PDF');
    }

    // 7. Create onboarding_contracts row
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('onboarding_contracts')
      .insert({
        agent_id: agent.id,
        pdf_storage_path: storagePath,
        commission_percentage: agent.commission_percentage ?? 10,
      })
      .select('id')
      .single();

    if (contractError || !contract) {
      return ErrorResponses.internalError('Failed to create contract record');
    }

    // 8. Generate secure review token (256-bit)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const { error: tokenError } = await supabaseAdmin
      .from('contract_tokens')
      .insert({
        contract_id: contract.id,
        agent_id: agent.id,
        token,
        email: agent.email,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      return ErrorResponses.internalError('Failed to generate review token');
    }

    // 9. Send contract email with review link
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/contract-review/${token}`;

    await sendEmail({
      to: agent.email,
      subject: 'Your Jetvision ISO Agent Commission Agreement',
      body: `<h2>Welcome to Jetvision, ${form.firstName}!</h2>
<p>Your ISO Agent Services Agreement is ready for review and signing.</p>
<p><strong>Commission Rate:</strong> ${agent.commission_percentage ?? 10}% of Jetvision's booking margin</p>
<p><a href="${reviewUrl}" style="display:inline-block;padding:12px 24px;background:#0066cc;color:white;text-decoration:none;border-radius:6px;">Review &amp; Sign Contract</a></p>
<p>This link expires in 72 hours.</p>`,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
          contentType: 'application/pdf',
        },
      ],
    });

    // 10. Update onboarding status
    await supabaseAdmin
      .from('iso_agents')
      .update({ onboarding_status: 'contract_sent' })
      .eq('id', agent.id);

    return SuccessResponses.ok({
      message: 'Contract sent! Check your email.',
      onboardingStatus: 'contract_sent',
    });
  } catch {
    return ErrorResponses.internalError('Onboarding submission failed');
  }
}
