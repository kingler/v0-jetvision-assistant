import { describe, it, expect } from 'vitest';
import type { RFQFlight } from '@/components/avinode/rfq-flight-card';
import { normalizeRfqFlights } from '@/lib/avinode/rfq-transform';

describe('lib/avinode/rfq-transform', () => {
  const baseRfqData = {
    rfq_id: 'arfq-123',
    trip_id: 'atrip-123',
    route: {
      departure: {
        airport: { icao: 'KTEB', name: 'Teterboro', city: 'Teterboro' },
        date: '2025-01-01',
      },
      arrival: {
        airport: { icao: 'KVNY', name: 'Van Nuys', city: 'Van Nuys' },
      },
    },
    passengers: 6,
    deep_link: 'https://sandbox.avinode.com/marketplace/mvc/trips/selling/rfq?rfq=arfq-123',
  };

  it('maps quoted RFQ response into full RFQFlight data', () => {
    const rfqData = {
      ...baseRfqData,
      quotes: [
        {
          id: 'aquote-1',
          status: 'quoted',
          aircraft: {
            type: 'Gulfstream G650',
            model: 'G650',
            registration: 'N650JV',
            capacity: 12,
            year_built: 2018,
            amenities: ['WiFi', 'Pets'],
          },
          pricing: {
            total: 50000,
            currency: 'USD',
            base_price: 40000,
            fuel_surcharge: 5000,
            taxes: 3000,
            fees: 2000,
          },
          operator: { name: 'JetCo', rating: 4.9, email: 'ops@jetco.com' },
          schedule: { flightDuration: 180 },
          updated_at: '2025-01-02T00:00:00Z',
        },
      ],
    };

    const flights = normalizeRfqFlights({ rfqData });
    expect(flights).toHaveLength(1);

    const flight = flights[0] as RFQFlight;
    expect(flight.quoteId).toBe('aquote-1');
    expect(flight.departureAirport.icao).toBe('KTEB');
    expect(flight.arrivalAirport.icao).toBe('KVNY');
    expect(flight.departureDate).toBe('2025-01-01');
    expect(flight.passengerCapacity).toBe(12);
    expect(flight.totalPrice).toBe(50000);
    expect(flight.currency).toBe('USD');
    expect(flight.priceBreakdown).toEqual({
      basePrice: 40000,
      fuelSurcharge: 5000,
      taxes: 3000,
      fees: 2000,
    });
    expect(flight.amenities.wifi).toBe(true);
    expect(flight.amenities.pets).toBe(true);
    expect(flight.rfqStatus).toBe('quoted');
    expect(flight.avinodeDeepLink).toBe(baseRfqData.deep_link);
  });

  it('deduplicates quotes appearing in multiple response arrays', () => {
    const rfqData = {
      ...baseRfqData,
      quotes: [{ id: 'aquote-1', status: 'quoted' }],
      responses: [{ id: 'aquote-1', status: 'quoted' }],
    };

    const flights = normalizeRfqFlights({ rfqData });
    expect(flights).toHaveLength(1);
  });

  it('defaults pricing when quote is unanswered', () => {
    const rfqData = {
      ...baseRfqData,
      quotes: [
        {
          id: 'aquote-2',
          status: 'unanswered',
          aircraft: { type: 'Citation', model: 'Citation X', capacity: 8 },
          operator: { name: 'NoQuote Air' },
        },
      ],
    };

    const flights = normalizeRfqFlights({ rfqData });
    expect(flights).toHaveLength(1);
    expect(flights[0].rfqStatus).toBe('unanswered');
    expect(flights[0].totalPrice).toBe(0);
    expect(flights[0].currency).toBe('USD');
    expect(flights[0].flightDuration).toBe('0h 0m');
  });
});
