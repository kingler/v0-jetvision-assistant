/**
 * RFP Form Validation Schema Tests
 * Unit tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
  clientSelectionSchema,
  flightDetailsSchema,
  preferencesSchema,
  rfpFormSchema,
  type RFPFormData,
} from '@/lib/validations/rfp-form-schema'

describe('RFP Form Validation Schemas', () => {
  describe('clientSelectionSchema', () => {
    it('should validate valid client data', () => {
      const validData = {
        clientId: 'CL-12345',
        clientName: 'John Smith',
        clientEmail: 'john@example.com',
        clientPhone: '+1 (555) 123-4567',
        vipStatus: 'vip' as const,
      }

      const result = clientSelectionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require clientId and clientName', () => {
      const invalidData = {
        clientEmail: 'john@example.com',
      }

      const result = clientSelectionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2)
      }
    })

    it('should validate email format', () => {
      const invalidData = {
        clientId: 'CL-12345',
        clientName: 'John Smith',
        clientEmail: 'invalid-email',
      }

      const result = clientSelectionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const emailError = result.error.issues.find((issue) => issue.path.includes('clientEmail'))
        expect(emailError).toBeDefined()
        expect(emailError?.message).toContain('Invalid email')
      }
    })

    it('should accept valid VIP status values', () => {
      const statuses = ['standard', 'vip', 'ultra_vip'] as const

      statuses.forEach((status) => {
        const data = {
          clientId: 'CL-12345',
          clientName: 'John Smith',
          vipStatus: status,
        }
        const result = clientSelectionSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('flightDetailsSchema', () => {
    it('should validate valid flight details', () => {
      const validData = {
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-01'),
        departureTime: '09:00',
        returnDate: new Date('2025-12-05'),
        returnTime: '17:00',
        passengers: 4,
        aircraftType: 'midsize' as const,
      }

      const result = flightDetailsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require minimum flight details', () => {
      const invalidData = {
        departureAirport: 'KJFK',
        // Missing arrivalAirport, departureDate, passengers
      }

      const result = flightDetailsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate airport code minimum length', () => {
      const invalidData = {
        departureAirport: 'JF', // Too short
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-01'),
        passengers: 4,
      }

      const result = flightDetailsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const airportError = result.error.issues.find((issue) => issue.path.includes('departureAirport'))
        expect(airportError).toBeDefined()
      }
    })

    it('should validate passenger count range', () => {
      const zeroPassengers = {
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-01'),
        passengers: 0,
      }

      const result1 = flightDetailsSchema.safeParse(zeroPassengers)
      expect(result1.success).toBe(false)

      const tooManyPassengers = {
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-01'),
        passengers: 25,
      }

      const result2 = flightDetailsSchema.safeParse(tooManyPassengers)
      expect(result2.success).toBe(false)
    })

    it('should validate return date is after departure date', () => {
      const invalidData = {
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-05'),
        returnDate: new Date('2025-12-01'), // Before departure
        passengers: 4,
      }

      const result = flightDetailsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const dateError = result.error.issues.find((issue) => issue.path.includes('returnDate'))
        expect(dateError).toBeDefined()
        expect(dateError?.message).toContain('Return date must be after departure date')
      }
    })

    it('should allow same-day return', () => {
      const validData = {
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-01'),
        returnDate: new Date('2025-12-01'), // Same day
        passengers: 4,
      }

      const result = flightDetailsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept valid aircraft types', () => {
      const aircraftTypes = ['light_jet', 'midsize', 'super_midsize', 'heavy_jet', 'ultra_long_range', 'any'] as const

      aircraftTypes.forEach((type) => {
        const data = {
          departureAirport: 'KJFK',
          arrivalAirport: 'KLAX',
          departureDate: new Date('2025-12-01'),
          passengers: 4,
          aircraftType: type,
        }
        const result = flightDetailsSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('preferencesSchema', () => {
    it('should validate valid preferences', () => {
      const validData = {
        budgetMin: 50000,
        budgetMax: 100000,
        specialRequirements: 'Wheelchair accessible',
        cateringPreference: 'full' as const,
        groundTransport: true,
        flexibleDates: false,
      }

      const result = preferencesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should apply default values', () => {
      const minimalData = {}

      const result = preferencesSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect((result.data as any).cateringPreference).toBe('none')
        expect((result.data as any).groundTransport).toBe(false)
        expect((result.data as any).flexibleDates).toBe(false)
      }
    })

    it('should validate budget max is greater than min', () => {
      const invalidData = {
        budgetMin: 100000,
        budgetMax: 50000, // Less than min
      }

      const result = preferencesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const budgetError = result.error.issues.find((issue) => issue.path.includes('budgetMax'))
        expect(budgetError).toBeDefined()
        expect(budgetError?.message).toContain('Maximum budget must be greater than minimum budget')
      }
    })

    it('should allow equal budget min and max', () => {
      const validData = {
        budgetMin: 75000,
        budgetMax: 75000,
      }

      const result = preferencesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate special requirements length', () => {
      const tooLong = 'x'.repeat(1001)
      const invalidData = {
        specialRequirements: tooLong,
      }

      const result = preferencesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const lengthError = result.error.issues.find((issue) => issue.path.includes('specialRequirements'))
        expect(lengthError).toBeDefined()
        expect(lengthError?.message).toContain('Maximum 1000 characters')
      }
    })

    it('should accept valid catering preferences', () => {
      const preferences = ['none', 'light', 'full', 'custom'] as const

      preferences.forEach((pref) => {
        const data = {
          cateringPreference: pref,
        }
        const result = preferencesSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('rfpFormSchema (combined)', () => {
    it('should validate complete RFP form data', () => {
      const completeData: RFPFormData = {
        // Client
        clientId: 'CL-12345',
        clientName: 'John Smith',
        clientEmail: 'john@example.com',
        clientPhone: '+1 (555) 123-4567',
        vipStatus: 'vip',
        // Flight
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-01'),
        departureTime: '09:00',
        returnDate: new Date('2025-12-05'),
        returnTime: '17:00',
        passengers: 4,
        aircraftType: 'midsize',
        // Preferences
        budgetMin: 50000,
        budgetMax: 100000,
        specialRequirements: 'Wheelchair accessible',
        cateringPreference: 'full',
        groundTransport: true,
        flexibleDates: false,
      }

      const result = rfpFormSchema.safeParse(completeData)
      expect(result.success).toBe(true)
    })

    it('should validate minimal required data', () => {
      const minimalData = {
        clientId: 'CL-12345',
        clientName: 'John Smith',
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-01'),
        passengers: 1,
      }

      const result = rfpFormSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it('should fail with missing required fields', () => {
      const incompleteData = {
        clientName: 'John Smith',
        // Missing clientId, airports, date, passengers
      }

      const result = rfpFormSchema.safeParse(incompleteData)
      expect(result.success).toBe(false)
    })

    it('should validate all business rules together', () => {
      const invalidData = {
        clientId: 'CL-12345',
        clientName: 'John Smith',
        clientEmail: 'invalid-email', // Invalid email
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: new Date('2025-12-05'),
        returnDate: new Date('2025-12-01'), // Before departure
        passengers: 0, // Too few
        budgetMin: 100000,
        budgetMax: 50000, // Less than min
      }

      const result = rfpFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        // Should have at least one validation error
        expect(result.error.issues.length).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
