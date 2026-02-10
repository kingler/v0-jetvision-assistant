/**
 * Onboarding Contract PDF Generator
 *
 * Service for generating ISO Agent employment commission contract PDFs.
 * Used during the agent onboarding workflow to create a formalized
 * commission agreement document.
 *
 * @see lib/pdf/onboarding-contract-template.tsx
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { OnboardingContractDocument } from './onboarding-contract-template';

// =============================================================================
// TYPES
// =============================================================================

export interface OnboardingContractInput {
  /** Full legal name of the ISO agent */
  agentName: string;
  /** Agent's email address */
  agentEmail: string;
  /** Agent's mailing address */
  agentAddress: string;
  /** Agent's date of birth (ISO format YYYY-MM-DD) */
  agentDOB: string;
  /** Commission percentage (e.g., 10 for 10%) */
  commissionPercentage: number;
  /** Contract effective date (ISO format YYYY-MM-DD) */
  effectiveDate: string;
}

export interface OnboardingContractOutput {
  /** Raw PDF as a Node.js Buffer */
  pdfBuffer: Buffer;
  /** Base64-encoded PDF string for transport/storage */
  pdfBase64: string;
  /** Suggested filename for the generated PDF */
  fileName: string;
}

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate an ISO Agent commission contract PDF
 *
 * Renders the OnboardingContractDocument React PDF template to a buffer
 * and returns it along with a base64 encoding and descriptive filename.
 *
 * @param input - Contract generation input data
 * @returns Generated contract PDF with buffer, base64, and filename
 */
export async function generateOnboardingContract(
  input: OnboardingContractInput
): Promise<OnboardingContractOutput> {
  const pdfBuffer = await renderToBuffer(
    React.createElement(OnboardingContractDocument, input) as React.ReactElement
  );

  const buffer = Buffer.from(pdfBuffer);
  const pdfBase64 = buffer.toString('base64');
  const dateSlug = input.effectiveDate.replace(/-/g, '');
  const fileName = `commission-contract-${dateSlug}.pdf`;

  return { pdfBuffer: buffer, pdfBase64, fileName };
}

export default generateOnboardingContract;
