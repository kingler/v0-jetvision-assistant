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
import {
  ProposalDocument,
  type ProposalData,
  type TripType,
  type ProposalAirport,
} from './proposal-template';
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
    /**
     * Type of trip - one_way or round_trip
     * Default: 'one_way' for backward compatibility
     */
    tripType?: TripType;
    departureAirport: ProposalAirport;
    arrivalAirport: ProposalAirport;
    departureDate: string;
    departureTime?: string;
    /**
     * Return date for round-trip proposals (ISO format YYYY-MM-DD)
     * Required when tripType is 'round_trip'
     */
    returnDate?: string;
    /**
     * Return departure time for round-trip proposals
     * Only applicable when tripType is 'round_trip'
     */
    returnTime?: string;
    /**
     * Return arrival airport for round-trip proposals
     * Defaults to original departure airport if not specified
     * Only applicable when tripType is 'round_trip'
     */
    returnAirport?: ProposalAirport;
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
    /**
     * Cost breakdown for outbound leg (round-trip only)
     */
    outboundCost?: number;
    /**
     * Cost breakdown for return leg (round-trip only)
     */
    returnCost?: number;
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

  // Validate round-trip specific fields
  if (input.tripDetails.tripType === 'round_trip') {
    // Return date is required for round-trip
    if (!input.tripDetails.returnDate || typeof input.tripDetails.returnDate !== 'string' || input.tripDetails.returnDate.trim().length === 0) {
      throw new Error('Return date is required for round-trip proposals and must be a non-empty string');
    }
    // Validate return date format (basic ISO date check: YYYY-MM-DD)
    if (!dateRegex.test(input.tripDetails.returnDate.trim())) {
      throw new Error('Return date must be in ISO format (YYYY-MM-DD)');
    }
    // Validate return date is after departure date
    const departureDate = new Date(input.tripDetails.departureDate);
    const returnDate = new Date(input.tripDetails.returnDate);
    if (returnDate < departureDate) {
      throw new Error('Return date must be on or after the departure date');
    }
    // Validate return airport if provided
    if (input.tripDetails.returnAirport) {
      if (!input.tripDetails.returnAirport.icao || typeof input.tripDetails.returnAirport.icao !== 'string' || input.tripDetails.returnAirport.icao.trim().length === 0) {
        throw new Error('Return airport ICAO code must be a non-empty string if provided');
      }
    }
    // Validate that at least one return flight is selected for round-trip
    const returnFlights = input.selectedFlights.filter(
      (f) => f.legType === 'return' || f.legSequence === 2
    );
    if (returnFlights.length === 0) {
      throw new Error('At least one return flight must be selected for round-trip proposals');
    }
    // Validate that at least one outbound flight is selected for round-trip
    const outboundFlights = input.selectedFlights.filter(
      (f) => !f.legType || f.legType === 'outbound' || f.legSequence === 1
    );
    if (outboundFlights.length === 0) {
      throw new Error('At least one outbound flight must be selected for round-trip proposals');
    }
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
 * Separate flights by leg type for round-trip proposals
 *
 * Flights are categorized based on:
 * - legType field ('outbound' or 'return')
 * - legSequence field (1 for outbound, 2 for return)
 * - Flights without leg info default to outbound for backward compatibility
 *
 * @param flights - Array of selected RFQ flights
 * @returns Object containing outbound and return flight arrays
 */
function separateFlightsByLeg(flights: RFQFlight[]): {
  outboundFlights: RFQFlight[];
  returnFlights: RFQFlight[];
} {
  const outboundFlights = flights.filter(
    (f) => !f.legType || f.legType === 'outbound' || f.legSequence === 1
  );
  const returnFlights = flights.filter(
    (f) => f.legType === 'return' || f.legSequence === 2
  );

  return { outboundFlights, returnFlights };
}

/**
 * Sort flights by leg sequence for consistent ordering in proposals
 *
 * Outbound flights (legSequence 1) come first, then return flights (legSequence 2).
 * Within each leg, flights maintain their original order.
 *
 * @param flights - Array of selected RFQ flights
 * @returns Sorted array with outbound flights first, then return flights
 */
function sortFlightsByLegSequence(flights: RFQFlight[]): RFQFlight[] {
  return [...flights].sort((a, b) => {
    const seqA = a.legSequence ?? (a.legType === 'return' ? 2 : 1);
    const seqB = b.legSequence ?? (b.legType === 'return' ? 2 : 1);
    return seqA - seqB;
  });
}

/**
 * Calculate pricing summary from selected flights
 *
 * Uses Decimal.js for all financial calculations to ensure precision
 * and proper currency rounding to 2 decimal places.
 *
 * For round-trip proposals, also calculates per-leg cost breakdown
 * using the legType field on each flight (outbound/return).
 *
 * @param flights - Array of selected RFQ flights
 * @param jetvisionFeePercentage - Service fee percentage (default: 10%)
 * @param isRoundTrip - Whether this is a round-trip proposal (enables leg breakdown)
 * @returns Pricing breakdown with all amounts rounded to 2 decimal places
 */
function calculatePricing(
  flights: RFQFlight[],
  jetvisionFeePercentage: number = 10,
  isRoundTrip: boolean = false
): {
  subtotal: number;
  jetvisionFee: number;
  taxes: number;
  total: number;
  currency: string;
  outboundCost?: number;
  returnCost?: number;
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

  // Calculate per-leg costs for round-trip proposals
  let outboundCost: number | undefined;
  let returnCost: number | undefined;

  if (isRoundTrip) {
    // Sum costs for outbound flights (legType === 'outbound' or legSequence === 1)
    const outboundFlights = flights.filter(
      (f) => f.legType === 'outbound' || f.legSequence === 1
    );
    if (outboundFlights.length > 0) {
      outboundCost = outboundFlights
        .reduce((sum, flight) => {
          const price = flight.priceBreakdown
            ? new Decimal(flight.priceBreakdown.basePrice)
            : new Decimal(flight.totalPrice);
          return sum.plus(price);
        }, new Decimal(0))
        .toDecimalPlaces(2)
        .toNumber();
    }

    // Sum costs for return flights (legType === 'return' or legSequence === 2)
    const returnFlights = flights.filter(
      (f) => f.legType === 'return' || f.legSequence === 2
    );
    if (returnFlights.length > 0) {
      returnCost = returnFlights
        .reduce((sum, flight) => {
          const price = flight.priceBreakdown
            ? new Decimal(flight.priceBreakdown.basePrice)
            : new Decimal(flight.totalPrice);
          return sum.plus(price);
        }, new Decimal(0))
        .toDecimalPlaces(2)
        .toNumber();
    }
  }

  return {
    subtotal,
    jetvisionFee,
    taxes,
    total,
    currency,
    ...(isRoundTrip && { outboundCost, returnCost }),
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
 *
 * For round-trip proposals, includes "RT" indicator and both dates.
 * Example one-way: Jetvision_Proposal_KJFK_KLAX_20250215_JV-ABC123.pdf
 * Example round-trip: Jetvision_Proposal_RT_KJFK_KLAX_20250215_20250220_JV-ABC123.pdf
 */
function generateFileName(
  departureAirport: string,
  arrivalAirport: string,
  departureDate: string,
  proposalId: string,
  isRoundTrip: boolean = false,
  returnDate?: string
): string {
  const departureDatePart = departureDate.replace(/-/g, '');

  if (isRoundTrip && returnDate) {
    const returnDatePart = returnDate.replace(/-/g, '');
    return `Jetvision_Proposal_RT_${departureAirport}_${arrivalAirport}_${departureDatePart}_${returnDatePart}_${proposalId}.pdf`;
  }

  return `Jetvision_Proposal_${departureAirport}_${arrivalAirport}_${departureDatePart}_${proposalId}.pdf`;
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

  // Determine if this is a round-trip proposal
  const isRoundTrip = input.tripDetails.tripType === 'round_trip';

  // Sort flights by leg sequence for consistent ordering (outbound first, then return)
  const sortedFlights = isRoundTrip
    ? sortFlightsByLegSequence(input.selectedFlights)
    : input.selectedFlights;

  // Calculate pricing (with leg breakdown for round-trips)
  const pricing = calculatePricing(
    sortedFlights,
    input.jetvisionFeePercentage,
    isRoundTrip
  );

  // Calculate quote validity
  const quoteValidUntil = calculateQuoteValidUntil(sortedFlights);

  // For round-trip, set returnAirport to departureAirport if not specified
  const tripDetails = isRoundTrip
    ? {
        ...input.tripDetails,
        returnAirport: input.tripDetails.returnAirport || input.tripDetails.departureAirport,
      }
    : input.tripDetails;

  // Prepare proposal data
  const proposalData: ProposalData = {
    proposalId,
    generatedAt,
    customer: input.customer,
    tripDetails,
    selectedFlights: sortedFlights,
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

  // Generate filename (includes RT indicator and return date for round-trips)
  const fileName = generateFileName(
    input.tripDetails.departureAirport.icao,
    input.tripDetails.arrivalAirport.icao,
    input.tripDetails.departureDate,
    proposalId,
    isRoundTrip,
    input.tripDetails.returnDate
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

  // Determine if this is a round-trip proposal
  const isRoundTrip = input.tripDetails.tripType === 'round_trip';

  // Sort flights by leg sequence for consistent ordering (outbound first, then return)
  const sortedFlights = isRoundTrip
    ? sortFlightsByLegSequence(input.selectedFlights)
    : input.selectedFlights;

  const pricing = calculatePricing(
    sortedFlights,
    input.jetvisionFeePercentage,
    isRoundTrip
  );
  const quoteValidUntil = calculateQuoteValidUntil(sortedFlights);

  // For round-trip, set returnAirport to departureAirport if not specified
  const tripDetails = isRoundTrip
    ? {
        ...input.tripDetails,
        returnAirport: input.tripDetails.returnAirport || input.tripDetails.departureAirport,
      }
    : input.tripDetails;

  return {
    proposalId,
    generatedAt,
    customer: input.customer,
    tripDetails,
    selectedFlights: sortedFlights,
    pricing,
    quoteValidUntil,
  };
}

// Export helper functions for external use
export { separateFlightsByLeg, sortFlightsByLegSequence };

export default generateProposal;
