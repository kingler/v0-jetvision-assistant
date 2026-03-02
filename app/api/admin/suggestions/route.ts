import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPromptVersion } from '@/lib/self-improvement/prompt-version-manager';
import { withRoles } from '@/lib/middleware/rbac';
import type { PromptSection } from '@/lib/self-improvement/types';

/**
 * GET /api/admin/suggestions - List prompt suggestions
 */
async function handleGet(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status') || 'pending';

    const { data, error } = await supabaseAdmin
      .from('prompt_suggestions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ suggestions: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/suggestions - Approve or reject a suggestion
 */
async function handlePatch(req: NextRequest) {
  try {
    const { suggestion_id, action, reviewed_by, review_notes } = await req.json();

    if (!suggestion_id || !action) {
      return NextResponse.json(
        { error: 'suggestion_id and action (approve|reject) required' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const { data: suggestion } = await supabaseAdmin
        .from('prompt_suggestions')
        .select('*')
        .eq('id', suggestion_id)
        .single();

      if (!suggestion) {
        return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
      }

      const newVersion = await createPromptVersion(
        suggestion.target_section as PromptSection,
        suggestion.proposed_change || '',
        `Approved suggestion: ${suggestion.title}`,
        'human'
      );

      await supabaseAdmin
        .from('prompt_suggestions')
        .update({
          status: 'implemented',
          reviewed_by: reviewed_by || 'admin',
          reviewed_at: new Date().toISOString(),
          review_notes,
          implemented_in_version: newVersion?.version,
        })
        .eq('id', suggestion_id);

      return NextResponse.json({
        status: 'implemented',
        new_version: newVersion?.version,
      });
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('prompt_suggestions')
        .update({
          status: 'rejected',
          reviewed_by: reviewed_by || 'admin',
          reviewed_at: new Date().toISOString(),
          review_notes,
        })
        .eq('id', suggestion_id);

      return NextResponse.json({ status: 'rejected' });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "approve" or "reject".' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withRoles(
  async (req: NextRequest) => handleGet(req),
  ['admin']
);

export const PATCH = withRoles(
  async (req: NextRequest) => handlePatch(req),
  ['admin']
);
