/**
 * PDF Proposal Generator
 *
 * Service for generating PDF proposals from selected RFQ flights.
 * Used in Step 4 of the RFP workflow.
 *
 * @see lib/pdf/proposal-template.tsx
 * @see docs/plans/2025-12-22-rfq-workflow-steps-3-4-design.md
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import Decimal from 'decimal.js';
import { ProposalDocument, type ProposalData } from './proposal-template';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateProposalInput {
  customer: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  tripDetails: {
    departureAirport: {
      icao: string;
      name?: string;
      city?: string;
    };
    arrivalAirport: {
      icao: string;
      name?: string;
      city?: string;
    };
    departureDate: string;
    departureTime?: string;
    passengers: number;
    tripId?: string;
  };
  selectedFlights: RFQFlight[];
  jetvisionFeePercentage?: number; // Default: 10%
}

export interface GenerateProposalOutput {
  proposalId: string;
  pdfBuffer: Buffer;
  pdfBase64: string;
  fileName: string;
  generatedAt: string;
  pricing: {
    subtotal: number;
    jetvisionFee: number;
    taxes: number;
    total: number;
    currency: string;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate proposal input data
 * 
 * Ensures all required fields are present and well-formed before processing.
 * Throws descriptive errors for immediate, actionable feedback.
 * 
 * @param input - Proposal generation input to validate
 * @throws {Error} If validation fails with descriptive error message
 */
function validateProposalInput(input: GenerateProposalInput): void {
  // Validate selectedFlights: must be a non-empty array
  if (!input.selectedFlights || !Array.isArray(input.selectedFlights)) {
    throw new Error(
      'selectedFlights must be a non-empty array of flight objects'
    );
  }
  if (input.selectedFlights.length === 0) {
    throw new Error('At least one flight must be selected to generate a proposal');
  }

  // Validate customer: must have name and email (required fields)
  if (!input.customer) {
    throw new Error('Customer information is required');
  }
  if (!input.customer.name || typeof input.customer.name !== 'string' || input.customer.name.trim().length === 0) {
    throw new Error('Customer name is required and must be a non-empty string');
  }
  if (!input.customer.email || typeof input.customer.email !== 'string' || input.customer.email.trim().length === 0) {
    throw new Error('Customer email is required and must be a non-empty string');
  }
  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.customer.email.trim())) {
    throw new Error('Customer email must be a valid email address');
  }

  // Validate tripDetails: must be present and well-formed
  if (!input.tripDetails) {
    throw new Error('Trip details are required');
  }
  if (!input.tripDetails.departureAirport) {
    throw new Error('Departure airport information is required');
  }
  if (!input.tripDetails.departureAirport.icao || typeof input.tripDetails.departureAirport.icao !== 'string' || input.tripDetails.departureAirport.icao.trim().length === 0) {
    throw new Error('Departure airport ICAO code is required and must be a non-empty string');
  }
  if (!input.tripDetails.arrivalAirport) {
    throw new Error('Arrival airport information is required');
  }
  if (!input.tripDetails.arrivalAirport.icao || typeof input.tripDetails.arrivalAirport.icao !== 'string' || input.tripDetails.arrivalAirport.icao.trim().length === 0) {
    throw new Error('Arrival airport ICAO code is required and must be a non-empty string');
  }
  if (!input.tripDetails.departureDate || typeof input.tripDetails.departureDate !== 'string' || input.tripDetails.departureDate.trim().length === 0) {
    throw new Error('Departure date is required and must be a non-empty string');
  }
  // Validate date format (basic ISO date check: YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input.tripDetails.departureDate.trim())) {
    throw new Error('Departure date must be in ISO format (YYYY-MM-DD)');
  }
  if (typeof input.tripDetails.passengers !== 'number' || input.tripDetails.passengers < 1) {
    throw new Error('Number of passengers is required and must be a positive number');
  }

  // Validate jetvisionFeePercentage: if provided, must be a valid number in range 0-100
  if (input.jetvisionFeePercentage !== undefined) {
    if (typeof input.jetvisionFeePercentage !== 'number' || isNaN(input.jetvisionFeePercentage)) {
      throw new Error('Jetvision fee percentage must be a valid number');
    }
    if (input.jetvisionFeePercentage < 0 || input.jetvisionFeePercentage > 100) {
      throw new Error('Jetvision fee percentage must be between 0 and 100');
    }
  }
}

/**
 * Generate a unique proposal ID
 */
function generateProposalId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JV-${timestamp}-${random}`;
}

/**
 * Calculate pricing summary from selected flights
 * 
 * Uses Decimal.js for all financial calculations to ensure precision
 * and proper currency rounding to 2 decimal places.
 * 
 * @param flights - Array of selected RFQ flights
 * @param jetvisionFeePercentage - Service fee percentage (default: 10%)
 * @returns Pricing breakdown with all amounts rounded to 2 decimal places
 */
function calculatePricing(
  flights: RFQFlight[],
  jetvisionFeePercentage: number = 10
): {
  subtotal: number;
  jetvisionFee: number;
  taxes: number;
  total: number;
  currency: string;
} {
  // Use the first flight's currency (assuming all are same currency)
  const currency = flights[0]?.currency || 'USD';

  // Calculate subtotal from all selected flights using Decimal for precision
  // Accumulate all base prices to avoid floating-point errors
  const subtotalDecimal = flights.reduce((sum, flight) => {
    // If flight has breakdown, use base price; otherwise use total price
    const price = flight.priceBreakdown
      ? new Decimal(flight.priceBreakdown.basePrice)
      : new Decimal(flight.totalPrice);
    return sum.plus(price);
  }, new Decimal(0));

  // Round subtotal to 2 decimal places (currency precision)
  const subtotal = subtotalDecimal.toDecimalPlaces(2).toNumber();

  // Calculate Jetvision service fee using Decimal for precise percentage calculation
  // Formula: subtotal * (percentage / 100), rounded to 2 decimal places
  const jetvisionFeeDecimal = subtotalDecimal
    .times(new Decimal(jetvisionFeePercentage).dividedBy(100))
    .toDecimalPlaces(2); // Round to 2 decimal places for currency
  const jetvisionFee = jetvisionFeeDecimal.toNumber();

  // Calculate taxes from all flights using Decimal for precision
  const taxesDecimal = flights.reduce((sum, flight) => {
    if (flight.priceBreakdown) {
      const taxes = new Decimal(flight.priceBreakdown.taxes || 0);
      const fees = new Decimal(flight.priceBreakdown.fees || 0);
      return sum.plus(taxes).plus(fees);
    }
    return sum;
  }, new Decimal(0));

  // Round taxes to 2 decimal places (currency precision)
  const taxes = taxesDecimal.toDecimalPlaces(2).toNumber();

  // Calculate total using Decimal to ensure precision in final sum
  // Sum all components and round to 2 decimal places
  const totalDecimal = subtotalDecimal
    .plus(jetvisionFeeDecimal)
    .plus(taxesDecimal)
    .toDecimalPlaces(2); // Round to 2 decimal places for currency
  const total = totalDecimal.toNumber();

  return {
    subtotal,
    jetvisionFee,
    taxes,
    total,
    currency,
  };
}

/**
 * Calculate quote validity date (soonest expiry among all flights)
 */
function calculateQuoteValidUntil(flights: RFQFlight[]): string {
  const validUntilDates = flights
    .filter((f) => f.validUntil)
    .map((f) => new Date(f.validUntil!).getTime());

  if (validUntilDates.length === 0) {
    // Default to 7 days from now if no validity dates
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    return defaultExpiry.toISOString().split('T')[0];
  }

  // Return the soonest expiry date
  const soonest = Math.min(...validUntilDates);
  return new Date(soonest).toISOString().split('T')[0];
}

/**
 * Generate a safe filename for the PDF
 */
function generateFileName(
  departureAirport: string,
  arrivalAirport: string,
  departureDate: string,
  proposalId: string
): string {
  const datePart = departureDate.replace(/-/g, '');
  return `Jetvision_Proposal_${departureAirport}_${arrivalAirport}_${datePart}_${proposalId}.pdf`;
}

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate a PDF proposal from selected RFQ flights
 *
 * @param input - Proposal generation input
 * @returns Generated proposal with PDF buffer and metadata
 */
export async function generateProposal(
  input: GenerateProposalInput
): Promise<GenerateProposalOutput> {
  // Validate input using shared validation helper
  validateProposalInput(input);

  // Generate IDs and timestamps
  const proposalId = generateProposalId();
  const generatedAt = new Date().toISOString();

  // Calculate pricing
  const pricing = calculatePricing(
    input.selectedFlights,
    input.jetvisionFeePercentage
  );

  // Calculate quote validity
  const quoteValidUntil = calculateQuoteValidUntil(input.selectedFlights);

  // Prepare proposal data
  const proposalData: ProposalData = {
    proposalId,
    generatedAt,
    customer: input.customer,
    tripDetails: input.tripDetails,
    selectedFlights: input.selectedFlights,
    pricing,
    quoteValidUntil,
  };

  // Generate PDF
  // Note: Type assertion needed because renderToBuffer expects DocumentProps,
  // but ProposalDocument wraps it with custom props. The component internally
  // returns a Document element, so this is safe at runtime.
  const pdfBuffer = await renderToBuffer(
    React.createElement(ProposalDocument, { data: proposalData }) as React.ReactElement
  );

  // Convert to base64
  const pdfBase64 = pdfBuffer.toString('base64');

  // Generate filename
  const fileName = generateFileName(
    input.tripDetails.departureAirport.icao,
    input.tripDetails.arrivalAirport.icao,
    input.tripDetails.departureDate,
    proposalId
  );

  return {
    proposalId,
    pdfBuffer,
    pdfBase64,
    fileName,
    generatedAt,
    pricing,
  };
}

/**
 * Generate proposal data without rendering PDF
 * Useful for preview or validation
 * 
 * @param input - Proposal generation input
 * @returns Prepared proposal data ready for PDF rendering
 * @throws {Error} If validation fails with descriptive error message
 */
export function prepareProposalData(
  input: GenerateProposalInput
): ProposalData {
  // Validate input using shared validation helper
  // This ensures consistent validation across all proposal generation functions
  validateProposalInput(input);

  const proposalId = generateProposalId();
  const generatedAt = new Date().toISOString();
  const pricing = calculatePricing(
    input.selectedFlights,
    input.jetvisionFeePercentage
  );
  const quoteValidUntil = calculateQuoteValidUntil(input.selectedFlights);

  return {
    proposalId,
    generatedAt,
    customer: input.customer,
    tripDetails: input.tripDetails,
    selectedFlights: input.selectedFlights,
    pricing,
    quoteValidUntil,
  };
}

export default generateProposal;
