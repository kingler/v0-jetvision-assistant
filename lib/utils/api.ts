/**
 * API Utility Functions
 *
 * Reusable helpers for API route handlers including authentication,
 * error handling, and response formatting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

/**
 * ISO Agent data returned from authentication
 */
export interface ISOAgent {
  id: string;
}

/**
 * Result type for getAuthenticatedAgent
 * Either returns the agent data or an error response
 */
export type AuthResult = ISOAgent | NextResponse;

/**
 * Authenticates the user and retrieves their ISO agent record
 *
 * @returns ISO agent data or error response
 */
export async function getAuthenticatedAgent(): Promise<AuthResult> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: isoAgent, error } = await supabase
    .from('iso_agents')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (error || !isoAgent) {
    return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });
  }

  return isoAgent as ISOAgent;
}

/**
 * Type guard to check if AuthResult is an error response
 *
 * @param result - The result from getAuthenticatedAgent
 * @returns True if the result is a NextResponse (error)
 */
export function isErrorResponse(result: AuthResult): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Higher-order function that wraps API route handlers with error handling
 *
 * @param handler - The API route handler function
 * @returns Wrapped handler with automatic error handling
 */
export function withErrorHandling<T extends (req: NextRequest) => Promise<NextResponse>>(
  handler: T
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Standardized error response creators
 */
export const ErrorResponses = {
  unauthorized: (message = 'Unauthorized') =>
    NextResponse.json({ error: message }, { status: 401 }),

  notFound: (message = 'Resource not found') =>
    NextResponse.json({ error: message }, { status: 404 }),

  badRequest: (message: string, details?: unknown) =>
    NextResponse.json(
      { error: message, ...(details && { details }) },
      { status: 400 }
    ),

  internalError: (message = 'Internal server error', details?: unknown) =>
    NextResponse.json(
      { error: message, ...(details && { details }) },
      { status: 500 }
    ),

  forbidden: (message = 'Forbidden') =>
    NextResponse.json({ error: message }, { status: 403 }),
};
