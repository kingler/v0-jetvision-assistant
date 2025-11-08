/**
 * API Route Validation Schemas
 *
 * Zod validation schemas for all API endpoints.
 * Ensures type safety and input validation across the application.
 */

import { z } from 'zod';

// ============================================================================
// Shared Schemas
// ============================================================================

/**
 * Client preferences schema with validated structure
 * Security: Prevents arbitrary object injection by using strict mode
 */
export const ClientPreferencesSchema = z.object({
  preferred_aircraft: z.array(z.string()).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  preferred_amenities: z.array(z.string()).optional(),
  budget_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  preferred_departure_time: z.string().optional(),
  requires_customs_assistance: z.boolean().optional(),
  loyalty_programs: z.array(z.string()).optional(),
  special_requests: z.string().max(500).optional(),
}).strict(); // Strict mode prevents additional unknown fields

/**
 * Aircraft preferences schema with validated structure
 * Security: Prevents arbitrary object injection by using strict mode
 */
export const AircraftPreferencesSchema = z.object({
  preferred_types: z.array(z.string()).optional(),
  min_passengers: z.number().int().min(1).optional(),
  max_passengers: z.number().int().min(1).optional(),
  requires_wifi: z.boolean().optional(),
  requires_lavatory: z.boolean().optional(),
  preferred_amenities: z.array(z.string()).optional(),
}).strict();

// ============================================================================
// Quotes API Schemas
// ============================================================================

export const QuotesGetSchema = z.object({
  request_id: z.string().uuid().optional(),
  status: z.enum(['received', 'analyzing', 'accepted', 'rejected', 'expired']).optional(),
});

export const QuotesPatchSchema = z.object({
  quote_id: z.string().uuid('Invalid quote ID'),
  status: z.enum(['received', 'analyzing', 'accepted', 'rejected', 'expired'], {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status value',
  }),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// ============================================================================
// Clients API Schemas
// ============================================================================

export const ClientsGetSchema = z.object({
  search: z.string().max(100).optional(),
  client_id: z.string().uuid().optional(),
});

export const ClientsPostSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  contact_name: z.string().min(1, 'Contact name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(50).optional(),
  preferences: ClientPreferencesSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const ClientsPatchSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  company_name: z.string().min(1).max(200).optional(),
  contact_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  preferences: ClientPreferencesSchema.optional(),
  notes: z.string().max(2000).optional(),
  is_active: z.boolean().optional(),
});

export const ClientsDeleteSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
});

// ============================================================================
// Agents API Schemas
// ============================================================================

export const AgentsGetSchema = z.object({
  request_id: z.string().uuid().optional(),
  agent_type: z.enum([
    'orchestrator',
    'client_data',
    'flight_search',
    'proposal_analysis',
    'communication',
    'error_monitor',
  ]).optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
});

// ============================================================================
// Workflows API Schemas
// ============================================================================

export const WorkflowsGetSchema = z.object({
  request_id: z.string().uuid().optional(),
});

// ============================================================================
// Requests API Schemas
// ============================================================================

export const RequestsGetSchema = z.object({
  status: z.enum([
    'draft',
    'submitted',
    'analyzing',
    'searching_flights',
    'awaiting_quotes',
    'analyzing_proposals',
    'proposal_ready',
    'completed',
    'cancelled',
  ]).optional(),
  client_id: z.string().uuid().optional(),
});

export const RequestsPostSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  departure_airport: z.string().min(3).max(4, 'Airport code must be 3-4 characters'),
  arrival_airport: z.string().min(3).max(4, 'Airport code must be 3-4 characters'),
  departure_date: z.string().datetime('Invalid departure date format'),
  return_date: z.string().datetime().optional(),
  passengers: z.number().int().min(1).max(50, 'Passengers must be between 1 and 50'),
  aircraft_preferences: AircraftPreferencesSchema.optional(),
  budget: z.number().positive('Budget must be positive').optional(),
  notes: z.string().max(2000).optional(),
});

export const RequestsPatchSchema = z.object({
  request_id: z.string().uuid('Invalid request ID'),
  status: z.enum([
    'draft',
    'submitted',
    'analyzing',
    'searching_flights',
    'awaiting_quotes',
    'analyzing_proposals',
    'proposal_ready',
    'completed',
    'cancelled',
  ]).optional(),
  departure_airport: z.string().min(3).max(4).optional(),
  arrival_airport: z.string().min(3).max(4).optional(),
  departure_date: z.string().datetime().optional(),
  return_date: z.string().datetime().optional(),
  passengers: z.number().int().min(1).max(50).optional(),
  aircraft_preferences: AircraftPreferencesSchema.optional(),
  budget: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
});

export const RequestsDeleteSchema = z.object({
  request_id: z.string().uuid('Invalid request ID'),
});

// ============================================================================
// Email API Schemas (NEW)
// ============================================================================

export const EmailSendSchema = z.object({
  request_id: z.string().uuid('Invalid request ID'),
  client_email: z.string().email('Invalid email address'),
  template_id: z.string().optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Email body is required'),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // base64 encoded
    contentType: z.string(),
  })).optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
});

export const EmailTemplateGetSchema = z.object({
  template_id: z.string().optional(),
  category: z.enum(['initial_proposal', 'quote_update', 'follow_up', 'confirmation']).optional(),
});

export const EmailTemplatePostSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  category: z.enum(['initial_proposal', 'quote_update', 'follow_up', 'confirmation']),
  subject: z.string().min(1).max(200),
  body: z.string().min(1, 'Template body is required'),
  variables: z.array(z.string()).optional(),
});

export const EmailTemplatePatchSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  name: z.string().min(1).max(100).optional(),
  category: z.enum(['initial_proposal', 'quote_update', 'follow_up', 'confirmation']).optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export const EmailHistoryGetSchema = z.object({
  request_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'sent', 'failed', 'bounced']).optional(),
  limit: z.number().int().min(1).max(100).default(50).optional(),
});

// ============================================================================
// Analytics API Schemas (NEW)
// ============================================================================

export const AnalyticsGetSchema = z.object({
  metric: z.enum([
    'requests_summary',
    'quote_conversion',
    'agent_performance',
    'response_times',
    'revenue',
  ]),
  start_date: z.string().datetime('Invalid start date format'),
  end_date: z.string().datetime('Invalid end date format'),
  iso_agent_id: z.string().uuid().optional(),
  group_by: z.enum(['day', 'week', 'month']).default('day').optional(),
});

export const AnalyticsRequestsSummarySchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  group_by: z.enum(['day', 'week', 'month']).optional(),
});

export const AnalyticsQuoteConversionSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  client_id: z.string().uuid().optional(),
});

export const AnalyticsAgentPerformanceSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  agent_type: z.enum([
    'orchestrator',
    'client_data',
    'flight_search',
    'proposal_analysis',
    'communication',
    'error_monitor',
  ]).optional(),
});

// ============================================================================
// Type exports for use in API routes
// ============================================================================

export type QuotesGetParams = z.infer<typeof QuotesGetSchema>;
export type QuotesPatchBody = z.infer<typeof QuotesPatchSchema>;

export type ClientsGetParams = z.infer<typeof ClientsGetSchema>;
export type ClientsPostBody = z.infer<typeof ClientsPostSchema>;
export type ClientsPatchBody = z.infer<typeof ClientsPatchSchema>;
export type ClientsDeleteBody = z.infer<typeof ClientsDeleteSchema>;

export type AgentsGetParams = z.infer<typeof AgentsGetSchema>;

export type WorkflowsGetParams = z.infer<typeof WorkflowsGetSchema>;

export type RequestsGetParams = z.infer<typeof RequestsGetSchema>;
export type RequestsPostBody = z.infer<typeof RequestsPostSchema>;
export type RequestsPatchBody = z.infer<typeof RequestsPatchSchema>;
export type RequestsDeleteBody = z.infer<typeof RequestsDeleteSchema>;

export type EmailSendBody = z.infer<typeof EmailSendSchema>;
export type EmailTemplateGetParams = z.infer<typeof EmailTemplateGetSchema>;
export type EmailTemplatePostBody = z.infer<typeof EmailTemplatePostSchema>;
export type EmailTemplatePatchBody = z.infer<typeof EmailTemplatePatchSchema>;
export type EmailHistoryGetParams = z.infer<typeof EmailHistoryGetSchema>;

export type AnalyticsGetParams = z.infer<typeof AnalyticsGetSchema>;
export type AnalyticsRequestsSummaryParams = z.infer<typeof AnalyticsRequestsSummarySchema>;
export type AnalyticsQuoteConversionParams = z.infer<typeof AnalyticsQuoteConversionSchema>;
export type AnalyticsAgentPerformanceParams = z.infer<typeof AnalyticsAgentPerformanceSchema>;
