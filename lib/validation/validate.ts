/**
 * Validation Utility
 *
 * Helper functions for validating API request data using Zod schemas.
 */

import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

/**
 * Validates query parameters from a URL
 *
 * @param searchParams - URL search params
 * @param schema - Zod schema to validate against
 * @returns Validated data or NextResponse with error
 */
export function validateQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  try {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const validatedData = schema.parse(params);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validates JSON body from a request
 *
 * @param body - Parsed JSON body
 * @param schema - Zod schema to validate against
 * @returns Validated data or NextResponse with error
 */
export function validateBody<T extends z.ZodType>(
  body: unknown,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  try {
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Safely parses JSON from a request with error handling
 *
 * @param request - Next.js request object
 * @returns Parsed JSON or error response
 */
export async function safeParseJSON(
  request: Request
): Promise<{ success: true; data: unknown } | { success: false; response: NextResponse }> {
  // Check Content-Type header
  const contentType = request.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      ),
    };
  }

  try {
    const body = await request.json();
    return { success: true, data: body };
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validates and parses request body in one step
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validated data or error response
 */
export async function validateRequest<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
  const jsonResult = await safeParseJSON(request);
  if (!jsonResult.success) {
    return jsonResult;
  }

  return validateBody(jsonResult.data, schema);
}

/**
 * Format Zod errors into a user-friendly format
 *
 * @param error - ZodError instance
 * @returns Formatted error details
 */
export function formatZodError(error: ZodError): {
  error: string;
  details: Array<{ field: string; message: string }>;
} {
  return {
    error: 'Validation failed',
    details: error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
