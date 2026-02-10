import { describe, it, expect } from 'vitest';
import {
  personalInfoSchema,
  addressSchema,
  onboardingFormSchema,
  type OnboardingFormData,
} from '@/lib/validations/onboarding-form-schema';

describe('onboardingFormSchema', () => {
  const validData = {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1990-05-15',
    phone: '+1 (555) 123-4567',
    streetAddress: '123 Main St',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
  };

  it('accepts valid complete data', () => {
    const result = onboardingFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts data without optional addressLine2', () => {
    const { addressLine2, ...required } = validData;
    const result = onboardingFormSchema.safeParse(required);
    expect(result.success).toBe(true);
  });

  it('rejects empty firstName', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty lastName', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, lastName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects age under 18', () => {
    // Use a date that's definitely less than 18 years ago
    const recentDate = new Date();
    recentDate.setFullYear(recentDate.getFullYear() - 10);
    const result = onboardingFormSchema.safeParse({
      ...validData,
      dateOfBirth: recentDate.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 18 years old', () => {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    const result = onboardingFormSchema.safeParse({
      ...validData,
      dateOfBirth: eighteenYearsAgo.toISOString().split('T')[0],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid phone', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, phone: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts phone with various formats', () => {
    const formats = ['+15551234567', '555-123-4567', '(555) 123-4567', '+1 555 123 4567'];
    for (const phone of formats) {
      const result = onboardingFormSchema.safeParse({ ...validData, phone });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid zip code', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, zipCode: 'ABCDE' });
    expect(result.success).toBe(false);
  });

  it('accepts 5-digit zip code', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, zipCode: '90210' });
    expect(result.success).toBe(true);
  });

  it('accepts ZIP+4 format', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, zipCode: '10001-1234' });
    expect(result.success).toBe(true);
  });

  it('rejects missing streetAddress', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, streetAddress: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing city', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, city: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing state', () => {
    const result = onboardingFormSchema.safeParse({ ...validData, state: '' });
    expect(result.success).toBe(false);
  });
});

describe('personalInfoSchema', () => {
  it('validates personal info independently', () => {
    const result = personalInfoSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-05-15',
      phone: '+15551234567',
    });
    expect(result.success).toBe(true);
  });
});

describe('addressSchema', () => {
  it('validates address independently', () => {
    const result = addressSchema.safeParse({
      streetAddress: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    });
    expect(result.success).toBe(true);
  });

  it('defaults country to US', () => {
    const result = addressSchema.safeParse({
      streetAddress: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('US');
    }
  });
});
