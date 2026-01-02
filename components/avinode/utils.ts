/**
 * Utility functions for Avinode workflow components
 */

import type { RFQFlight } from './rfq-flight-card';
import type { RFQFlight as AvinodeRFQFlight } from '@/lib/mcp/clients/avinode-client';

/**
 * Converts an RFQFlight from the component format to AvinodeRFQFlight format
 * for use in proposal generation and sending.
 *
 * Handles field mapping with proper fallbacks:
 * - Uses nullish coalescing (??) for numeric defaults like passengerCapacity
 * - Falls back aircraftModel to aircraftType if not provided
 * - Provides default amenities object if missing
 * - Sets lastUpdated to current ISO string if not provided
 *
 * @param flight - The RFQFlight to convert
 * @returns An AvinodeRFQFlight with all required fields populated
 */
export function convertToAvinodeRFQFlight(flight: RFQFlight): AvinodeRFQFlight {
  return {
    id: flight.id,
    quoteId: flight.quoteId || flight.id,
    departureAirport: flight.departureAirport,
    arrivalAirport: flight.arrivalAirport,
    departureDate: flight.departureDate,
    departureTime: flight.departureTime,
    flightDuration: flight.flightDuration || 'N/A',
    aircraftType: flight.aircraftType || 'Unknown',
    // Fall back aircraftModel to aircraftType if not provided
    aircraftModel: flight.aircraftModel || flight.aircraftType || 'Unknown',
    tailNumber: flight.tailNumber,
    yearOfManufacture: flight.yearOfManufacture,
    // Use nullish coalescing for numeric defaults
    passengerCapacity: flight.passengerCapacity ?? 0,
    operatorName: flight.operatorName,
    operatorRating: flight.operatorRating,
    totalPrice: flight.totalPrice,
    currency: flight.currency || 'USD',
    priceBreakdown: flight.priceBreakdown ? {
      base: flight.priceBreakdown.basePrice,
      taxes: flight.priceBreakdown.taxes,
      fees: flight.priceBreakdown.fees,
    } : undefined,
    validUntil: flight.validUntil,
    // Provide default amenities if missing
    amenities: flight.amenities || {
      wifi: false,
      pets: false,
      smoking: false,
      galley: false,
      lavatory: false,
      medical: false,
    },
    rfqStatus: flight.rfqStatus,
    // Provide default lastUpdated if missing
    lastUpdated: flight.lastUpdated || new Date().toISOString(),
    isSelected: true,
  };
}

