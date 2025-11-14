/**
 * Quotes API Route - Quote management
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';

type User = Database['public']['Tables']['users']['Row'];
type Quote = Database['public']['Tables']['quotes']['Row'];

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');
    const status = searchParams.get('status');

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single<Pick<User, 'id' | 'role'>>();

    if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let query = supabase
      .from('quotes')
      .select('*');

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

    const body = await request.json() as Record<string, any>;
    const { quote_id, status, notes } = body;
    if (!quote_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single<Pick<User, 'id' | 'role'>>();

    if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updateData: Database['public']['Tables']['quotes']['Update'] = {
      status,
      analysis_notes: notes || null,
    };

    const { data: updatedQuote, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quote_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });

    if (status === 'accepted') {
      await supabase
        .from('requests')
        .update({ status: 'completed' })
        .eq('id', updatedQuote.request_id);
    }

    return NextResponse.json({ quote: updatedQuote });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
