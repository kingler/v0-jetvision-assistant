/**
 * Workflows API Route - Workflow state management
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');

    const { data: isoAgent } = await supabase.from('iso_agents').select('id').eq('clerk_user_id', userId).single();
    if (!isoAgent) return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });

    let query = supabase
      .from('workflow_history')
      .select('*, request:requests!inner(id, iso_agent_id)')
      .eq('request.iso_agent_id', isoAgent.id)
      .order('transitioned_at', { ascending: false });

    if (requestId) query = query.eq('request_id', requestId);

    const { data: history, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch workflow history' }, { status: 500 });

    return NextResponse.json({ workflow_history: history });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
