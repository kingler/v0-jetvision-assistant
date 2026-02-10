/**
 * Onboarding Contract Generator Tests
 *
 * Tests for ISO Agent employment commission contract PDF generation.
 * Follows TDD: tests written first, then implementation.
 *
 * @see lib/pdf/onboarding-contract-generator.ts
 * @see lib/pdf/onboarding-contract-template.tsx
 */

import { describe, it, expect } from 'vitest';
import {
  generateOnboardingContract,
  type OnboardingContractInput,
  type OnboardingContractOutput,
} from '@/lib/pdf/onboarding-contract-generator';

// =============================================================================
// TEST DATA
// =============================================================================

const validInput: OnboardingContractInput = {
  agentName: 'Jane Doe',
  agentEmail: 'jane@example.com',
  agentAddress: '123 Main St, Apt 4B, New York, NY 10001, US',
  agentDOB: '1990-05-15',
  commissionPercentage: 10,
  effectiveDate: '2026-02-09',
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
    expect(result.fileName).toMatch(/commission-contract/);
    expect(result.fileName).toMatch(/\.pdf$/);
  });

  it('includes the date in the filename', async () => {
    const result = await generateOnboardingContract(validInput);
    expect(result.fileName).toContain('20260209');
  });

  it('handles different commission percentages', async () => {
    const result = await generateOnboardingContract({
      ...validInput,
      commissionPercentage: 15,
    });
    expect(result.pdfBuffer.length).toBeGreaterThan(0);
  });
});
