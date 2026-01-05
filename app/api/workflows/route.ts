/**
 * Workflows API Route - Workflow state management
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');

    // Use admin client for user lookup (bypasses RLS since we have Clerk auth)
    const { data: user } = await supabaseAdmin
      .from('iso_agents')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Join workflow_states with requests table
    // Note: requests table uses iso_agent_id (not user_id)
    let query = supabase
      .from('workflow_states')
      .select('*, request:requests!inner(id, iso_agent_id)')
      .eq('request.iso_agent_id', user.id)
      .order('created_at', { ascending: false });

    if (requestId) query = query.eq('request_id', requestId);

    const { data: history, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch workflow history' }, { status: 500 });

    return NextResponse.json({ workflow_states: history });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
