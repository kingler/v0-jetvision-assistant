/**
 * Avinode API Client
 *
 * Production client for Avinode API integration.
 * Handles flight search, RFQ creation, and quote retrieval.
 *
 * @see lib/types/avinode-webhooks.ts - Webhook types
 * @see components/avinode/rfq-flight-card.tsx - RFQFlight interface
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

interface AvinodeConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * RFQFlight interface matching the UI component requirements
 * This is what RFQFlightCard and RFQFlightsList expect
 */
export interface RFQFlight {
  id: string;
  quoteId: string;
  departureAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  arrivalAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  departureDate: string;
  departureTime?: string;
  flightDuration: string;
  aircraftType: string;
  aircraftModel: string;
  tailNumber?: string;
  yearOfManufacture?: number;
  passengerCapacity: number;
  aircraftImageUrl?: string;
  operatorName: string;
  operatorRating?: number;
  operatorEmail?: string;
  price: number;
  currency: string;
  priceBreakdown?: {
    base: number;
    taxes: number;
    fees: number;
  };
  validUntil?: string;
  amenities: {
    wifi: boolean;
    pets: boolean;
    smoking: boolean;
    galley: boolean;
    lavatory: boolean;
    medical: boolean;
  };
  rfqStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired';
  lastUpdated: string;
  responseTimeMinutes?: number;
  isSelected?: boolean;
}

/**
 * Quote data matching the Supabase quotes table schema
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
 * Avinode API Client
 * Handles HTTP communication with Avinode API
 */
export class AvinodeClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: AvinodeConfig) {
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor for logging (without exposing API key)
    this.client.interceptors.request.use(
      (config) => {
        // Log request (sanitized)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Avinode API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Search for available flights/aircraft
   */
  async searchFlights(params: any) {
    try {
      const response = await this.client.post('/flights/search', params);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Create RFP and distribute to operators
   */
  async createRFP(params: any) {
    try {
      const response = await this.client.post('/rfps', params);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get RFP status
   */
  async getQuoteStatus(rfpId: string) {
    try {
      const response = await this.client.get(`/rfps/${rfpId}/status`);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get all quotes for an RFP
   */
  async getQuotes(rfpId: string) {
    try {
      const response = await this.client.get(`/rfps/${rfpId}/quotes`);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get RFQ details by ID including all received quotes
   * Uses the /rfqs/{id} endpoint per Avinode API spec
   * @see https://developer.avinodegroup.com/reference/readbynumericid
   */
  async getRFQ(rfqId: string) {
    try {
      // Handle different ID formats - extract numeric ID if prefixed
      let numericId = rfqId;
      if (rfqId.startsWith('atrip-') || rfqId.startsWith('arfq-')) {
        numericId = rfqId.split('-')[1];
      }

      const response = await this.client.get(`/rfqs/${numericId}`);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
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
    aircraft_category?: string;
    special_requirements?: string;
    client_reference?: string;
  }) {
    try {
      const response = await this.client.post('/v1/trips', {
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
        aircraft_category: params.aircraft_category,
        special_requirements: params.special_requirements,
        client_reference: params.client_reference,
      });
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get RFQ flights in the format expected by RFQFlightCard and RFQFlightsList components
   * This is the primary method for Step 3 of the RFP workflow
   *
   * Fetches RFQ data from Avinode API and transforms it into the RFQFlight format.
   * Status is derived from the TripRequestSellerResponse webhook data stored in the database.
   */
  async getRFQFlights(rfqId: string): Promise<{
    rfq_id: string;
    trip_id: string;
    status: 'pending' | 'quotes_received' | 'completed' | 'expired';
    created_at: string;
    quote_deadline: string;
    departure_airport: { icao: string; name: string; city: string };
    arrival_airport: { icao: string; name: string; city: string };
    departure_date: string;
    passengers: number;
    operators_contacted: number;
    flights_received: number;
    flights: RFQFlight[];
    deep_link: string;
  }> {
    try {
      // Fetch RFQ data from Avinode API
      const rfqData = await this.getRFQ(rfqId);

      // Transform Avinode API response to RFQFlight format
      const flights = this.transformToRFQFlights(rfqData);

      return {
        rfq_id: rfqData.rfq_id || rfqId,
        trip_id: rfqData.trip_id || rfqId.replace('arfq-', 'atrip-'),
        status: flights.length >= 2 ? 'quotes_received' : 'pending',
        created_at: rfqData.created_at || new Date().toISOString(),
        quote_deadline: rfqData.quote_deadline || new Date(Date.now() + 86400000).toISOString(),
        departure_airport: rfqData.route?.departure?.airport || { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' },
        arrival_airport: rfqData.route?.arrival?.airport || { icao: 'KVNY', name: 'Van Nuys Airport', city: 'Los Angeles, CA' },
        departure_date: rfqData.route?.departure?.date || new Date().toISOString().split('T')[0],
        passengers: rfqData.passengers || 4,
        operators_contacted: rfqData.operators_contacted || flights.length,
        flights_received: flights.length,
        flights,
        deep_link: rfqData.deep_link || `https://sandbox.avinode.com/marketplace/mvc/trips/selling/rfq?source=api&rfq=${rfqId}`,
      };
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Transform Avinode API response to RFQFlight array
   * Maps the raw API response to the format expected by UI components
   */
  private transformToRFQFlights(rfqData: any): RFQFlight[] {
    const quotes = rfqData.quotes || rfqData.requests || [];

    return quotes.map((quote: any, index: number) => {
      // Derive status from response data
      // 'unanswered' = RFQ sent but no response yet
      // 'quoted' = Response received with quote
      // 'declined' = Response received with decline
      const hasResponse = quote.status === 'quoted' || quote.status === 'declined';
      const rfqStatus: RFQFlight['rfqStatus'] = hasResponse
        ? (quote.status === 'quoted' ? 'quoted' : 'declined')
        : 'unanswered';

      const hasQuote = rfqStatus === 'quoted';

      return {
        id: `flight-${quote.id || index + 1}`,
        quoteId: quote.quote?.id || quote.id || `quote-${index + 1}`,
        departureAirport: quote.route?.departure?.airport || rfqData.route?.departure?.airport || { icao: 'KTEB' },
        arrivalAirport: quote.route?.arrival?.airport || rfqData.route?.arrival?.airport || { icao: 'KVNY' },
        departureDate: quote.route?.departure?.date || rfqData.route?.departure?.date || new Date().toISOString().split('T')[0],
        departureTime: quote.schedule?.departureTime ? new Date(quote.schedule.departureTime).toTimeString().slice(0, 5) : undefined,
        flightDuration: this.formatDuration(quote.schedule?.flightDuration),
        aircraftType: quote.aircraft?.type || 'Unknown',
        aircraftModel: quote.aircraft?.model || 'Unknown',
        tailNumber: quote.aircraft?.tailNumber,
        yearOfManufacture: quote.aircraft?.yearOfManufacture,
        passengerCapacity: quote.aircraft?.capacity || 0,
        aircraftImageUrl: undefined,
        operatorName: quote.seller?.companyName || quote.operator_name || 'Unknown Operator',
        operatorRating: quote.seller?.rating,
        operatorEmail: quote.seller?.email,
        price: hasQuote ? (quote.totalPrice?.amount || quote.quote?.totalPrice?.amount || 0) : 0,
        currency: hasQuote ? (quote.totalPrice?.currency || quote.quote?.totalPrice?.currency || 'USD') : 'USD',
        priceBreakdown: hasQuote && quote.pricing ? {
          base: quote.pricing.basePrice || 0,
          taxes: quote.pricing.taxes || 0,
          fees: quote.pricing.fees || 0,
        } : undefined,
        validUntil: hasQuote ? quote.validUntil : undefined,
        amenities: {
          wifi: quote.aircraft?.amenities?.includes('WiFi') || false,
          pets: quote.aircraft?.amenities?.includes('Pets') || false,
          smoking: false,
          galley: quote.aircraft?.amenities?.includes('Galley') || false,
          lavatory: quote.aircraft?.amenities?.includes('Lavatory') || false,
          medical: quote.aircraft?.amenities?.includes('Medical') || false,
        },
        rfqStatus,
        lastUpdated: quote.updated_at || new Date().toISOString(),
        responseTimeMinutes: quote.response_time_minutes,
        isSelected: false,
      };
    });
  }

  /**
   * Format flight duration from minutes to "Xh Ym" format
   */
  private formatDuration(minutes?: number): string {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data: any = error.response.data;

      if (status === 404) {
        return Promise.reject(new Error('Resource not found'));
      } else if (status === 401 || status === 403) {
        return Promise.reject(new Error('Authentication failed'));
      } else if (status === 429) {
        return Promise.reject(new Error('Rate limit exceeded'));
      } else {
        return Promise.reject(
          new Error(data?.message || `API error: ${status}`)
        );
      }
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(new Error('No response from Avinode API'));
    } else {
      // Request configuration error
      return Promise.reject(new Error('Request configuration error'));
    }
  }

  /**
   * Sanitize error to prevent API key exposure
   */
  private sanitizeError(error: any): Error {
    if (error instanceof Error) {
      // Remove API key from error message if present
      const sanitized = error.message.replace(this.apiKey, '[REDACTED]');
      return new Error(sanitized);
    }
    return new Error('Unknown error occurred');
  }
}
