/**
 * Onboarding Contract PDF Generator
 *
 * Generates employment commission contract PDFs for ISO agent onboarding.
 * Uses @react-pdf/renderer for server-side PDF generation.
 *
 * @see lib/pdf/onboarding-contract-template.tsx
 * @see lib/pdf/contract-generator.ts (flight contracts — different generator)
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  OnboardingContractDocument,
  type OnboardingContractData,
} from './onboarding-contract-template';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateOnboardingContractInput {
  agentId: string;
  agentName: string;
  agentEmail: string;
  agentAddress: string;
  agentCity: string;
  agentState: string;
  agentZipCode: string;
  agentDateOfBirth: string;
  commissionPercentage: number;
}

export interface GenerateOnboardingContractOutput {
  pdfBuffer: Buffer;
  pdfBase64: string;
  fileName: string;
  contractId: string;
  generatedAt: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function generateOnboardingContractId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OBC-${timestamp}-${random}`;
}

export function generateOnboardingFileName(
  agentName: string,
  contractDate: string
): string {
  const safeName = agentName.replace(/[^a-zA-Z0-9]/g, '_');
  const datePart = contractDate.replace(/-/g, '');
  return `Jetvision_Commission_Contract_${safeName}_${datePart}.pdf`;
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

export async function generateOnboardingContract(
  input: GenerateOnboardingContractInput
): Promise<GenerateOnboardingContractOutput> {
  const contractId = generateOnboardingContractId();
  const generatedAt = new Date().toISOString();
  const contractDate = generatedAt.split('T')[0];

  const contractData: OnboardingContractData = {
    agentName: input.agentName,
    agentEmail: input.agentEmail,
    agentAddress: input.agentAddress,
    agentCity: input.agentCity,
    agentState: input.agentState,
    agentZipCode: input.agentZipCode,
    agentDateOfBirth: input.agentDateOfBirth,
    commissionPercentage: input.commissionPercentage,
    contractDate,
    contractId,
  };

  const pdfBuffer = await renderToBuffer(
    React.createElement(OnboardingContractDocument, { data: contractData }) as React.ReactElement
  );

  const pdfBase64 = pdfBuffer.toString('base64');
  const fileName = generateOnboardingFileName(input.agentName, contractDate);

  return {
    pdfBuffer,
    pdfBase64,
    fileName,
    contractId,
    generatedAt,
  };
}

export default generateOnboardingContract;
