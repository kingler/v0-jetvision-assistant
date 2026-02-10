/**
 * Onboarding Form Validation Schemas
 * Zod schemas for multi-step ISO agent onboarding form
 */

import { z } from 'zod';
import { differenceInYears } from 'date-fns';

// Step 1: Personal Information Schema
export const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().refine(
    (dob) => {
      const age = differenceInYears(new Date(), new Date(dob));
      return age >= 18;
    },
    { message: 'You must be at least 18 years old' }
  ),
  phone: z.string().regex(
    /^\+?[\d\s\-()]{7,20}$/,
    'Enter a valid phone number'
  ),
});

// Step 2: Address Schema
export const addressSchema = z.object({
  streetAddress: z.string().min(1, 'Street address is required').max(200),
  addressLine2: z.string().max(200).optional().default(''),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  country: z.string().min(1).max(100).default('US'),
});

// Complete Onboarding Form Schema (all steps combined)
export const onboardingFormSchema = personalInfoSchema.merge(addressSchema);

export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;
