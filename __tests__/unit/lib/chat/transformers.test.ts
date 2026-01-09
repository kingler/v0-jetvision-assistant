/**
 * Unit tests for RFQ Transformer functions
 */

import { describe, it, expect } from 'vitest';
import {
  extractRouteParts,
  extractPrice,
  extractRFQStatus,
  extractPriceBreakdown,
  convertQuoteToRFQFlight,
  convertRfqToRFQFlight,
  mergeQuoteDetailsIntoFlights,
  convertQuotesToRFQFlights,
} from '@/lib/chat/transformers/rfq-transformer';
import { RFQStatus } from '@/lib/chat/constants';
import type { Quote, RFQItem, RFQFlight } from '@/lib/chat/types';

describe('extractRouteParts', () => {
  it('should extract route parts from valid route string', () => {
    const result = extractRouteParts('KTEB → KVNY');
    expect(result).toEqual(['KTEB', 'KVNY']);
  });

  it('should return N/A for missing route', () => {
    const result = extractRouteParts(undefined);
    expect(result).toEqual(['N/A', 'N/A']);
  });

  it('should return N/A for empty route', () => {
    const result = extractRouteParts('');
    expect(result).toEqual(['N/A', 'N/A']);
  });

  it('should handle partial route', () => {
    const result = extractRouteParts('KTEB → ');
    expect(result[0]).toBe('KTEB');
    expect(result[1]).toBe('N/A');
  });
});

describe('extractPrice', () => {
  it('should extract price from sellerPrice', () => {
    const quote: Quote = {
      sellerPrice: { price: 50000, currency: 'USD' },
    };
    const result = extractPrice(quote);
    expect(result).toEqual({ price: 50000, currency: 'USD' });
  });

  it('should fallback to pricing.total', () => {
    const quote: Quote = {
      pricing: { total: 45000, currency: 'EUR' },
    };
    const result = extractPrice(quote);
    expect(result).toEqual({ price: 45000, currency: 'EUR' });
  });

  it('should fallback to pricing.amount', () => {
    const quote: Quote = {
      pricing: { amount: 40000, currency: 'GBP' },
    };
    const result = extractPrice(quote);
    expect(result).toEqual({ price: 40000, currency: 'GBP' });
  });

  it('should fallback to total_price', () => {
    const quote: Quote = {
      total_price: 35000,
      currency: 'USD',
    };
    const result = extractPrice(quote);
    expect(result).toEqual({ price: 35000, currency: 'USD' });
  });

  it('should fallback to totalPrice.amount', () => {
    const quote: Quote = {
      totalPrice: { amount: 30000, currency: 'CHF' },
    };
    const result = extractPrice(quote);
    expect(result).toEqual({ price: 30000, currency: 'CHF' });
  });

  it('should return 0 for quote without price', () => {
    const quote: Quote = {};
    const result = extractPrice(quote);
    expect(result).toEqual({ price: 0, currency: 'USD' });
  });
});

describe('extractRFQStatus', () => {
  it('should return QUOTED for Accepted sourcingDisplayStatus', () => {
    const quote: Quote = { sourcingDisplayStatus: 'Accepted' };
    expect(extractRFQStatus(quote)).toBe(RFQStatus.QUOTED);
  });

  it('should return DECLINED for Declined sourcingDisplayStatus', () => {
    const quote: Quote = { sourcingDisplayStatus: 'Declined' };
    expect(extractRFQStatus(quote)).toBe(RFQStatus.DECLINED);
  });

  it('should return QUOTED for quoted status', () => {
    const quote: Quote = { status: 'quoted' };
    expect(extractRFQStatus(quote)).toBe(RFQStatus.QUOTED);
  });

  it('should return SENT for pending status', () => {
    const quote: Quote = { status: 'pending' };
    expect(extractRFQStatus(quote)).toBe(RFQStatus.SENT);
  });

  it('should return EXPIRED for expired status', () => {
    const quote: Quote = { status: 'expired' };
    expect(extractRFQStatus(quote)).toBe(RFQStatus.EXPIRED);
  });

  it('should return UNANSWERED for unknown status', () => {
    const quote: Quote = {};
    expect(extractRFQStatus(quote)).toBe(RFQStatus.UNANSWERED);
  });
});

describe('extractPriceBreakdown', () => {
  it('should extract complete price breakdown', () => {
    const quote: Quote = {
      pricing: {
        total: 50000,
        base: 40000,
        fuel: 5000,
        taxes: 3000,
        fees: 2000,
      },
    };
    const result = extractPriceBreakdown(quote);
    expect(result).toEqual({
      basePrice: 40000,
      fuelSurcharge: 5000,
      taxes: 3000,
      fees: 2000,
    });
  });

  it('should return undefined for quote without pricing', () => {
    const quote: Quote = {};
    expect(extractPriceBreakdown(quote)).toBeUndefined();
  });

  it('should return undefined for empty pricing', () => {
    const quote: Quote = { pricing: {} };
    expect(extractPriceBreakdown(quote)).toBeUndefined();
  });
});

describe('convertQuoteToRFQFlight', () => {
  it('should convert quote to RFQFlight', () => {
    const quote: Quote = {
      quote_id: 'q123',
      operator_name: 'Test Operator',
      aircraft_type: 'Gulfstream G650',
      tail_number: 'N123AB',
      passenger_capacity: 14,
      sellerPrice: { price: 75000, currency: 'USD' },
      status: 'quoted',
    };

    const result = convertQuoteToRFQFlight(quote, ['KTEB', 'KVNY'], '2024-01-15');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('q123');
    expect(result!.operatorName).toBe('Test Operator');
    expect(result!.aircraftType).toBe('Gulfstream G650');
    expect(result!.tailNumber).toBe('N123AB');
    expect(result!.passengerCapacity).toBe(14);
    expect(result!.totalPrice).toBe(75000);
    expect(result!.currency).toBe('USD');
    expect(result!.rfqStatus).toBe(RFQStatus.QUOTED);
    expect(result!.departureAirport.icao).toBe('KTEB');
    expect(result!.arrivalAirport.icao).toBe('KVNY');
    expect(result!.departureDate).toBe('2024-01-15');
  });

  it('should handle missing fields gracefully', () => {
    const quote: Quote = {};

    const result = convertQuoteToRFQFlight(quote, ['N/A', 'N/A']);

    expect(result).not.toBeNull();
    expect(result!.operatorName).toBe('Unknown Operator');
    expect(result!.aircraftType).toBe('Unknown Aircraft');
    expect(result!.totalPrice).toBe(0);
    expect(result!.rfqStatus).toBe(RFQStatus.UNANSWERED);
  });

  it('should upgrade status to QUOTED when price exists', () => {
    const quote: Quote = {
      sellerPrice: { price: 50000, currency: 'USD' },
      // No status field - should be UNANSWERED, but upgraded to QUOTED
    };

    const result = convertQuoteToRFQFlight(quote, ['KTEB', 'KVNY']);

    expect(result!.rfqStatus).toBe(RFQStatus.QUOTED);
  });
});

describe('convertRfqToRFQFlight', () => {
  it('should convert RFQ to placeholder RFQFlight', () => {
    const rfq: RFQItem = {
      rfq_id: 'rfq123',
      status: 'sent',
    };

    const result = convertRfqToRFQFlight(rfq, ['KJFK', 'KLAX'], '2024-02-20');

    expect(result.id).toBe('rfq123');
    expect(result.operatorName).toBe('Awaiting quotes');
    expect(result.aircraftType).toBe('Aircraft TBD');
    expect(result.totalPrice).toBe(0);
    expect(result.rfqStatus).toBe(RFQStatus.SENT);
    expect(result.departureAirport.icao).toBe('KJFK');
    expect(result.arrivalAirport.icao).toBe('KLAX');
  });
});

describe('mergeQuoteDetailsIntoFlights', () => {
  it('should merge quote details into flights', () => {
    const flights: RFQFlight[] = [
      {
        id: 'f1',
        quoteId: 'q1',
        departureAirport: { icao: 'KTEB' },
        arrivalAirport: { icao: 'KVNY' },
        departureDate: '2024-01-15',
        flightDuration: 'TBD',
        aircraftType: 'TBD',
        aircraftModel: 'TBD',
        passengerCapacity: 0,
        operatorName: 'Operator 1',
        totalPrice: 0,
        currency: 'USD',
        amenities: {
          wifi: false,
          pets: false,
          smoking: false,
          galley: false,
          lavatory: false,
          medical: false,
        },
        rfqStatus: RFQStatus.UNANSWERED,
        lastUpdated: new Date().toISOString(),
        isSelected: false,
        hasMedical: false,
        hasPackage: false,
      },
    ];

    const quoteDetails: Record<string, Quote> = {
      q1: {
        sellerPrice: { price: 60000, currency: 'USD' },
        status: 'quoted',
        sellerMessage: 'Looking forward to serving you!',
      },
    };

    const result = mergeQuoteDetailsIntoFlights(flights, quoteDetails);

    expect(result[0].totalPrice).toBe(60000);
    expect(result[0].rfqStatus).toBe(RFQStatus.QUOTED);
    expect(result[0].sellerMessage).toBe('Looking forward to serving you!');
  });

  it('should fix status when price exists but status is unanswered', () => {
    const flights: RFQFlight[] = [
      {
        id: 'f1',
        quoteId: 'q1',
        departureAirport: { icao: 'KTEB' },
        arrivalAirport: { icao: 'KVNY' },
        departureDate: '2024-01-15',
        flightDuration: 'TBD',
        aircraftType: 'TBD',
        aircraftModel: 'TBD',
        passengerCapacity: 0,
        operatorName: 'Operator 1',
        totalPrice: 50000, // Has price
        currency: 'USD',
        amenities: {
          wifi: false,
          pets: false,
          smoking: false,
          galley: false,
          lavatory: false,
          medical: false,
        },
        rfqStatus: RFQStatus.UNANSWERED, // Wrong status
        lastUpdated: new Date().toISOString(),
        isSelected: false,
        hasMedical: false,
        hasPackage: false,
      },
    ];

    const result = mergeQuoteDetailsIntoFlights(flights, {});

    expect(result[0].rfqStatus).toBe(RFQStatus.QUOTED);
  });
});

describe('convertQuotesToRFQFlights', () => {
  it('should convert array of quotes to RFQFlights', () => {
    const quotes: Quote[] = [
      {
        quote_id: 'q1',
        operator_name: 'Operator A',
        sellerPrice: { price: 50000, currency: 'USD' },
      },
      {
        quote_id: 'q2',
        operator_name: 'Operator B',
        sellerPrice: { price: 55000, currency: 'USD' },
      },
    ];

    const result = convertQuotesToRFQFlights(quotes, ['KTEB', 'KVNY']);

    expect(result).toHaveLength(2);
    expect(result[0].operatorName).toBe('Operator A');
    expect(result[1].operatorName).toBe('Operator B');
  });

  it('should filter out invalid quotes', () => {
    // This is an edge case where convertQuoteToRFQFlight might return null
    // Currently it always returns a flight, but the filter is there for safety
    const quotes: Quote[] = [
      {
        quote_id: 'q1',
        operator_name: 'Valid Operator',
      },
    ];

    const result = convertQuotesToRFQFlights(quotes, ['KTEB', 'KVNY']);

    expect(result).toHaveLength(1);
  });
});
