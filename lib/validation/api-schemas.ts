/**
 * Zod Validation Schemas for API Routes
 * Provides comprehensive input validation for all API endpoints
 */

import { z } from 'zod';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Schema for creating a new request
 */
export const createRequestSchema = z.object({
  client_profile_id: z.string().uuid().optional(),
  departure_airport: z.string().min(3).max(4).regex(/^[A-Z]{3,4}$/, 'Must be valid ICAO/IATA code'),
  arrival_airport: z.string().min(3).max(4).regex(/^[A-Z]{3,4}$/, 'Must be valid ICAO/IATA code'),
  departure_date: z.string().datetime({ message: 'Must be valid ISO 8601 date' }),
  return_date: z.string().datetime().optional().nullable(),
  passengers: z.number().int().min(1).max(50),
  aircraft_type: z.string().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  special_requirements: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for updating a request
 */
export const updateRequestSchema = z.object({
  client_profile_id: z.string().uuid().optional().nullable(),
  departure_airport: z.string().min(3).max(4).regex(/^[A-Z]{3,4}$/).optional(),
  arrival_airport: z.string().min(3).max(4).regex(/^[A-Z]{3,4}$/).optional(),
  departure_date: z.string().datetime().optional(),
  return_date: z.string().datetime().optional().nullable(),
  passengers: z.number().int().min(1).max(50).optional(),
  aircraft_type: z.string().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  special_requirements: z.string().max(2000).optional().nullable(),
  status: z.enum([
    'draft',
    'pending',
    'analyzing',
    'fetching_client_data',
    'searching_flights',
    'awaiting_quotes',
    'analyzing_proposals',
    'generating_email',
    'sending_proposal',
    'completed',
    'failed',
    'cancelled',
  ]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for request query parameters
 */
export const requestQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  client_profile_id: z.string().uuid().optional(),
});

// ============================================================================
// QUOTE SCHEMAS
// ============================================================================

/**
 * Schema for creating a new quote
 */
export const createQuoteSchema = z.object({
  request_id: z.string().uuid(),
  operator_id: z.string().min(1),
  operator_name: z.string().min(1),
  base_price: z.number().positive(),
  fuel_surcharge: z.number().nonnegative(),
  taxes: z.number().nonnegative(),
  fees: z.number().nonnegative(),
  total_price: z.number().positive(),
  aircraft_type: z.string().min(1),
  aircraft_tail_number: z.string().optional().nullable(),
  aircraft_details: z.record(z.unknown()),
  availability_confirmed: z.boolean(),
  valid_until: z.string().datetime().optional().nullable(),
  score: z.number().min(0).max(100).optional().nullable(),
  ranking: z.number().int().positive().optional().nullable(),
  analysis_notes: z.string().max(5000).optional().nullable(),
  status: z.enum(['pending', 'received', 'analyzed', 'accepted', 'rejected', 'expired']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for updating a quote
 */
export const updateQuoteSchema = z.object({
  status: z.enum(['pending', 'received', 'analyzed', 'accepted', 'rejected', 'expired']).optional(),
  score: z.number().min(0).max(100).optional().nullable(),
  ranking: z.number().int().positive().optional().nullable(),
  analysis_notes: z.string().max(5000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for quote query parameters
 */
export const quoteQuerySchema = z.object({
  request_id: z.string().uuid().optional(),
  status: z.string().optional(),
  operator_id: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// ============================================================================
// CLIENT SCHEMAS
// ============================================================================

/**
 * Schema for creating a client profile
 */
export const createClientSchema = z.object({
  company_name: z.string().min(1).max(255),
  contact_name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  preferences: z.record(z.unknown()).optional(),
  notes: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().optional(),
});

/**
 * Schema for updating a client profile
 */
export const updateClientSchema = z.object({
  company_name: z.string().min(1).max(255).optional(),
  contact_name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  preferences: z.record(z.unknown()).optional(),
  notes: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().optional(),
});

/**
 * Schema for client query parameters
 */
export const clientQuerySchema = z.object({
  search: z.string().optional(),
  is_active: z.string().transform(val => val === 'true').optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// ============================================================================
// WORKFLOW SCHEMAS
// ============================================================================

/**
 * Schema for workflow query parameters
 */
export const workflowQuerySchema = z.object({
  request_id: z.string().uuid().optional(),
  current_state: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Schema for manual workflow transition
 */
export const workflowTransitionSchema = z.object({
  request_id: z.string().uuid(),
  new_state: z.enum([
    'draft',
    'pending',
    'analyzing',
    'fetching_client_data',
    'searching_flights',
    'awaiting_quotes',
    'analyzing_proposals',
    'generating_email',
    'sending_proposal',
    'completed',
    'failed',
    'cancelled',
  ]),
  agent_id: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// AGENT EXECUTION SCHEMAS
// ============================================================================

/**
 * Schema for agent execution query parameters
 */
export const agentExecutionQuerySchema = z.object({
  request_id: z.string().uuid().optional(),
  agent_type: z.enum([
    'orchestrator',
    'client_data',
    'flight_search',
    'proposal_analysis',
    'communication',
    'error_monitor',
  ]).optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'timeout']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Schema for triggering manual agent execution
 */
export const triggerAgentSchema = z.object({
  agent_type: z.enum([
    'orchestrator',
    'client_data',
    'flight_search',
    'proposal_analysis',
    'communication',
    'error_monitor',
  ]),
  request_id: z.string().uuid(),
  input_data: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

/**
 * Schema for Avinode quote webhook
 */
export const avinodeQuoteWebhookSchema = z.object({
  event_type: z.enum(['quote_received', 'quote_updated', 'quote_cancelled']),
  rfp_id: z.string(),
  quote_id: z.string(),
  operator_id: z.string(),
  operator_name: z.string(),
  quote_data: z.object({
    base_price: z.number(),
    fuel_surcharge: z.number().optional(),
    taxes: z.number().optional(),
    fees: z.number().optional(),
    total_price: z.number(),
    aircraft_type: z.string(),
    aircraft_tail_number: z.string().optional(),
    aircraft_details: z.record(z.unknown()).optional(),
    availability_confirmed: z.boolean().optional(),
    valid_until: z.string().datetime().optional(),
  }),
  timestamp: z.string().datetime(),
  signature: z.string().optional(), // Webhook signature for validation
});

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

/**
 * Schema for file upload metadata
 */
export const fileUploadMetadataSchema = z.object({
  request_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
  file_type: z.enum(['proposal', 'attachment', 'document', 'image']),
  description: z.string().max(500).optional(),
});

/**
 * Schema for file query parameters
 */
export const fileQuerySchema = z.object({
  request_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
  file_type: z.string().optional(),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate and parse data with Zod schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed data or throws ZodError
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns result object instead of throwing
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success flag and data or error
 */
export function safeValidateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod errors for API responses
 * @param error - ZodError to format
 * @returns Formatted error object
 */
export function formatZodError(error: z.ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  return {
    message: 'Validation failed',
    errors: error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
