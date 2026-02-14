/**
 * Onboarding Form Schema Validation Tests
 *
 * Tests for Zod validation schemas used in the ISO agent onboarding flow.
 * Covers the onboardingFormSchema and contractSignatureSchema.
 *
 * @see lib/validations/onboarding.ts
 */

import { describe, it, expect } from 'vitest';
import {
  onboardingFormSchema,
  contractSignatureSchema,
  ONBOARDING_STATUSES,
  type OnboardingFormData,
  type OnboardingStatus,
} from '@/lib/validations/onboarding';

// =============================================================================
// TEST DATA
// =============================================================================

/**
 * A fully valid onboarding form submission.
 * All tests that need valid data should spread from this object.
 */
const validFormData: OnboardingFormData = {
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-05-15',
  phone: '(555) 123-4567',
  addressLine1: '123 Main St',
  addressLine2: 'Suite 200',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  acknowledgeCommissionTerms: true,
};

// =============================================================================
// onboardingFormSchema
// =============================================================================

describe('onboardingFormSchema', () => {
  it('should accept fully valid form data', () => {
    const result = onboardingFormSchema.safeParse(validFormData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Jane');
      expect(result.data.lastName).toBe('Doe');
      expect(result.data.addressLine2).toBe('Suite 200');
    }
  });

  it('should accept data with optional addressLine2 omitted', () => {
    const { addressLine2, ...dataWithoutLine2 } = validFormData;
    const result = onboardingFormSchema.safeParse(dataWithoutLine2);
    expect(result.success).toBe(true);
  });

  it('should accept data with addressLine2 as empty string', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      addressLine2: '',
    });
    expect(result.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // firstName
  // ---------------------------------------------------------------------------

  it('should fail when firstName is empty', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      firstName: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('firstName'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('First name is required');
    }
  });

  it('should fail when firstName exceeds 100 characters', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      firstName: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('firstName'));
      expect(issue).toBeDefined();
    }
  });

  // ---------------------------------------------------------------------------
  // lastName
  // ---------------------------------------------------------------------------

  it('should fail when lastName is empty', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      lastName: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('lastName'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('Last name is required');
    }
  });

  // ---------------------------------------------------------------------------
  // dateOfBirth - age validation
  // ---------------------------------------------------------------------------

  it('should fail when age is under 18', () => {
    // Build a date that makes the person 17 years old today
    const today = new Date();
    const seventeenYearsAgo = new Date(
      today.getFullYear() - 17,
      today.getMonth(),
      today.getDate()
    );
    const dob = seventeenYearsAgo.toISOString().split('T')[0];

    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      dateOfBirth: dob,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('dateOfBirth'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('Must be at least 18 years old');
    }
  });

  it('should accept a person who is exactly 18 today', () => {
    const today = new Date();
    const eighteenYearsAgo = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
    const dob = eighteenYearsAgo.toISOString().split('T')[0];

    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      dateOfBirth: dob,
    });
    expect(result.success).toBe(true);
  });

  it('should fail when dateOfBirth is not a valid date string', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      dateOfBirth: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('should fail when dateOfBirth is empty', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      dateOfBirth: '',
    });
    expect(result.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // phone
  // ---------------------------------------------------------------------------

  it('should fail when phone is in an invalid format', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      phone: 'abc-not-a-phone',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('phone'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('Invalid phone number format');
    }
  });

  it('should fail when phone is too short', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      phone: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid domestic phone formats', () => {
    const validPhones = [
      '(555) 123-4567',
      '555-123-4567',
      '5551234567',
      '+15551234567',
    ];
    for (const phone of validPhones) {
      const result = onboardingFormSchema.safeParse({
        ...validFormData,
        phone,
      });
      expect(result.success).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // zipCode
  // ---------------------------------------------------------------------------

  it('should fail when zipCode is in an invalid format', () => {
    const invalidZips = ['1234', 'ABCDE', '123456', '1234-56789'];
    for (const zipCode of invalidZips) {
      const result = onboardingFormSchema.safeParse({
        ...validFormData,
        zipCode,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('zipCode'));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain('Invalid ZIP code');
      }
    }
  });

  it('should accept 5-digit ZIP codes', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      zipCode: '90210',
    });
    expect(result.success).toBe(true);
  });

  it('should accept ZIP+4 format', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      zipCode: '90210-1234',
    });
    expect(result.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // acknowledgeCommissionTerms
  // ---------------------------------------------------------------------------

  it('should fail when acknowledgeCommissionTerms is false', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      acknowledgeCommissionTerms: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes('acknowledgeCommissionTerms')
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('acknowledge the commission terms');
    }
  });

  // ---------------------------------------------------------------------------
  // addressLine1 / city / state
  // ---------------------------------------------------------------------------

  it('should fail when addressLine1 is empty', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      addressLine1: '',
    });
    expect(result.success).toBe(false);
  });

  it('should fail when city is empty', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      city: '',
    });
    expect(result.success).toBe(false);
  });

  it('should fail when state is empty', () => {
    const result = onboardingFormSchema.safeParse({
      ...validFormData,
      state: '',
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// contractSignatureSchema
// =============================================================================

describe('contractSignatureSchema', () => {
  it('should accept valid signature data', () => {
    const result = contractSignatureSchema.safeParse({
      token: 'abc123def456',
      signedName: 'Jane Doe',
      acknowledgeSignature: true,
    });
    expect(result.success).toBe(true);
  });

  it('should fail when token is empty', () => {
    const result = contractSignatureSchema.safeParse({
      token: '',
      signedName: 'Jane Doe',
      acknowledgeSignature: true,
    });
    expect(result.success).toBe(false);
  });

  it('should fail when signedName is too short', () => {
    const result = contractSignatureSchema.safeParse({
      token: 'abc123',
      signedName: 'J',
      acknowledgeSignature: true,
    });
    expect(result.success).toBe(false);
  });

  it('should fail when acknowledgeSignature is false', () => {
    const result = contractSignatureSchema.safeParse({
      token: 'abc123',
      signedName: 'Jane Doe',
      acknowledgeSignature: false,
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// ONBOARDING_STATUSES
// =============================================================================

describe('ONBOARDING_STATUSES', () => {
  it('should contain all expected status values', () => {
    expect(ONBOARDING_STATUSES).toEqual([
      'pending',
      'profile_complete',
      'contract_sent',
      'contract_signed',
      'completed',
    ]);
  });
});
