/**
 * Lock Customer API Route
 *
 * Sets or verifies the client_profile_id on a request.
 * Once set (and proposals exist), the DB trigger prevents changing it.
 *
 * POST /api/requests/[id]/lock-customer
 * Body: { clientProfileId: string }
 *
 * Returns 200 if locked successfully or already locked to same customer.
 * Returns 409 if already locked to a different customer.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { clientProfileId } = body;

    if (!clientProfileId) {
      return NextResponse.json(
        { error: 'clientProfileId is required' },
        { status: 400 }
      );
    }

    // Fetch current request
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from('requests')
      .select('id, client_profile_id')
      .eq('id', requestId)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // If already locked to the same customer, return success
    if (currentRequest.client_profile_id === clientProfileId) {
      return NextResponse.json({
        locked: true,
        clientProfileId,
        message: 'Already locked to this customer',
      });
    }

    // If locked to a different customer, return conflict
    if (currentRequest.client_profile_id && currentRequest.client_profile_id !== clientProfileId) {
      // Fetch locked customer name for error message
      const { data: lockedCustomer } = await supabaseAdmin
        .from('client_profiles')
        .select('contact_name, company_name')
        .eq('id', currentRequest.client_profile_id)
        .single();

      const customerName = lockedCustomer?.contact_name || lockedCustomer?.company_name || 'another customer';

      return NextResponse.json(
        {
          error: 'Customer lock conflict',
          message: `This trip is already assigned to ${customerName}`,
          lockedCustomerId: currentRequest.client_profile_id,
        },
        { status: 409 }
      );
    }

    // Lock: set client_profile_id
    const { error: updateError } = await supabaseAdmin
      .from('requests')
      .update({ client_profile_id: clientProfileId })
      .eq('id', requestId);

    if (updateError) {
      console.error('[lock-customer] Failed to lock customer:', updateError);
      return NextResponse.json(
        { error: 'Failed to lock customer', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      locked: true,
      clientProfileId,
      message: 'Customer locked successfully',
    });
  } catch (err) {
    console.error('[lock-customer] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
