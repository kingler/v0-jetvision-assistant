/**
 * Onboarding Contract Generator Tests
 *
 * Tests for ISO Agent employment commission contract PDF generation.
 *
 * @see lib/pdf/onboarding-contract-generator.ts
 * @see lib/pdf/onboarding-contract-template.tsx
 */

import { describe, it, expect } from 'vitest';
import {
  generateOnboardingContract,
  type GenerateOnboardingContractInput,
} from '@/lib/pdf/onboarding-contract-generator';

// =============================================================================
// TEST DATA
// =============================================================================

const validInput: GenerateOnboardingContractInput = {
  agentId: 'agent-123',
  agentName: 'Jane Doe',
  agentEmail: 'jane@example.com',
  agentAddress: '123 Main St',
  agentCity: 'New York',
  agentState: 'NY',
  agentZipCode: '10001',
  agentDateOfBirth: '1990-05-15',
  commissionPercentage: 10,
};

// =============================================================================
// TESTS
// =============================================================================

describe('generateOnboardingContract', () => {
  it('returns a non-empty PDF buffer', async () => {
    const result = await generateOnboardingContract(validInput);
    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    expect(result.pdfBuffer.length).toBeGreaterThan(0);
  });

  it('returns a base64-encoded string', async () => {
    const result = await generateOnboardingContract(validInput);
    expect(typeof result.pdfBase64).toBe('string');
    expect(result.pdfBase64.length).toBeGreaterThan(0);
  });

  it('returns a descriptive filename', async () => {
    const result = await generateOnboardingContract(validInput);
    expect(result.fileName).toMatch(/Commission_Contract/);
    expect(result.fileName).toMatch(/\.pdf$/);
  });

  it('handles different commission percentages', async () => {
    const result = await generateOnboardingContract({
      ...validInput,
      commissionPercentage: 15,
    });
    expect(result.pdfBuffer.length).toBeGreaterThan(0);
  });
});
