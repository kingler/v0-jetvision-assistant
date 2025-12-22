/**
 * Quotes API Route - Quote management
 *
 * Uses consolidated API utilities from lib/utils/api.ts
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import {
  withErrorHandling,
  withAuth,
  parseJsonBody,
  validateRequiredFields,
  isErrorResponse,
  ErrorResponses,
  SuccessResponses,
  type AuthenticatedUser,
} from '@/lib/utils/api';
import type { Database } from '@/lib/types/database';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

/**
 * GET /api/quotes
 * Fetch quotes with optional filters
 */
export const GET = withErrorHandling(
  withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');
    const status = searchParams.get('status');

    let query = supabase.from('quotes').select('*');

    if (requestId) query = query.eq('request_id', requestId);
    if (status) query = query.eq('status', status as Database['public']['Enums']['quote_status']);

    const { data: quotes, error } = await query;

    if (error) {
      return ErrorResponses.internalError('Failed to fetch quotes');
    }

    return SuccessResponses.ok({ quotes });
  })
);

/**
 * PATCH /api/quotes
 * Update a quote's status and notes
 */
export const PATCH = withErrorHandling(
  withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
    const bodyOrError = await parseJsonBody<{
      quote_id: string;
      status: string;
      notes?: string;
    }>(request);

    if (isErrorResponse(bodyOrError)) {
      return bodyOrError;
    }

    const body = bodyOrError;
    const validationError = validateRequiredFields(body, ['quote_id', 'status']);

    if (validationError) {
      return validationError;
    }

    const { quote_id, status, notes } = body;

    const updateData: Database['public']['Tables']['quotes']['Update'] = {
      status: status as Database['public']['Enums']['quote_status'],
      analysis_notes: notes || null,
    };

    const { data: updatedQuote, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quote_id)
      .select()
      .single();

    if (error) {
      return ErrorResponses.internalError('Failed to update quote');
    }

    // If quote accepted, mark the request as completed
    if (status === 'accepted' && updatedQuote) {
      await supabase
        .from('requests')
        .update({ status: 'completed' as Database['public']['Enums']['request_status'] })
        .eq('id', updatedQuote.request_id);
    }

    return SuccessResponses.ok({ quote: updatedQuote });
  })
);
