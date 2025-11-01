/**
 * Requests API Route - RFP request management
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import { AgentFactory } from '@agents/core';
import { AgentType } from '@agents/core/types';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let query = supabase
      .from('requests')
      .select('*, user:users(id, full_name, email), client:client_profiles(id, company_name, contact_name, email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data: requests, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });

    return NextResponse.json({ requests, pagination: { limit, offset, total: requests.length } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { client_profile_id, departure_airport, arrival_airport, departure_date, return_date, passengers, aircraft_type, budget, special_requirements } = body;

    if (!departure_airport || !arrival_airport || !departure_date || !passengers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: user } = await supabase.from('users').select('id, role').eq('clerk_user_id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: newRequest, error } = await supabase
      .from('requests')
      .insert({ user_id: user.id, client_profile_id, departure_airport, arrival_airport, departure_date, return_date, passengers, aircraft_type, budget, special_requirements, status: 'pending' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });

    // Trigger orchestrator in background
    triggerOrchestrator(newRequest.id, userId).catch(console.error);

    return NextResponse.json({ request: newRequest, message: 'Request created. Processing started.' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function triggerOrchestrator(requestId: string, userId: string) {
  const factory = AgentFactory.getInstance();
  const orchestrator = await factory.createAndInitialize({
    type: AgentType.ORCHESTRATOR,
    name: 'RFP Orchestrator',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  });
  await orchestrator.execute({ sessionId: `session-${Date.now()}`, requestId, userId });
}
