/**
 * PDF Contract Generator
 *
 * Service for generating PDF contracts from flight booking data.
 * Used when the "Book Flight" button is clicked in the RFQ workflow.
 *
 * @see lib/pdf/contract-template.tsx
 * @see docs/plans/2026-01-28-book-flight-contract-generation.md
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import Decimal from 'decimal.js';
import { ContractDocument } from './contract-template';
import type {
  ContractData,
  GenerateContractInput,
  GenerateContractOutput,
  ContractPricing,
  ContractFlightDetails,
  ContractCustomer,
  ContractAmenities,
  WireTransferInstructions,
} from '@/lib/types/contract';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default Federal Excise Tax percentage for US domestic flights */
const DEFAULT_FET_PERCENTAGE = 7.5;

/** Default domestic segment fee per passenger per segment (USD) */
const DEFAULT_SEGMENT_FEE = 5.20;

/** Default credit card processing fee percentage */
const DEFAULT_CC_FEE_PERCENTAGE = 5.0;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate contract generation input data
 *
 * Ensures all required fields are present and well-formed before processing.
 * Throws descriptive errors for immediate, actionable feedback.
 *
 * @param input - Contract generation input to validate
 * @throws {Error} If validation fails with descriptive error message
 */
function validateContractInput(input: GenerateContractInput): void {
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

  // Validate flight details
  if (!input.flightDetails) {
    throw new Error('Flight details are required');
  }
  if (!input.flightDetails.departureAirport) {
    throw new Error('Departure airport information is required');
  }
  if (!input.flightDetails.departureAirport.icao || typeof input.flightDetails.departureAirport.icao !== 'string') {
    throw new Error('Departure airport ICAO code is required and must be a non-empty string');
  }
  if (!input.flightDetails.arrivalAirport) {
    throw new Error('Arrival airport information is required');
  }
  if (!input.flightDetails.arrivalAirport.icao || typeof input.flightDetails.arrivalAirport.icao !== 'string') {
    throw new Error('Arrival airport ICAO code is required and must be a non-empty string');
  }
  if (!input.flightDetails.departureDate || typeof input.flightDetails.departureDate !== 'string') {
    throw new Error('Departure date is required and must be a non-empty string');
  }
  // Validate date format (basic ISO date check: YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input.flightDetails.departureDate.trim())) {
    throw new Error('Departure date must be in ISO format (YYYY-MM-DD)');
  }
  if (!input.flightDetails.aircraftType || typeof input.flightDetails.aircraftType !== 'string') {
    throw new Error('Aircraft type is required and must be a non-empty string');
  }
  if (typeof input.flightDetails.passengers !== 'number' || input.flightDetails.passengers < 1) {
    throw new Error('Number of passengers is required and must be a positive number');
  }

  // Validate pricing
  if (!input.pricing) {
    throw new Error('Pricing information is required');
  }
  if (typeof input.pricing.flightCost !== 'number' || input.pricing.flightCost < 0) {
    throw new Error('Flight cost is required and must be a non-negative number');
  }
  if (typeof input.pricing.totalAmount !== 'number' || input.pricing.totalAmount < 0) {
    throw new Error('Total amount is required and must be a non-negative number');
  }

  // Validate request ID
  if (!input.requestId || typeof input.requestId !== 'string') {
    throw new Error('Request ID is required');
  }

  // Validate ISO agent ID
  if (!input.isoAgentId || typeof input.isoAgentId !== 'string') {
    throw new Error('ISO agent ID is required');
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique contract ID for internal tracking
 */
export function generateContractId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CONTRACT-${timestamp}-${random}`;
}

/**
 * Generate a contract number based on date
 * Format: MMDDYY (e.g., "101225" for October 12, 2025)
 */
function generateContractNumber(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${month}${day}${year}`;
}

/**
 * Calculate pricing with taxes and fees
 *
 * Uses Decimal.js for all financial calculations to ensure precision
 * and proper currency rounding to 2 decimal places.
 *
 * @param flightCost - Base flight cost
 * @param passengers - Number of passengers
 * @param segments - Number of flight segments (default: 1)
 * @param ccFeePercentage - Credit card fee percentage (default: 5%)
 * @returns Complete pricing breakdown
 */
export function calculateContractPricing(
  flightCost: number,
  passengers: number,
  segments: number = 1,
  ccFeePercentage: number = DEFAULT_CC_FEE_PERCENTAGE
): ContractPricing {
  const flightCostDecimal = new Decimal(flightCost);

  // Calculate Federal Excise Tax (7.5% of flight cost)
  const federalExciseTaxDecimal = flightCostDecimal
    .times(new Decimal(DEFAULT_FET_PERCENTAGE).dividedBy(100))
    .toDecimalPlaces(2);

  // Calculate Domestic Segment Fee ($5.20 per passenger per segment)
  const segmentFeeDecimal = new Decimal(DEFAULT_SEGMENT_FEE)
    .times(passengers)
    .times(segments)
    .toDecimalPlaces(2);

  // Calculate subtotal (flight cost + FET + segment fee)
  const subtotalDecimal = flightCostDecimal
    .plus(federalExciseTaxDecimal)
    .plus(segmentFeeDecimal)
    .toDecimalPlaces(2);

  // Total amount (same as subtotal for wire transfers, or with CC fee added)
  // For now, we'll show subtotal as total; CC fee is shown separately
  const totalDecimal = subtotalDecimal.toDecimalPlaces(2);

  return {
    flightCost: flightCostDecimal.toNumber(),
    federalExciseTax: federalExciseTaxDecimal.toNumber(),
    domesticSegmentFee: segmentFeeDecimal.toNumber(),
    subtotal: subtotalDecimal.toNumber(),
    creditCardFeePercentage: ccFeePercentage,
    totalAmount: totalDecimal.toNumber(),
    currency: 'USD',
  };
}

/**
 * Calculate quote validity date
 * Default is 7 days from now if not specified
 *
 * @param validUntil - Optional explicit validity date
 * @returns Validity date string (YYYY-MM-DD)
 */
function calculateQuoteValidUntil(validUntil?: string): string {
  if (validUntil) {
    return validUntil;
  }
  // Default to 7 days from now
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry.toISOString().split('T')[0];
}

/**
 * Generate a safe filename for the contract PDF
 */
export function generateFileName(
  departureAirport: string,
  arrivalAirport: string,
  departureDate: string,
  contractNumber: string
): string {
  const datePart = departureDate.replace(/-/g, '');
  return `Jetvision_Contract_${departureAirport}_${arrivalAirport}_${datePart}_${contractNumber}.pdf`;
}

/**
 * Read wire transfer instructions from environment variables.
 * Returns undefined if no bank details are configured.
 */
function getWireTransferInstructions(): WireTransferInstructions | undefined {
  const bankName = process.env.WIRE_BANK_NAME;
  const routingNumber = process.env.WIRE_ROUTING_NUMBER;
  const accountNumber = process.env.WIRE_ACCOUNT_NUMBER;

  if (!bankName && !routingNumber && !accountNumber) {
    return undefined;
  }

  return {
    bankName: bankName || '[Bank Name]',
    routingNumber: routingNumber || '[Routing Number]',
    accountNumber: accountNumber || '[Account Number]',
    accountName: process.env.WIRE_ACCOUNT_NAME || 'Jetvision LLC',
    swiftCode: process.env.WIRE_SWIFT_CODE,
    mailingAddress: process.env.WIRE_MAILING_ADDRESS,
  };
}

/**
 * Normalize amenities to ensure all fields have boolean values
 */
function normalizeAmenities(amenities?: Partial<ContractAmenities>): ContractAmenities {
  return {
    pets: amenities?.pets ?? false,
    smoking: amenities?.smoking ?? false,
    wifi: amenities?.wifi ?? false,
    galley: amenities?.galley ?? false,
    lavatory: amenities?.lavatory ?? false,
    medical: amenities?.medical ?? false,
    flightAttendant: amenities?.flightAttendant ?? false,
    leatherSeats: amenities?.leatherSeats ?? false,
    airConditioning: amenities?.airConditioning ?? true, // Default to true
  };
}

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate a PDF contract from booking data
 *
 * @param input - Contract generation input
 * @returns Generated contract with PDF buffer and metadata
 */
export async function generateContract(
  input: GenerateContractInput
): Promise<GenerateContractOutput> {
  // Validate input
  validateContractInput(input);

  // Generate IDs and timestamps
  const contractId = generateContractId();
  const contractNumber = input.referenceQuoteNumber || generateContractNumber();
  const generatedAt = new Date().toISOString();

  // Calculate quote validity
  const quoteValidUntil = calculateQuoteValidUntil();

  // Normalize amenities
  const amenities = normalizeAmenities(input.amenities);

  // Prepare contract data for template
  const contractData: ContractData = {
    contractId,
    contractNumber,
    generatedAt,
    customer: input.customer,
    flightDetails: input.flightDetails,
    pricing: input.pricing,
    amenities,
    paymentMethod: input.paymentMethod,
    quoteValidUntil,
    wireTransferInstructions: getWireTransferInstructions(),
  };

  // Generate contract PDF
  let pdfBuffer = await renderToBuffer(
    React.createElement(ContractDocument, { data: contractData }) as React.ReactElement
  );

  // If a proposal PDF is provided, merge it as the first pages
  if (input.proposalPdfBuffer && input.proposalPdfBuffer.length > 0) {
    try {
      const mergedPdf = await PDFDocument.create();
      const proposalDoc = await PDFDocument.load(input.proposalPdfBuffer);
      const contractDoc = await PDFDocument.load(pdfBuffer);

      // Copy proposal pages first
      const proposalPages = await mergedPdf.copyPages(
        proposalDoc,
        proposalDoc.getPageIndices()
      );
      for (const page of proposalPages) {
        mergedPdf.addPage(page);
      }

      // Then copy contract pages
      const contractPages = await mergedPdf.copyPages(
        contractDoc,
        contractDoc.getPageIndices()
      );
      for (const page of contractPages) {
        mergedPdf.addPage(page);
      }

      const mergedBytes = await mergedPdf.save();
      pdfBuffer = Buffer.from(mergedBytes);
    } catch (mergeError) {
      // If merge fails, fall back to contract-only PDF
      console.error('[ContractGenerator] Failed to merge proposal PDF, using contract only:', mergeError);
    }
  }

  // Convert to base64
  const pdfBase64 = pdfBuffer.toString('base64');

  // Generate filename
  const fileName = generateFileName(
    input.flightDetails.departureAirport.icao,
    input.flightDetails.arrivalAirport.icao,
    input.flightDetails.departureDate,
    contractNumber
  );

  return {
    contractId: input.saveDraft ? undefined : contractId,
    contractNumber: input.saveDraft ? undefined : contractNumber,
    pdfBuffer,
    pdfBase64,
    fileName,
    generatedAt,
    pricing: input.pricing,
  };
}

/**
 * Generate contract data without rendering PDF
 * Useful for preview or validation
 *
 * @param input - Contract generation input
 * @returns Prepared contract data ready for PDF rendering
 * @throws {Error} If validation fails with descriptive error message
 */
export function prepareContractData(
  input: GenerateContractInput
): ContractData {
  // Validate input
  validateContractInput(input);

  const contractId = generateContractId();
  const contractNumber = input.referenceQuoteNumber || generateContractNumber();
  const generatedAt = new Date().toISOString();
  const quoteValidUntil = calculateQuoteValidUntil();
  const amenities = normalizeAmenities(input.amenities);

  return {
    contractId,
    contractNumber,
    generatedAt,
    customer: input.customer,
    flightDetails: input.flightDetails,
    pricing: input.pricing,
    amenities,
    paymentMethod: input.paymentMethod,
    quoteValidUntil,
    wireTransferInstructions: getWireTransferInstructions(),
  };
}

/**
 * Generate credit card authorization form as separate PDF
 * This can be sent separately or attached to the main contract
 *
 * @param contractData - Contract data to include in the form
 * @returns Generated PDF with CC auth form
 */
export async function generateCCAuthForm(
  contractData: ContractData
): Promise<{ pdfBase64: string; fileName: string }> {
  // For now, the CC auth form is included in the main contract
  // This function is a placeholder for generating it separately if needed

  const pdfBuffer = await renderToBuffer(
    React.createElement(ContractDocument, { data: contractData }) as React.ReactElement
  );

  const pdfBase64 = pdfBuffer.toString('base64');
  const fileName = `Jetvision_CC_Authorization_${contractData.contractNumber}.pdf`;

  return {
    pdfBase64,
    fileName,
  };
}

export default generateContract;
