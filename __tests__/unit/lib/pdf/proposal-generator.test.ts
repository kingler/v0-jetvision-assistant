/**
 * Proposal Generator Tests
 *
 * Tests for PDF proposal generation functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateProposal,
  prepareProposalData,
  type GenerateProposalInput,
} from '@/lib/pdf/proposal-generator';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

// =============================================================================
// TEST DATA
// =============================================================================

const mockFlight1: RFQFlight = {
  id: 'flight-001',
  quoteId: 'quote-abc123',
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
  },
  arrivalAirport: {
    icao: 'KVNY',
    name: 'Van Nuys Airport',
    city: 'Van Nuys, CA',
  },
  departureDate: '2025-01-15',
  departureTime: '09:00',
  flightDuration: '5h 30m',
  aircraftType: 'Heavy Jet',
  aircraftModel: 'Gulfstream G650',
  tailNumber: 'N650EJ',
  yearOfManufacture: 2022,
  passengerCapacity: 16,
  tailPhotoUrl: 'https://example.com/g650.jpg',
  operatorName: 'Executive Jet Management',
  operatorRating: 4.8,
  operatorEmail: 'ops@executivejets.com',
  totalPrice: 45000,
  currency: 'USD',
  priceBreakdown: {
    basePrice: 40000,
    taxes: 3000,
    fees: 2000,
  },
  validUntil: '2025-01-10',
  amenities: {
    wifi: true,
    pets: true,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: true,
  },
  rfqStatus: 'quoted',
  lastUpdated: '2025-01-05T10:30:00Z',
  responseTimeMinutes: 45,
  isSelected: true,
};

const mockFlight2: RFQFlight = {
  id: 'flight-002',
  quoteId: 'quote-def456',
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
  },
  arrivalAirport: {
    icao: 'KVNY',
    name: 'Van Nuys Airport',
    city: 'Van Nuys, CA',
  },
  departureDate: '2025-01-15',
  departureTime: '10:00',
  flightDuration: '5h 15m',
  aircraftType: 'Midsize Jet',
  aircraftModel: 'Citation XLS+',
  tailNumber: 'N300AA',
  yearOfManufacture: 2021,
  passengerCapacity: 9,
  operatorName: 'NetJets',
  operatorRating: 4.9,
  operatorEmail: 'sales@netjets.com',
  totalPrice: 35000,
  currency: 'USD',
  priceBreakdown: {
    basePrice: 30000,
    taxes: 2500,
    fees: 2500,
  },
  validUntil: '2025-01-12',
  amenities: {
    wifi: true,
    pets: false,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: false,
  },
  rfqStatus: 'quoted',
  lastUpdated: '2025-01-05T11:00:00Z',
  responseTimeMinutes: 30,
  isSelected: true,
};

const mockCustomer = {
  name: 'John Smith',
  email: 'john.smith@example.com',
  company: 'Acme Corporation',
  phone: '+1 (555) 123-4567',
};

const mockTripDetails = {
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
  },
  arrivalAirport: {
    icao: 'KVNY',
    name: 'Van Nuys Airport',
    city: 'Van Nuys, CA',
  },
  departureDate: '2025-01-15',
  departureTime: '09:00',
  passengers: 6,
  tripId: 'atrip-64956151',
};

const validInput: GenerateProposalInput = {
  customer: mockCustomer,
  tripDetails: mockTripDetails,
  selectedFlights: [mockFlight1],
};

// =============================================================================
// TESTS
// =============================================================================

describe('prepareProposalData', () => {
  it('should generate proposal data with correct structure', () => {
    const data = prepareProposalData(validInput);

    expect(data).toHaveProperty('proposalId');
    expect(data).toHaveProperty('generatedAt');
    expect(data).toHaveProperty('customer');
    expect(data).toHaveProperty('tripDetails');
    expect(data).toHaveProperty('selectedFlights');
    expect(data).toHaveProperty('pricing');
    expect(data).toHaveProperty('quoteValidUntil');
  });

  it('should generate unique proposal IDs', () => {
    const data1 = prepareProposalData(validInput);
    const data2 = prepareProposalData(validInput);

    expect(data1.proposalId).not.toBe(data2.proposalId);
  });

  it('should include customer information', () => {
    const data = prepareProposalData(validInput);

    expect(data.customer.name).toBe('John Smith');
    expect(data.customer.email).toBe('john.smith@example.com');
    expect(data.customer.company).toBe('Acme Corporation');
    expect(data.customer.phone).toBe('+1 (555) 123-4567');
  });

  it('should include trip details', () => {
    const data = prepareProposalData(validInput);

    expect(data.tripDetails.departureAirport.icao).toBe('KTEB');
    expect(data.tripDetails.arrivalAirport.icao).toBe('KVNY');
    expect(data.tripDetails.departureDate).toBe('2025-01-15');
    expect(data.tripDetails.passengers).toBe(6);
    expect(data.tripDetails.tripId).toBe('atrip-64956151');
  });

  it('should include selected flights', () => {
    const data = prepareProposalData(validInput);

    expect(data.selectedFlights).toHaveLength(1);
    expect(data.selectedFlights[0].id).toBe('flight-001');
  });

  describe('Pricing Calculation', () => {
    it('should calculate subtotal from base prices', () => {
      const data = prepareProposalData(validInput);

      // Base totalPrice: $40,000
      expect(data.pricing.subtotal).toBe(40000);
    });

    it('should calculate Jetvision fee at 10% by default', () => {
      const data = prepareProposalData(validInput);

      // 10% of $40,000 = $4,000
      expect(data.pricing.jetvisionFee).toBe(4000);
    });

    it('should calculate taxes and fees', () => {
      const data = prepareProposalData(validInput);

      // Taxes: $3,000 + Fees: $2,000 = $5,000
      expect(data.pricing.taxes).toBe(5000);
    });

    it('should calculate total correctly', () => {
      const data = prepareProposalData(validInput);

      // Subtotal ($40,000) + Jetvision Fee ($4,000) + Taxes ($5,000) = $49,000
      expect(data.pricing.total).toBe(49000);
    });

    it('should use custom Jetvision fee percentage', () => {
      const input: GenerateProposalInput = {
        ...validInput,
        jetvisionFeePercentage: 15,
      };
      const data = prepareProposalData(input);

      // 15% of $40,000 = $6,000
      expect(data.pricing.jetvisionFee).toBe(6000);
    });

    it('should aggregate pricing for multiple flights', () => {
      const input: GenerateProposalInput = {
        ...validInput,
        selectedFlights: [mockFlight1, mockFlight2],
      };
      const data = prepareProposalData(input);

      // Base prices: $40,000 + $30,000 = $70,000
      expect(data.pricing.subtotal).toBe(70000);

      // Jetvision fee: 10% of $70,000 = $7,000
      expect(data.pricing.jetvisionFee).toBe(7000);

      // Taxes: ($3,000 + $2,000) + ($2,500 + $2,500) = $10,000
      expect(data.pricing.taxes).toBe(10000);

      // Total: $70,000 + $7,000 + $10,000 = $87,000
      expect(data.pricing.total).toBe(87000);
    });

    it('should use USD as default currency', () => {
      const data = prepareProposalData(validInput);

      expect(data.pricing.currency).toBe('USD');
    });

    it('should mark up flight totalPrice for client-facing display (single flight)', () => {
      // mockFlight1: basePrice=$40,000, taxes=$3,000, fees=$2,000
      // subtotal = $40,000, fee 10% = $4,000, taxes = $5,000, total = $49,000
      // Client price per flight = basePrice * (1 + fee%) + taxes + fees
      // = 40000 * 1.10 + 5000 = $49,000
      const data = prepareProposalData(validInput);

      expect(data.selectedFlights[0].totalPrice).toBe(49000);
    });

    it('should mark up flight totalPrice proportionally for multiple flights', () => {
      const input: GenerateProposalInput = {
        ...validInput,
        selectedFlights: [mockFlight1, mockFlight2],
      };
      const data = prepareProposalData(input);

      // mockFlight1: 40000 * 1.10 + 3000 + 2000 = $49,000
      expect(data.selectedFlights[0].totalPrice).toBe(49000);

      // mockFlight2: 30000 * 1.10 + 2500 + 2500 = $38,000
      expect(data.selectedFlights[1].totalPrice).toBe(38000);

      // Sum of display prices should equal total
      const displaySum = data.selectedFlights.reduce((s, f) => s + f.totalPrice, 0);
      expect(displaySum).toBe(data.pricing.total);
    });

    it('should mark up flight totalPrice for flights without breakdown', () => {
      const flightNoBreakdown: RFQFlight = {
        ...mockFlight1,
        totalPrice: 45000,
        priceBreakdown: undefined,
      };
      const input: GenerateProposalInput = {
        ...validInput,
        selectedFlights: [flightNoBreakdown],
      };
      const data = prepareProposalData(input);

      // No breakdown: subtotal = totalPrice = $45,000
      // fee 10% = $4,500, taxes = $0, total = $49,500
      // Client price = 45000 * 1.10 = $49,500
      expect(data.selectedFlights[0].totalPrice).toBe(49500);
    });

    it('should mark up flight totalPrice with custom fee percentage', () => {
      const input: GenerateProposalInput = {
        ...validInput,
        jetvisionFeePercentage: 15,
      };
      const data = prepareProposalData(input);

      // mockFlight1: basePrice=$40,000, fee 15% = $6,000, taxes = $5,000
      // Client price = 40000 * 1.15 + 5000 = $51,000
      expect(data.selectedFlights[0].totalPrice).toBe(51000);
    });
  });

  describe('Quote Validity', () => {
    // Fixed system time for deterministic date calculations
    const FIXED_SYSTEM_TIME = new Date('2025-01-01T00:00:00Z');

    beforeEach(() => {
      // Mock system time to ensure deterministic date calculations
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_SYSTEM_TIME);
    });

    afterEach(() => {
      // Restore real timers after each test to avoid affecting other tests
      vi.useRealTimers();
    });

    it('should use the soonest validity date from flights', () => {
      const input: GenerateProposalInput = {
        ...validInput,
        selectedFlights: [mockFlight1, mockFlight2],
      };
      const data = prepareProposalData(input);

      // mockFlight1 valid until 2025-01-10 (sooner)
      // mockFlight2 valid until 2025-01-12
      expect(data.quoteValidUntil).toBe('2025-01-10');
    });

    it('should default to 7 days if no validity dates', () => {
      const flightNoValidity: RFQFlight = {
        ...mockFlight1,
        validUntil: undefined,
      };
      const input: GenerateProposalInput = {
        ...validInput,
        selectedFlights: [flightNoValidity],
      };
      const data = prepareProposalData(input);

      // Compute expected date from fixed system time (2025-01-01 + 7 days = 2025-01-08)
      const expectedDate = new Date(FIXED_SYSTEM_TIME);
      expectedDate.setDate(expectedDate.getDate() + 7);
      const expected = expectedDate.toISOString().split('T')[0];

      expect(data.quoteValidUntil).toBe(expected);
    });
  });
});

describe('generateProposal', () => {
  it('should generate PDF buffer', async () => {
    const result = await generateProposal(validInput);

    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    expect(result.pdfBuffer.length).toBeGreaterThan(0);
  });

  it('should generate base64 string', async () => {
    const result = await generateProposal(validInput);

    expect(typeof result.pdfBase64).toBe('string');
    expect(result.pdfBase64.length).toBeGreaterThan(0);
    // Verify it's valid base64
    expect(() => Buffer.from(result.pdfBase64, 'base64')).not.toThrow();
  });

  it('should generate appropriate filename', async () => {
    const result = await generateProposal(validInput);

    expect(result.fileName).toContain('Jetvision_Proposal');
    expect(result.fileName).toContain('KTEB');
    expect(result.fileName).toContain('KVNY');
    expect(result.fileName).toContain('20250115');
    expect(result.fileName.endsWith('.pdf')).toBe(true);
  });

  it('should include proposal ID in result', async () => {
    const result = await generateProposal(validInput);

    expect(result.proposalId).toMatch(/^JV-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it('should include timestamp in result', async () => {
    const before = new Date().toISOString();
    const result = await generateProposal(validInput);
    const after = new Date().toISOString();

    expect(result.generatedAt >= before).toBe(true);
    expect(result.generatedAt <= after).toBe(true);
  });

  it('should include pricing in result', async () => {
    const result = await generateProposal(validInput);

    expect(result.pricing).toHaveProperty('subtotal');
    expect(result.pricing).toHaveProperty('jetvisionFee');
    expect(result.pricing).toHaveProperty('taxes');
    expect(result.pricing).toHaveProperty('total');
    expect(result.pricing).toHaveProperty('currency');
  });

  describe('Validation', () => {
    it('should throw error if no flights selected', async () => {
      const input: GenerateProposalInput = {
        ...validInput,
        selectedFlights: [],
      };

      await expect(generateProposal(input)).rejects.toThrow(
        'At least one flight must be selected'
      );
    });

    it('should throw error if customer name missing', async () => {
      const input: GenerateProposalInput = {
        ...validInput,
        customer: { ...mockCustomer, name: '' },
      };

      await expect(generateProposal(input)).rejects.toThrow(
        'Customer name is required'
      );
    });

    it('should throw error if customer email missing', async () => {
      const input: GenerateProposalInput = {
        ...validInput,
        customer: { ...mockCustomer, email: '' },
      };

      await expect(generateProposal(input)).rejects.toThrow(
        'Customer email is required'
      );
    });
  });

  it('should handle multiple flights', async () => {
    const input: GenerateProposalInput = {
      ...validInput,
      selectedFlights: [mockFlight1, mockFlight2],
    };

    const result = await generateProposal(input);

    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    expect(result.pricing.total).toBe(87000); // Both flights
  });

  it('should handle flights without price breakdown', async () => {
    const flightNoBreakdown: RFQFlight = {
      ...mockFlight1,
      priceBreakdown: undefined,
    };
    const input: GenerateProposalInput = {
      ...validInput,
      selectedFlights: [flightNoBreakdown],
    };

    const result = await generateProposal(input);

    // Should use total price as subtotal when no breakdown
    expect(result.pricing.subtotal).toBe(45000);
  });
});

describe('Aircraft Image Resolution', () => {
  it('should preserve tailPhotoUrl through proposal data preparation', () => {
    const input: GenerateProposalInput = {
      ...validInput,
      selectedFlights: [mockFlight1],
    };
    const data = prepareProposalData(input);
    expect(data.selectedFlights[0].tailPhotoUrl).toBe('https://example.com/g650.jpg');
  });

  it('should preserve tailPhotoUrl for flights without one', () => {
    const flightNoPhoto: RFQFlight = {
      ...mockFlight1,
      tailPhotoUrl: undefined,
    };
    const input: GenerateProposalInput = {
      ...validInput,
      selectedFlights: [flightNoPhoto],
    };
    const data = prepareProposalData(input);
    expect(data.selectedFlights[0].tailPhotoUrl).toBeUndefined();
  });
});
