/**
 * RFP Form Validation Schemas
 * Zod schemas for multi-step RFP submission form
 */

import { z } from 'zod'

// Step 1: Client Selection Schema
export const clientSelectionSchema = z.object({
  clientId: z.string().min(1, 'Please select a client'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address').optional(),
  clientPhone: z.string().optional(),
  vipStatus: z.enum(['standard', 'vip', 'ultra_vip']).optional(),
})

// Step 2: Flight Details Base Schema (without refinements for shape access)
const flightDetailsBaseSchema = z.object({
  departureAirport: z.string().min(3, 'Please enter a valid airport code'),
  arrivalAirport: z.string().min(3, 'Please enter a valid airport code'),
  departureDate: z.date({
    required_error: 'Departure date is required',
  }),
  departureTime: z.string().optional(),
  returnDate: z.date().optional(),
  returnTime: z.string().optional(),
  passengers: z.number().min(1, 'At least 1 passenger required').max(20, 'Maximum 20 passengers'),
  aircraftType: z.enum(['light_jet', 'midsize', 'super_midsize', 'heavy_jet', 'ultra_long_range', 'any']).optional(),
})

// Step 2: Flight Details Schema with refinements
export const flightDetailsSchema = flightDetailsBaseSchema.refine(
  (data) => {
    // If return date is provided, it must be after departure date
    if (data.returnDate && data.departureDate) {
      return data.returnDate >= data.departureDate
    }
    return true
  },
  {
    message: 'Return date must be after departure date',
    path: ['returnDate'],
  }
)

// Step 3: Preferences & Requirements Base Schema (without refinements for shape access)
const preferencesBaseSchema = z.object({
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  specialRequirements: z.string().max(1000, 'Maximum 1000 characters').optional(),
  cateringPreference: z.enum(['none', 'light', 'full', 'custom']).default('none'),
  groundTransport: z.boolean().default(false),
  flexibleDates: z.boolean().default(false),
})

// Step 3: Preferences & Requirements Schema with refinements
export const preferencesSchema = preferencesBaseSchema.refine(
  (data) => {
    // If both budget values are provided, max must be greater than min
    if (data.budgetMin !== undefined && data.budgetMax !== undefined) {
      return data.budgetMax >= data.budgetMin
    }
    return true
  },
  {
    message: 'Maximum budget must be greater than minimum budget',
    path: ['budgetMax'],
  }
)

// Complete RFP Form Schema (all steps combined)
// Uses base schemas to access .shape property (refinements applied later)
export const rfpFormSchema = z.object({
  // Step 1
  ...clientSelectionSchema.shape,
  // Step 2
  ...flightDetailsBaseSchema.shape,
  // Step 3
  ...preferencesBaseSchema.shape,
})

export type ClientSelectionData = z.infer<typeof clientSelectionSchema>
export type FlightDetailsData = z.infer<typeof flightDetailsSchema>
export type PreferencesData = z.infer<typeof preferencesSchema>
export type RFPFormData = z.infer<typeof rfpFormSchema>

// Airport data type for autocomplete
export interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  country: string
}

// Client data type for autocomplete
export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  vipStatus?: 'standard' | 'vip' | 'ultra_vip'
  preferences?: {
    aircraftPreference?: string[]
    budget?: number
    amenities?: string[]
  }
}
