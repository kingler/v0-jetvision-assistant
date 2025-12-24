/**
 * Workflows API Route - Workflow state management
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');

    // Fetch user from iso_agents table - user_id in requests references iso_agents.id
    // Note: All existing user records should have been migrated to iso_agents via Clerk webhook
    const { data: user } = await supabase
      .from('iso_agents')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Join workflow_states with requests table
    // Foreign key: requests.user_id → iso_agents.id (verified)
    let query = supabase
      .from('workflow_states')
      .select('*, request:requests!inner(id, user_id)')
      .eq('request.user_id', user.id)
      .order('created_at', { ascending: false });

    if (requestId) query = query.eq('request_id', requestId);

    const { data: history, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch workflow history' }, { status: 500 });

    return NextResponse.json({ workflow_states: history });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
