/**
 * API Utility Functions
 *
 * Reusable helpers for API route handlers including authentication,
 * error handling, request parsing, and response formatting.
 *
 * @module lib/utils/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// =============================================================================
// TYPES
// =============================================================================

/**
 * User data returned from authentication
 */
export interface AuthenticatedUser {
  id: string;
  role?: string;
  clerkUserId: string;
}

/**
 * ISO Agent data returned from authentication (alias for backwards compatibility)
 */
export interface ISOAgent {
  id: string;
}

/**
 * Result type for getAuthenticatedAgent/getAuthenticatedUser
 * Either returns the user data or an error response
 */
export type AuthResult = ISOAgent | NextResponse<ErrorResponse>;
export type UserAuthResult = AuthenticatedUser | NextResponse<ErrorResponse>;

/**
 * Options for API handler composition
 */
export interface ApiHandlerOptions {
  requireAuth?: boolean;
  requireRole?: string[];
}

/**
 * Standard error response shape
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

/**
 * Authenticates the user and retrieves their ISO agent record
 *
 * Queries the `iso_agents` table using the authenticated Clerk user ID.
 * Returns the ISO agent ID or an error response if not found.
 *
 * @returns ISO agent data with `id` field or error response
 * @throws Never throws - always returns either ISOAgent or NextResponse
 */
export async function getAuthenticatedAgent(): Promise<AuthResult> {
  const { userId } = await auth();

  // Check if user is authenticated via Clerk
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'No authentication token provided' },
      { status: 401 }
    );
  }

  // Query iso_agents table using clerk_user_id
  // Schema: iso_agents(id UUID, clerk_user_id TEXT UNIQUE, role user_role, ...)
  // Use supabaseAdmin to bypass RLS since we've already authenticated via Clerk
  const { data: isoAgent, error } = await supabaseAdmin
    .from('iso_agents')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  // Handle database errors
  if (error) {
    console.error('[getAuthenticatedAgent] Database error:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      clerkUserId: userId,
    });

    // Distinguish between "not found" and other database errors
    if (error.code === 'PGRST116') {
      // PGRST116 = no rows returned (Supabase specific)
      return NextResponse.json(
        {
          error: 'ISO agent not found',
          message: `No ISO agent record found for Clerk user ID: ${userId}. Please ensure your account has been synced to the database.`,
        },
        { status: 404 }
      );
    }

    // Other database errors (connection, permission, etc.)
    return NextResponse.json(
      {
        error: 'Database error',
        message: 'Failed to retrieve ISO agent record',
      },
      { status: 500 }
    );
  }

  // Handle case where query succeeded but returned null data
  if (!isoAgent) {
    console.warn('[getAuthenticatedAgent] No ISO agent found for Clerk user:', userId);
    return NextResponse.json(
      {
        error: 'ISO agent not found',
        message: `No ISO agent record found for Clerk user ID: ${userId}. Please ensure your account has been synced to the database.`,
      },
      { status: 404 }
    );
  }

  // Success - return ISO agent with id field
  return isoAgent as ISOAgent;
}

/**
 * Authenticates and retrieves user with role information
 *
 * Queries the `iso_agents` table using the authenticated Clerk user ID.
 * Returns user data including `id`, `role`, and `clerkUserId` fields.
 *
 * @returns User data with role information or error response
 * @throws Never throws - always returns either AuthenticatedUser or NextResponse
 */
export async function getAuthenticatedUser(): Promise<UserAuthResult> {
  const { userId } = await auth();

  // Check if user is authenticated via Clerk
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'No authentication token provided' },
      { status: 401 }
    );
  }

  // Query iso_agents table using clerk_user_id
  // Schema: iso_agents(id UUID, clerk_user_id TEXT UNIQUE, role user_role, ...)
  // Select both id and role fields as required by AuthenticatedUser interface
  // Use supabaseAdmin to bypass RLS since we've already authenticated via Clerk
  const { data: isoAgent, error } = await supabaseAdmin
    .from('iso_agents')
    .select('id, role')
    .eq('clerk_user_id', userId)
    .single();

  // Handle database errors
  if (error) {
    console.error('[getAuthenticatedUser] Database error:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      clerkUserId: userId,
    });

    // Distinguish between "not found" and other database errors
    if (error.code === 'PGRST116') {
      // PGRST116 = no rows returned (Supabase specific)
      return NextResponse.json(
        {
          error: 'ISO agent not found',
          message: `No ISO agent record found for Clerk user ID: ${userId}. Please ensure your account has been synced to the database.`,
        },
        { status: 404 }
      );
    }

    // Other database errors (connection, permission, etc.)
    return NextResponse.json(
      {
        error: 'Database error',
        message: 'Failed to retrieve ISO agent record',
      },
      { status: 500 }
    );
  }

  // Handle case where query succeeded but returned null data
  if (!isoAgent) {
    console.warn('[getAuthenticatedUser] No ISO agent found for Clerk user:', userId);
    return NextResponse.json(
      {
        error: 'ISO agent not found',
        message: `No ISO agent record found for Clerk user ID: ${userId}. Please ensure your account has been synced to the database.`,
      },
      { status: 404 }
    );
  }

  // Success - return formatted user data matching AuthenticatedUser interface
  // Note: role can be null in database, so we convert null to undefined for TypeScript
  return {
    id: isoAgent.id,
    role: isoAgent.role ?? undefined,
    clerkUserId: userId,
  };
}

/**
 * Type guard to check if a result is an error response (NextResponse)
 *
 * @param result - Any result that might be an error response
 * @returns True if the result is a NextResponse (error)
 */
export function isErrorResponse<T>(result: T | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Type guard to check if a result is an error NextResponse with ErrorResponse shape
 *
 * This is a more specific type guard that narrows the type to NextResponse<ErrorResponse>,
 * allowing TypeScript to properly type-narrow error responses without manual type casts.
 *
 * @param result - Any result that might be an error response
 * @returns True if the result is a NextResponse (error)
 */
export function isErrorNextResponse<T>(
  result: T | NextResponse<ErrorResponse>
): result is NextResponse<ErrorResponse> {
  return result instanceof NextResponse;
}

// =============================================================================
// REQUEST PARSING HELPERS
// =============================================================================

/**
 * Safely parse JSON body from request
 *
 * @param request - The incoming request
 * @returns Parsed body or error response
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: NextRequest
): Promise<T | NextResponse<ErrorResponse>> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    return ErrorResponses.badRequest('Invalid JSON body');
  }
}

/**
 * Extract required fields from body and validate presence
 *
 * @param body - The request body
 * @param requiredFields - List of required field names
 * @returns Error response if validation fails, null if valid
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): NextResponse | null {
  const missing = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null
  );

  if (missing.length > 0) {
    return ErrorResponses.badRequest(`Missing required fields: ${missing.join(', ')}`);
  }

  return null;
}

/**
 * Extract and validate query parameters
 *
 * @param request - The incoming request
 * @param params - Map of parameter names to whether they're required
 * @returns Object with parameters and optional error
 */
export function parseQueryParams(
  request: NextRequest,
  params: Record<string, boolean>
): { params: Record<string, string | null>; error: NextResponse | null } {
  const { searchParams } = new URL(request.url);
  const result: Record<string, string | null> = {};
  const missingRequired: string[] = [];

  for (const [name, required] of Object.entries(params)) {
    const value = searchParams.get(name);
    result[name] = value;

    if (required && !value) {
      missingRequired.push(name);
    }
  }

  const error =
    missingRequired.length > 0
      ? ErrorResponses.badRequest(`Missing required parameters: ${missingRequired.join(', ')}`)
      : null;

  return { params: result, error };
}

// =============================================================================
// MIDDLEWARE / HIGHER-ORDER FUNCTIONS
// =============================================================================

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
 * Higher-order function that wraps API handlers with authentication
 *
 * @param handler - The API route handler that receives authenticated user
 * @returns Wrapped handler with automatic auth check
 */
export function withAuth<T extends (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>>(
  handler: T
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const userOrError = await getAuthenticatedUser();

    if (isErrorResponse(userOrError)) {
      return userOrError;
    }

    return handler(req, userOrError);
  };
}

/**
 * Compose multiple middleware functions
 *
 * @param handler - The base handler
 * @param middlewares - Middleware functions to apply (right to left)
 * @returns Composed handler
 */
export function compose<T extends (req: NextRequest) => Promise<NextResponse>>(
  handler: T,
  ...middlewares: ((handler: T) => T)[]
): T {
  return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

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
      { error: message, ...(details ? { details } : {}) },
      { status: 400 }
    ),

  internalError: (message = 'Internal server error', details?: unknown) =>
    NextResponse.json(
      { error: message, ...(details ? { details } : {}) },
      { status: 500 }
    ),

  forbidden: (message = 'Forbidden') =>
    NextResponse.json({ error: message }, { status: 403 }),

  conflict: (message = 'Resource conflict') =>
    NextResponse.json({ error: message }, { status: 409 }),

  tooManyRequests: (message = 'Too many requests', retryAfter?: number) =>
    NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
      }
    ),
};

/**
 * Standardized success response creators
 */
export const SuccessResponses = {
  ok: <T>(data: T) => NextResponse.json(data, { status: 200 }),

  created: <T>(data: T) => NextResponse.json(data, { status: 201 }),

  noContent: () => new NextResponse(null, { status: 204 }),

  accepted: <T>(data?: T) =>
    NextResponse.json(data ?? { message: 'Accepted' }, { status: 202 }),
};
