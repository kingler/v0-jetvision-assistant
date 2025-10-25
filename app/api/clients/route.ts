/**
 * Clients API Route - Client profile management
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const { data: isoAgent } = await supabase.from('iso_agents').select('id').eq('clerk_user_id', userId).single();
    if (!isoAgent) return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });

    let query = supabase.from('client_profiles').select('*').eq('iso_agent_id', isoAgent.id);
    if (search) query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%`);

    const { data: clients, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });

    return NextResponse.json({ clients });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_name, contact_name, email, phone, preferences, notes } = await request.json();
    if (!company_name || !contact_name || !email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const { data: isoAgent } = await supabase.from('iso_agents').select('id').eq('clerk_user_id', userId).single();
    if (!isoAgent) return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });

    const { data: newClient, error } = await supabase
      .from('client_profiles')
      .insert({ iso_agent_id: isoAgent.id, company_name, contact_name, email, phone, preferences: preferences || {}, notes, is_active: true })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_id, company_name, contact_name, email, phone, preferences, notes, is_active } = await request.json();
    if (!client_id) return NextResponse.json({ error: 'Missing client_id' }, { status: 400 });

    const { data: isoAgent } = await supabase.from('iso_agents').select('id').eq('clerk_user_id', userId).single();
    if (!isoAgent) return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });

    const updateData: any = {};
    if (company_name !== undefined) updateData.company_name = company_name;
    if (contact_name !== undefined) updateData.contact_name = contact_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (preferences !== undefined) updateData.preferences = preferences;
    if (notes !== undefined) updateData.notes = notes;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedClient, error } = await supabase
      .from('client_profiles')
      .update(updateData)
      .eq('id', client_id)
      .eq('iso_agent_id', isoAgent.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });

    return NextResponse.json({ client: updatedClient });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
