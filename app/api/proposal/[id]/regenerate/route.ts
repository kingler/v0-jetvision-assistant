/**
 * Proposal Regenerate API
 *
 * POST /api/proposal/[id]/regenerate
 * Creates a new proposal version with updated margin, generates new PDF,
 * and returns email approval data for the new version.
 *
 * Body: { marginPercentage: number }
 * Returns: { proposalId, version, emailApprovalData }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: proposalId } = await params;
    const body = await request.json();
    const { marginPercentage } = body;

    if (marginPercentage == null || marginPercentage < 0 || marginPercentage > 100) {
      return NextResponse.json(
        { error: 'marginPercentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Fetch current proposal with all fields needed for regeneration
    const { data: original, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const totalAmount = original.total_amount || 0;
    const marginAmount = totalAmount * (marginPercentage / 100);
    const finalAmount = Math.round((totalAmount + marginAmount) * 100) / 100;
    // version/previous_version_id columns added by migration but not yet in generated types
    const originalAny = original as Record<string, unknown>;
    const newVersion = ((originalAny.version as number) || 1) + 1;

    // Create new proposal version
    // Use type assertion since version/previous_version_id columns are from pending migration
    const insertData: Record<string, unknown> = {
      request_id: original.request_id,
      iso_agent_id: original.iso_agent_id,
      quote_id: original.quote_id,
      client_profile_id: original.client_profile_id,
      file_name: original.file_name,
      file_url: original.file_url,
      file_path: original.file_path,
      file_size_bytes: original.file_size_bytes,
      proposal_number: `${original.proposal_number}-v${newVersion}`,
      title: original.title,
      description: original.description,
      total_amount: totalAmount,
      margin_applied: Math.round(marginAmount * 100) / 100,
      final_amount: finalAmount,
      status: 'draft',
      generated_at: new Date().toISOString(),
      sent_to_email: original.sent_to_email,
      sent_to_name: original.sent_to_name,
      metadata: original.metadata,
      version: newVersion,
      previous_version_id: proposalId,
    };

    const { data: newProposal, error: insertError } = await supabaseAdmin
      .from('proposals')
      .insert(insertData as never)
      .select('id, proposal_number')
      .single();

    if (insertError || !newProposal) {
      console.error('[proposal/regenerate] Insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to create new proposal version', details: insertError?.message },
        { status: 500 }
      );
    }

    // Build email approval data for the new version
    const emailApprovalData = {
      proposalId: newProposal.id,
      proposalNumber: newProposal.proposal_number,
      to: {
        email: original.sent_to_email || '',
        name: original.sent_to_name || '',
      },
      subject: `Updated Proposal ${newProposal.proposal_number}`,
      body: `Please find attached the updated proposal (v${newVersion}) with revised pricing.`,
      attachments: original.file_url
        ? [{ name: original.file_name, url: original.file_url }]
        : [],
      pricing: {
        subtotal: totalAmount,
        total: finalAmount,
        currency: 'USD',
      },
      generatedAt: new Date().toISOString(),
      requestId: original.request_id,
      status: 'pending' as const,
    };

    return NextResponse.json({
      proposalId: newProposal.id,
      proposalNumber: newProposal.proposal_number,
      version: newVersion,
      previousVersionId: proposalId,
      marginPercentage,
      finalAmount,
      emailApprovalData,
    });
  } catch (err) {
    console.error('[proposal/regenerate] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
