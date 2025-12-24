/**
 * Agents API Route - Agent status and metrics
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');
    const agentType = searchParams.get('agent_type');
    const status = searchParams.get('status');

    const { data: user } = await supabase.from('iso_agents').select('id, role').eq('clerk_user_id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let query = supabase
      .from('agent_executions')
      .select('*, request:requests!inner(id, user_id)')
      .eq('request.user_id', user.id)
      .order('created_at', { ascending: false });

    if (requestId) query = query.eq('request_id', requestId);
    if (agentType) query = query.eq('agent_type', agentType as Database['public']['Enums']['agent_type']);
    if (status) query = query.eq('status', status as Database['public']['Enums']['execution_status']);

    const { data: executions, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });

    const metrics = {
      total: executions.length,
      completed: executions.filter((e: any) => e.status === 'completed').length,
      failed: executions.filter((e: any) => e.status === 'failed').length,
    };

    return NextResponse.json({ executions, metrics });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
