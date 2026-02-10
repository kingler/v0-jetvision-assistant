/**
 * Onboarding Form Validation Schemas
 *
 * Zod validation schemas for the ISO agent onboarding flow.
 * Used by both the frontend form and API route validation.
 *
 * @see app/onboarding/page.tsx
 * @see app/api/onboarding/register/route.ts
 */

import { z } from 'zod';

// =============================================================================
// ONBOARDING FORM SCHEMA
// =============================================================================

export const onboardingFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or less'),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine(
      (dob) => {
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return false;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= 18;
      },
      { message: 'Must be at least 18 years old' }
    ),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+?[\d\s\-()]{10,15}$/, 'Invalid phone number format'),
  addressLine1: z
    .string()
    .min(1, 'Address is required')
    .max(200, 'Address must be 200 characters or less'),
  addressLine2: z
    .string()
    .max(200, 'Address line 2 must be 200 characters or less')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be 100 characters or less'),
  state: z
    .string()
    .min(1, 'State is required')
    .max(100, 'State must be 100 characters or less'),
  zipCode: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code (e.g., 12345 or 12345-6789)'),
  acknowledgeCommissionTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the commission terms' }),
  }),
});

export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

// =============================================================================
// CONTRACT SIGNATURE SCHEMA
// =============================================================================

export const contractSignatureSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  signedName: z
    .string()
    .min(2, 'Full legal name is required')
    .max(200, 'Name must be 200 characters or less'),
  acknowledgeSignature: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the signature' }),
  }),
});

export type ContractSignatureData = z.infer<typeof contractSignatureSchema>;

// =============================================================================
// ONBOARDING STATUS TYPE
// =============================================================================

export const ONBOARDING_STATUSES = [
  'pending',
  'profile_complete',
  'contract_sent',
  'contract_signed',
  'completed',
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];
