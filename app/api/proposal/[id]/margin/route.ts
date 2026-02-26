/**
 * Proposal Margin Update API
 *
 * PATCH /api/proposal/[id]/margin
 * Updates the margin percentage and recalculates final_amount.
 * Does NOT regenerate the PDF or send a new email.
 *
 * Body: { marginPercentage: number }
 * Returns: { proposalId, marginApplied, finalAmount, totalAmount }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up the ISO agent for the authenticated user
    const { data: isoAgent, error: agentError } = await supabaseAdmin
      .from('iso_agents')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (agentError || !isoAgent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentId = isoAgent.id;

    const { id: proposalId } = await params;
    const body = await request.json();
    const { marginPercentage } = body;

    if (marginPercentage == null || marginPercentage < 0 || marginPercentage > 100) {
      return NextResponse.json(
        { error: 'marginPercentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Fetch current proposal (scoped to authenticated agent)
    const { data: proposal, error: fetchError } = await supabaseAdmin
      .from('proposals')
      .select('id, total_amount, margin_applied, final_amount')
      .eq('id', proposalId)
      .eq('iso_agent_id', agentId)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const totalAmount = proposal.total_amount || 0;
    const marginAmount = totalAmount * (marginPercentage / 100);
    const finalAmount = Math.round((totalAmount + marginAmount) * 100) / 100;

    // Update proposal (scoped to authenticated agent)
    const { error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({
        margin_applied: Math.round(marginAmount * 100) / 100,
        final_amount: finalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposalId)
      .eq('iso_agent_id', agentId);

    if (updateError) {
      console.error('[proposal/margin] Update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update margin', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      proposalId,
      marginPercentage,
      marginApplied: Math.round(marginAmount * 100) / 100,
      finalAmount,
      totalAmount,
    });
  } catch (err) {
    console.error('[proposal/margin] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
