/**
 * Proposal API Service
 *
 * Client-side service for proposal generation and sending.
 * Wraps fetch calls to /api/proposal/* endpoints.
 *
 * Extracted from: components/chat-interface.tsx (lines 1407-1651)
 */

import type { RFQFlight } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Customer data for proposal generation
 */
export interface ProposalCustomer {
  /** Customer's full name */
  name: string;
  /** Customer's email address */
  email: string;
  /** Customer's company name */
  company?: string;
  /** Customer's phone number */
  phone?: string;
}

/**
 * Airport information for trip details
 */
export interface ProposalAirport {
  /** ICAO code (e.g., 'KTEB') */
  icao: string;
  /** Airport name */
  name: string;
  /** City name */
  city: string;
}

/**
 * Trip details for proposal generation
 */
export interface ProposalTripDetails {
  /** Departure airport */
  departureAirport: ProposalAirport;
  /** Arrival airport */
  arrivalAirport: ProposalAirport;
  /** Departure date in ISO format (YYYY-MM-DD) */
  departureDate: string;
  /** Number of passengers */
  passengers: number;
  /** Avinode trip ID if available */
  tripId?: string;
}

/**
 * Parameters for generating and sending a proposal
 */
export interface GenerateProposalParams {
  /** Customer information */
  customer: ProposalCustomer;
  /** Trip details */
  tripDetails: ProposalTripDetails;
  /** Selected flights for the proposal */
  selectedFlights: RFQFlight[];
  /** Jetvision fee percentage (e.g., 30 for 30%) */
  jetvisionFeePercentage: number;
  /** Request ID for persistence (optional) */
  requestId?: string;
}

/**
 * Pricing information from the generated proposal
 */
export interface ProposalPricing {
  /** Total price including fees */
  total: number;
  /** Currency code (e.g., 'USD') */
  currency: string;
}

/**
 * Result from proposal generation and sending
 */
export interface ProposalResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Generated proposal ID */
  proposalId?: string;
  /** URL to the generated PDF */
  pdfUrl?: string;
  /** PDF filename */
  fileName?: string;
  /** Whether the email was successfully sent */
  emailSent?: boolean;
  /** Email message ID if sent */
  messageId?: string;
  /** Message ID if saved to database */
  savedMessageId?: string;
  /** Pricing information */
  pricing?: ProposalPricing;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Data for the proposal sent confirmation message
 */
export interface ProposalSentData {
  flightDetails: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
  };
  client: {
    name: string;
    email: string;
  };
  pdfUrl: string;
  fileName?: string;
  proposalId?: string;
  pricing?: ProposalPricing;
}

/**
 * Parameters for persisting a proposal confirmation message
 */
export interface PersistConfirmationParams {
  /** Request ID for the conversation */
  requestId: string;
  /** Confirmation message content */
  content: string;
  /** Proposal sent data for rich content */
  proposalSentData: ProposalSentData;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Generate and send a proposal to a customer.
 *
 * This function:
 * 1. Generates a PDF proposal with the selected flights
 * 2. Applies the Jetvision fee percentage
 * 3. Sends the proposal via email
 * 4. Returns the result with PDF URL and status
 *
 * @example
 * ```ts
 * const result = await proposalApi.generateAndSend({
 *   customer: {
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     company: 'Acme Corp',
 *   },
 *   tripDetails: {
 *     departureAirport: { icao: 'KTEB', name: 'Teterboro', city: 'Teterboro' },
 *     arrivalAirport: { icao: 'KLAX', name: 'Los Angeles Intl', city: 'Los Angeles' },
 *     departureDate: '2026-02-15',
 *     passengers: 4,
 *   },
 *   selectedFlights: [flight1],
 *   jetvisionFeePercentage: 30,
 * });
 *
 * if (result.success && result.pdfUrl) {
 *   window.open(result.pdfUrl, '_blank');
 * }
 * ```
 *
 * @throws Error if the API returns non-ok status or operation fails
 */
export async function generateAndSend(params: GenerateProposalParams): Promise<ProposalResult> {
  const response = await fetch('/api/proposal/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: params.customer,
      tripDetails: params.tripDetails,
      selectedFlights: params.selectedFlights,
      jetvisionFeePercentage: params.jetvisionFeePercentage,
      ...(params.requestId ? { requestId: params.requestId } : {}),
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Failed to send proposal: ${response.statusText}`);
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to send proposal');
  }

  return result;
}

/**
 * Persist a proposal confirmation message to the database.
 *
 * Use this as a fallback when the server doesn't persist the confirmation.
 *
 * @example
 * ```ts
 * const messageId = await proposalApi.persistConfirmation({
 *   requestId: 'uuid-123',
 *   content: 'Proposal sent to john@example.com',
 *   proposalSentData: {
 *     flightDetails: { departureAirport: 'KTEB', arrivalAirport: 'KLAX', departureDate: '2026-02-15' },
 *     client: { name: 'John Doe', email: 'john@example.com' },
 *     pdfUrl: 'https://...',
 *   },
 * });
 * ```
 *
 * @returns Message ID if saved successfully, null otherwise
 */
export async function persistConfirmation(params: PersistConfirmationParams): Promise<string | null> {
  try {
    const response = await fetch('/api/messages/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: params.requestId,
        content: params.content,
        contentType: 'proposal_shared',
        richContent: { proposalSent: params.proposalSentData },
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success && result.messageId) {
      return result.messageId;
    }

    return null;
  } catch (error) {
    console.warn('[proposalApi] Failed to persist confirmation:', error);
    return null;
  }
}

/**
 * Build proposal sent data from result and input parameters.
 *
 * Utility function to create the ProposalSentData object for
 * confirmation messages.
 */
export function buildProposalSentData(
  result: ProposalResult,
  tripDetails: ProposalTripDetails,
  customer: ProposalCustomer
): ProposalSentData {
  return {
    flightDetails: {
      departureAirport: tripDetails.departureAirport.icao,
      arrivalAirport: tripDetails.arrivalAirport.icao,
      departureDate: tripDetails.departureDate,
    },
    client: {
      name: customer.name,
      email: customer.email,
    },
    pdfUrl: result.pdfUrl ?? '',
    fileName: result.fileName,
    proposalId: result.proposalId,
    pricing: result.pricing,
  };
}

/**
 * Build confirmation message content from result and input parameters.
 */
export function buildConfirmationContent(
  result: ProposalResult,
  tripDetails: ProposalTripDetails,
  customer: ProposalCustomer
): string {
  const route = `${tripDetails.departureAirport.icao} → ${tripDetails.arrivalAirport.icao}`;

  if (result.emailSent) {
    return `The proposal for ${route} was sent to ${customer.name} at ${customer.email}.`;
  }

  return `The proposal for ${route} was generated. Email could not be sent (check Gmail configuration).`;
}

/**
 * Open the proposal PDF in a new tab and trigger download.
 *
 * @param pdfUrl - URL to the PDF
 * @param fileName - Optional filename for download
 */
export function openAndDownloadPdf(pdfUrl: string, fileName?: string): void {
  // Open in new tab
  window.open(pdfUrl, '_blank');

  // Trigger download
  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = fileName || 'proposal.pdf';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Validate a request ID is a valid UUID for persistence.
 *
 * @param id - ID to validate
 * @returns True if valid UUID
 */
export function isValidRequestId(id: string | undefined | null): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Find a valid request ID from session data.
 *
 * Checks requestId, conversationId, and id in order.
 *
 * @param session - Session data with potential ID fields
 * @returns Valid request ID or null
 */
export function findValidRequestId(session: {
  requestId?: string;
  conversationId?: string;
  id?: string;
}): string | null {
  if (isValidRequestId(session.requestId)) {
    return session.requestId!;
  }
  if (isValidRequestId(session.conversationId)) {
    return session.conversationId!;
  }
  if (isValidRequestId(session.id)) {
    return session.id!;
  }
  return null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const proposalApi = {
  generateAndSend,
  persistConfirmation,
  buildProposalSentData,
  buildConfirmationContent,
  openAndDownloadPdf,
  isValidRequestId,
  findValidRequestId,
};
