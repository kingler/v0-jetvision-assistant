/**
 * Mock Avinode Client
 *
 * Provides realistic mock data for development and testing.
 * Data structures match the real Avinode API (TripRequestSellerResponse webhooks)
 * and the Supabase database schema (quotes table).
 *
 * @see lib/types/avinode-webhooks.ts - Real Avinode webhook types
 * @see lib/mock-data/avinode-webhook-payloads.ts - Realistic mock payloads
 * @see lib/types/supabase.ts - Database Quote schema
 */

import type { TripRequestSellerResponseData } from '@/lib/types/avinode-webhooks';

/**
 * Quote data matching the Supabase quotes table schema
 * This is what gets stored in the database and what useAvinodeQuotes returns
 */
export interface DatabaseQuote {
  id: string;
  request_id: string;
  operator_id: string;
  operator_name: string;
  aircraft_type: string;
  aircraft_tail_number?: string;
  base_price: number;
  taxes?: number;
  fees?: number;
  fuel_surcharge?: number;
  total_price: number;
  valid_until?: string;
  status: 'pending' | 'received' | 'analyzed' | 'accepted' | 'rejected' | 'expired';
  score?: number;
  ranking?: number;
  availability_confirmed?: boolean;
  analysis_notes?: string;
  aircraft_details?: {
    type: string;
    model: string;
    tailNumber?: string;
    capacity: number;
    yearOfManufacture?: number;
    amenities?: string[];
    rating?: number;
  };
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Search result aircraft - matches Avinode search response
 */
export interface AircraftSearchResult {
  id: string;
  type: string;
  model: string;
  category: 'light' | 'midsize' | 'heavy' | 'ultra-long-range';
  capacity: number;
  range: number;
  speed: number;
  yearOfManufacture: number;
  tailNumber?: string;
  operator: {
    id: string;
    name: string;
    rating: number;
  };
  estimatedPrice: {
    amount: number;
    currency: string;
  };
  availability: 'available' | 'on_request' | 'unavailable';
}

/**
 * RFP creation response - matches Avinode trip creation
 */
export interface RFPCreationResponse {
  trip_id: string;
  request_id: string;
  status: 'created' | 'pending' | 'active';
  operators_notified: number;
  created_at: string;
  quote_deadline: string;
  deep_link: string;
  watch_url: string;
}

/**
 * RFP status with quotes - matches Avinode trip status
 */
export interface RFPStatusResponse {
  trip_id: string;
  request_id: string;
  status: 'pending' | 'quotes_received' | 'completed' | 'expired';
  operators_contacted: number;
  quotes_received: number;
  created_at: string;
  quote_deadline: string;
  deep_link: string;
  quotes: DatabaseQuote[];
}

/**
 * Airport search result
 */
export interface AirportResult {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
}

export class MockAvinodeClient {
  private tripCounter = 0;
  private quoteCounter = 0;

  /**
   * Search for available flights/aircraft
   */
  async searchFlights(params: {
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    passengers: number;
    aircraft_category?: string;
  }): Promise<{
    search_id: string;
    aircraft: AircraftSearchResult[];
    total: number;
    query: {
      departure: string;
      arrival: string;
      passengers: number;
    };
  }> {
    await this.delay(500, 2000);

    const allAircraft = this.generateMockAircraft();

    // Filter by category if specified
    let filtered = params.aircraft_category
      ? allAircraft.filter((a) => a.category === params.aircraft_category)
      : allAircraft;

    // Filter by capacity (aircraft must fit all passengers)
    filtered = filtered.filter((a) => a.capacity >= params.passengers);

    // Return 3-5 random aircraft
    const count = Math.floor(Math.random() * 3) + 3;
    const shuffled = filtered.sort(() => Math.random() - 0.5);

    return {
      search_id: `SEARCH-${Date.now()}`,
      aircraft: shuffled.slice(0, count),
      total: count,
      query: {
        departure: params.departure_airport,
        arrival: params.arrival_airport,
        passengers: params.passengers,
      },
    };
  }

  /**
   * Create RFP and distribute to operators
   */
  async createRFP(params: {
    departure_airport?: string;
    arrival_airport?: string;
    departure_date?: string;
    passengers?: number;
    operator_ids?: string[];
    special_requirements?: string;
    flight_details?: {
      departure_airport: string;
      arrival_airport: string;
      departure_date: string;
      passengers: number;
    };
  }): Promise<RFPCreationResponse & {
    departure_airport: { icao: string; name: string; city: string };
    arrival_airport: { icao: string; name: string; city: string };
    departure_date: string;
    passengers: number;
    rfp_id: string;
  }> {
    await this.delay(800, 1500);

    // Handle both flat params and nested flight_details
    const flightDetails = params.flight_details || {
      departure_airport: params.departure_airport || 'KTEB',
      arrival_airport: params.arrival_airport || 'KVNY',
      departure_date: params.departure_date || new Date().toISOString().split('T')[0],
      passengers: params.passengers || 4,
    };

    this.tripCounter++;
    const tripId = `atrip-${64956150 + this.tripCounter}`;
    const requestId = `arfq-${12345670 + this.tripCounter}`;

    // Get airport details
    const departureAirportInfo = this.getAirportInfo(flightDetails.departure_airport);
    const arrivalAirportInfo = this.getAirportInfo(flightDetails.arrival_airport);

    return {
      trip_id: tripId,
      request_id: requestId,
      rfp_id: requestId,
      status: 'created',
      operators_notified: params.operator_ids?.length || 5,
      created_at: new Date().toISOString(),
      quote_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      deep_link: `https://sandbox.avinode.com/marketplace/mvc/search#preSearch`,
      watch_url: `https://sandbox.avinode.com/marketplace/mvc/trips/selling/rfq?source=api&rfq=${requestId}`,
      departure_airport: departureAirportInfo,
      arrival_airport: arrivalAirportInfo,
      departure_date: flightDetails.departure_date,
      passengers: flightDetails.passengers,
    };
  }

  /**
   * Get airport info by ICAO code
   */
  private getAirportInfo(icao: string): { icao: string; name: string; city: string } {
    const airports: Record<string, { name: string; city: string }> = {
      'KTEB': { name: 'Teterboro Airport', city: 'Teterboro, NJ' },
      'KJFK': { name: 'John F. Kennedy International', city: 'New York, NY' },
      'KLGA': { name: 'LaGuardia Airport', city: 'New York, NY' },
      'KOPF': { name: 'Miami-Opa Locka Executive', city: 'Miami, FL' },
      'KMIA': { name: 'Miami International Airport', city: 'Miami, FL' },
      'KPBI': { name: 'Palm Beach International', city: 'West Palm Beach, FL' },
      'KLAX': { name: 'Los Angeles International', city: 'Los Angeles, CA' },
      'KVNY': { name: 'Van Nuys Airport', city: 'Los Angeles, CA' },
      'KLAS': { name: 'Harry Reid International', city: 'Las Vegas, NV' },
      'KASE': { name: 'Aspen/Pitkin County Airport', city: 'Aspen, CO' },
      'KSFO': { name: 'San Francisco International', city: 'San Francisco, CA' },
    };
    const info = airports[icao] || { name: 'Unknown Airport', city: 'Unknown' };
    return { icao, ...info };
  }

  /**
   * Get RFP status with quotes
   */
  async getQuoteStatus(tripId: string): Promise<RFPStatusResponse> {
    await this.delay(300, 800);

    const requestId = tripId.replace('atrip-', 'arfq-');
    const quotes = this.generateMockQuotes(requestId, tripId);

    return {
      trip_id: tripId,
      request_id: requestId,
      status: quotes.length >= 3 ? 'quotes_received' : 'pending',
      operators_contacted: 5,
      quotes_received: quotes.length,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      quote_deadline: new Date(Date.now() + 86400000).toISOString(),
      deep_link: `https://sandbox.avinode.com/marketplace/mvc/trips/selling/rfq?source=api&rfq=${requestId}`,
      quotes,
    };
  }

  /**
   * Get all quotes for an RFP
   */
  async getQuotes(tripId: string): Promise<{
    trip_id: string;
    request_id: string;
    quotes: DatabaseQuote[];
    total: number;
  }> {
    await this.delay(500, 1200);

    const requestId = tripId.replace('atrip-', 'arfq-');
    const quotes = this.generateMockQuotes(requestId, tripId);

    return {
      trip_id: tripId,
      request_id: requestId,
      quotes,
      total: quotes.length,
    };
  }

  /**
   * Create a trip container and return deep link for manual operator selection
   * This is the primary tool for the deep link workflow
   */
  async createTrip(params: {
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    passengers: number;
    departure_time?: string;
    return_date?: string;
    return_time?: string;
    aircraft_category?: 'light' | 'midsize' | 'heavy' | 'ultra-long-range';
    special_requirements?: string;
    client_reference?: string;
  }): Promise<{
    trip_id: string;
    deep_link: string;
    search_link: string;
    status: string;
    created_at: string;
    route: {
      departure: { airport: string; date: string; time?: string };
      arrival: { airport: string };
      return?: { date: string; time?: string };
    };
    passengers: number;
    departure_airport: { icao: string; name: string; city: string };
    arrival_airport: { icao: string; name: string; city: string };
  }> {
    await this.delay(800, 1500);

    this.tripCounter++;
    const tripId = `atrip-${64956150 + this.tripCounter}`;

    // Get airport details
    const departureAirportInfo = this.getAirportInfo(params.departure_airport);
    const arrivalAirportInfo = this.getAirportInfo(params.arrival_airport);

    // Avinode deep link format: Pre-search URL for initial flight search
    const deepLink = `https://sandbox.avinode.com/marketplace/mvc/search#preSearch`;
    const searchLink = `https://sandbox.avinode.com/marketplace/mvc/search/load/${tripId}?source=api&origin=api_action`;

    return {
      trip_id: tripId,
      deep_link: deepLink,
      search_link: searchLink,
      status: 'created',
      created_at: new Date().toISOString(),
      route: {
        departure: {
          airport: params.departure_airport,
          date: params.departure_date,
          time: params.departure_time,
        },
        arrival: {
          airport: params.arrival_airport,
        },
        return: params.return_date
          ? {
              date: params.return_date,
              time: params.return_time,
            }
          : undefined,
      },
      passengers: params.passengers,
      departure_airport: departureAirportInfo,
      arrival_airport: arrivalAirportInfo,
    };
  }

  /**
   * Generate realistic mock aircraft data
   * Uses nested structure matching Avinode API
   */
  private generateMockAircraft(): AircraftSearchResult[] {
    return [
      {
        id: 'AC-001',
        type: 'Midsize Jet',
        model: 'Citation X',
        category: 'midsize',
        capacity: 8,
        range: 3242,
        speed: 604,
        yearOfManufacture: 2019,
        tailNumber: 'N800EJ',
        operator: {
          id: 'comp-exec-jet-001',
          name: 'Executive Jet Management',
          rating: 4.8,
        },
        estimatedPrice: {
          amount: 45000,
          currency: 'USD',
        },
        availability: 'available',
      },
      {
        id: 'AC-002',
        type: 'Heavy Jet',
        model: 'Gulfstream G550',
        category: 'heavy',
        capacity: 14,
        range: 6750,
        speed: 562,
        yearOfManufacture: 2020,
        tailNumber: 'N550NJ',
        operator: {
          id: 'comp-netjets-002',
          name: 'NetJets',
          rating: 4.9,
        },
        estimatedPrice: {
          amount: 95000,
          currency: 'USD',
        },
        availability: 'available',
      },
      {
        id: 'AC-003',
        type: 'Midsize Jet',
        model: 'Challenger 350',
        category: 'midsize',
        capacity: 9,
        range: 3200,
        speed: 541,
        yearOfManufacture: 2021,
        tailNumber: 'N350VJ',
        operator: {
          id: 'comp-vistajet-003',
          name: 'VistaJet',
          rating: 4.7,
        },
        estimatedPrice: {
          amount: 52000,
          currency: 'USD',
        },
        availability: 'available',
      },
      {
        id: 'AC-004',
        type: 'Light Jet',
        model: 'Phenom 300',
        category: 'light',
        capacity: 7,
        range: 1971,
        speed: 464,
        yearOfManufacture: 2022,
        tailNumber: 'N300FJ',
        operator: {
          id: 'comp-flexjet-004',
          name: 'Flexjet',
          rating: 4.6,
        },
        estimatedPrice: {
          amount: 28000,
          currency: 'USD',
        },
        availability: 'available',
      },
      {
        id: 'AC-005',
        type: 'Ultra Long Range',
        model: 'Global 7500',
        category: 'ultra-long-range',
        capacity: 17,
        range: 7700,
        speed: 590,
        yearOfManufacture: 2023,
        tailNumber: 'N7500BA',
        operator: {
          id: 'comp-bombardier-005',
          name: 'Bombardier Business Aircraft',
          rating: 4.8,
        },
        estimatedPrice: {
          amount: 125000,
          currency: 'USD',
        },
        availability: 'on_request',
      },
      {
        id: 'AC-006',
        type: 'Midsize Jet',
        model: 'Falcon 2000',
        category: 'midsize',
        capacity: 10,
        range: 3350,
        speed: 528,
        yearOfManufacture: 2018,
        tailNumber: 'N2000DA',
        operator: {
          id: 'comp-dassault-006',
          name: 'Dassault Falcon Jet',
          rating: 4.7,
        },
        estimatedPrice: {
          amount: 58000,
          currency: 'USD',
        },
        availability: 'available',
      },
      {
        id: 'AC-007',
        type: 'Light Jet',
        model: 'Citation CJ4',
        category: 'light',
        capacity: 6,
        range: 2165,
        speed: 453,
        yearOfManufacture: 2020,
        tailNumber: 'N4CJ7',
        operator: {
          id: 'comp-textron-007',
          name: 'Textron Aviation',
          rating: 4.5,
        },
        estimatedPrice: {
          amount: 32000,
          currency: 'USD',
        },
        availability: 'available',
      },
    ];
  }

  /**
   * Generate mock quotes matching the database schema
   * These match what would come from Avinode webhooks and be stored in Supabase
   */
  private generateMockQuotes(requestId: string, tripId: string): DatabaseQuote[] {
    const count = Math.floor(Math.random() * 3) + 2; // 2-4 quotes

    const operators = [
      {
        id: 'comp-exec-jet-001',
        name: 'Executive Jet Management',
        rating: 4.8,
      },
      {
        id: 'comp-netjets-002',
        name: 'NetJets',
        rating: 4.9,
      },
      {
        id: 'comp-vistajet-003',
        name: 'VistaJet',
        rating: 4.7,
      },
      {
        id: 'comp-flexjet-004',
        name: 'Flexjet',
        rating: 4.6,
      },
      {
        id: 'comp-luxury-jets-005',
        name: 'Luxury Jets International',
        rating: 4.8,
      },
    ];

    const aircraftModels = [
      { type: 'Heavy Jet', model: 'Gulfstream G650', capacity: 16, tailNumber: 'N650EJ' },
      { type: 'Heavy Jet', model: 'Bombardier Global 7500', capacity: 19, tailNumber: 'N7500PA' },
      { type: 'Midsize Jet', model: 'Citation XLS+', capacity: 9, tailNumber: 'N300AA' },
      { type: 'Heavy Jet', model: 'Falcon 900LX', capacity: 12, tailNumber: 'N900LX' },
      { type: 'Ultra Long Range', model: 'Gulfstream G700', capacity: 19, tailNumber: 'N700LJ' },
    ];

    return Array.from({ length: count }, (_, i) => {
      this.quoteCounter++;
      const operator = operators[i % operators.length];
      const aircraft = aircraftModels[i % aircraftModels.length];
      const basePrice = Math.floor(Math.random() * 40000) + 30000; // $30k-$70k
      const taxes = Math.floor(basePrice * 0.075);
      const fees = Math.floor(Math.random() * 2000) + 500;
      const fuelSurcharge = Math.floor(Math.random() * 3000) + 1500;
      const totalPrice = basePrice + taxes + fees + fuelSurcharge;

      return {
        id: `aquote-${386512790 + this.quoteCounter}`,
        request_id: requestId,
        operator_id: operator.id,
        operator_name: operator.name,
        aircraft_type: aircraft.type,
        aircraft_tail_number: aircraft.tailNumber,
        base_price: basePrice,
        taxes,
        fees,
        fuel_surcharge: fuelSurcharge,
        total_price: totalPrice,
        valid_until: new Date(Date.now() + (3 + i) * 24 * 60 * 60 * 1000).toISOString(),
        status: 'received' as const,
        score: 85 - i * 5, // Ranking by score
        ranking: i + 1,
        availability_confirmed: true,
        aircraft_details: {
          type: aircraft.type,
          model: aircraft.model,
          tailNumber: aircraft.tailNumber,
          capacity: aircraft.capacity,
          yearOfManufacture: 2020 + Math.floor(Math.random() * 4),
          amenities: ['WiFi', 'Satellite Phone', 'Full Galley', 'Enclosed Lavatory'],
          rating: operator.rating,
        },
        metadata: {
          avinode_quote_id: `aquote-${386512790 + this.quoteCounter}`,
          avinode_trip_id: tripId,
          response_time_minutes: Math.floor(Math.random() * 60) + 5,
        },
        created_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  }

  /**
   * Search airports by name, code, or city
   */
  async searchAirports(params: { query: string; country?: string }): Promise<{
    airports: AirportResult[];
    total: number;
  }> {
    await this.delay(100, 300);

    const allAirports: AirportResult[] = [
      { icao: 'KTEB', iata: 'TEB', name: 'Teterboro Airport', city: 'Teterboro', country: 'US' },
      { icao: 'KJFK', iata: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US' },
      { icao: 'KLGA', iata: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'US' },
      { icao: 'KOPF', iata: 'OPF', name: 'Miami-Opa Locka Executive', city: 'Miami', country: 'US' },
      { icao: 'KMIA', iata: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'US' },
      { icao: 'KPBI', iata: 'PBI', name: 'Palm Beach International', city: 'West Palm Beach', country: 'US' },
      { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US' },
      { icao: 'KVNY', iata: 'VNY', name: 'Van Nuys Airport', city: 'Los Angeles', country: 'US' },
      { icao: 'KLAS', iata: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'US' },
      { icao: 'EGLL', iata: 'LHR', name: 'London Heathrow', city: 'London', country: 'GB' },
    ];

    const searchLower = (params.query || '').toLowerCase();
    let filtered = allAirports.filter(
      (a) =>
        a.icao.toLowerCase().includes(searchLower) ||
        a.iata.toLowerCase().includes(searchLower) ||
        a.name.toLowerCase().includes(searchLower) ||
        a.city.toLowerCase().includes(searchLower)
    );

    // Apply country filter if provided
    if (params.country) {
      filtered = filtered.filter((a) => a.country === params.country);
    }

    return {
      airports: filtered,
      total: filtered.length,
    };
  }

  /**
   * Simulate API delay
   */
  private delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
