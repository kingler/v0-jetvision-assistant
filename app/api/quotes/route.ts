/**
 * Quotes API Route - Quote management
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
    const status = searchParams.get('status');

    const { data: user } = await supabase.from('users').select('id, role').eq('clerk_user_id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let query = supabase
      .from('quotes')
      .select('*, request:requests!inner(id, departure_airport, arrival_airport, user_id)')
      .eq('request.user_id', user.id);

    if (requestId) query = query.eq('request_id', requestId);
    if (status) query = query.eq('status', status);

    const { data: quotes, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });

    return NextResponse.json({ quotes });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { quote_id, status, notes } = await request.json();
    if (!quote_id || !status) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const { data: user } = await supabase.from('users').select('id, role').eq('clerk_user_id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: updatedQuote, error } = await supabase
      .from('quotes')
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq('id', quote_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });

    if (status === 'accepted') {
      await supabase.from('requests').update({ status: 'completed' }).eq('id', updatedQuote.request_id);
    }

    return NextResponse.json({ quote: updatedQuote });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
