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
 * Generate a unique proposal ID
 */
function generateProposalId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JV-${timestamp}-${random}`;
}

/**
 * Calculate pricing summary from selected flights
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

  // Calculate subtotal from all selected flights
  const subtotal = flights.reduce((sum, flight) => {
    // If flight has breakdown, use base price; otherwise use total price
    if (flight.priceBreakdown) {
      return sum + flight.priceBreakdown.base;
    }
    return sum + flight.price;
  }, 0);

  // Calculate Jetvision service fee
  const jetvisionFee = Math.round(subtotal * (jetvisionFeePercentage / 100));

  // Calculate taxes from all flights
  const taxes = flights.reduce((sum, flight) => {
    if (flight.priceBreakdown) {
      return sum + flight.priceBreakdown.taxes + flight.priceBreakdown.fees;
    }
    return sum;
  }, 0);

  // Calculate total
  const total = subtotal + jetvisionFee + taxes;

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
  // Validate input
  if (!input.selectedFlights || input.selectedFlights.length === 0) {
    throw new Error('At least one flight must be selected to generate a proposal');
  }

  if (!input.customer.name || !input.customer.email) {
    throw new Error('Customer name and email are required');
  }

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
  const pdfBuffer = await renderToBuffer(
    React.createElement(ProposalDocument, { data: proposalData })
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
 */
export function prepareProposalData(
  input: GenerateProposalInput
): ProposalData {
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
