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
import { Logger, LogLevel } from '../logger';

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
  private baseUrl: string;
  private logger: Logger;

  constructor(config: AvinodeConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.logger = new Logger({
      level: LogLevel.INFO,
      prefix: '[Avinode Client]',
    });

    // Get the API token from environment (separate from the JWT auth token)
    const apiToken = process.env.AVINODE_API_TOKEN || '';

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Avinode-ApiToken': apiToken,
        'X-Avinode-ApiVersion': 'v1.0',
        'X-Avinode-Product': 'Jetvision/1.0.0',
      },
      timeout: 30000,
    });

    // Add request interceptor for timestamp and logging
    this.client.interceptors.request.use(
      (config) => {
        // Add dynamic timestamp header required by Avinode API
        config.headers['X-Avinode-SentTimestamp'] = new Date().toISOString();

        // Log request (sanitized)
        this.logger.debug('API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
        });
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
   * Get RFQ details by ID or all RFQs for a trip identifier
   * 
   * Automatically detects response format to determine if it's a Trip ID or RFQ ID:
   * - Trip ID: GET /rfqs/{tripId} - Returns array of RFQs for the trip (per https://developer.avinodegroup.com/reference/readtriprfqs)
   * - RFQ ID: GET /rfqs/{id} - Returns single RFQ object (per https://developer.avinodegroup.com/reference/readbynumericid)
   * 
   * Detection logic:
   * - If response is an array → Trip ID response (all RFQs for trip)
   * - If response has rfq_id field → Single RFQ response
   * - If ID starts with 'arfq-' → Treat as RFQ ID
   * - Otherwise → Check response format (array = Trip ID, object = RFQ)
   * 
   * @param id - The RFQ or Trip identifier (e.g., arfq-12345678, atrip-12345678, QQ263P, or numeric ID)
   * @param options - Optional query parameters for additional details
   * @returns RFQ data - single RFQ object for RFQ ID, or array of RFQs for Trip ID
   */
  async getRFQ(
    id: string,
    options?: {
      taildetails?: boolean;
      typedetails?: boolean;
      timestamps?: boolean;
      tailphotos?: boolean;
      typephotos?: boolean;
      quotebreakdown?: boolean;
      latestquote?: boolean;
    }
  ) {
    try {
      // Handle different ID formats - extract numeric ID if prefixed
      // For IDs like QQ263P, use as-is (Avinode API accepts various formats)
      let apiId = id;
      if (id.startsWith('atrip-') || id.startsWith('arfq-')) {
        apiId = id.split('-')[1];
      }
      // For other formats (like QQ263P), use the ID as-is

      // Default query parameters for comprehensive data
      const defaultParams = {
        taildetails: true,
        typedetails: true,
        timestamps: true,
        tailphotos: true,
        typephotos: true,
      };

      const response = await this.client.get(`/rfqs/${apiId}`, {
        params: { ...defaultParams, ...options },
      });
      
      // Detect response type by checking the structure
      // Trip ID responses return an array of RFQs
      // RFQ ID responses return a single object with rfq_id field
      const responseData = response.data;
      
      // Check if response is an array (Trip ID response)
      if (Array.isArray(responseData)) {
        return responseData;
      }
      
      // Check if response has nested rfqs array
      if (responseData?.rfqs && Array.isArray(responseData.rfqs)) {
        return responseData.rfqs;
      }
      
      // Check if response has nested data array
      if (responseData?.data && Array.isArray(responseData.data)) {
        return responseData.data;
      }
      
      // If response has rfq_id field, it's a single RFQ
      if (responseData?.rfq_id) {
        return responseData;
      }
      
      // If ID starts with 'arfq-', definitely an RFQ
      if (id.startsWith('arfq-')) {
        return responseData;
      }
      
      // Default: treat as single RFQ if it's an object, or wrap in array if needed
      return responseData;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Create a trip container and return deep link for manual operator selection
   * This is the primary tool for the deep link workflow
   *
   * Uses the Avinode API's segments[] format for trip creation
   * @see https://developer.avinodegroup.com/reference/create-trip
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
      // Generate unique external trip ID for tracking
      const externalTripId = `JETVISION-${Date.now()}`;

      // Build segments array - supports one-way and round-trip
      const segments: Array<{
        startAirport: { icao: string };
        endAirport: { icao: string };
        dateTime: {
          date: string;
          time: string;
          departure: boolean;
          local: boolean;
        };
        paxCount: string;
        paxSegment: boolean;
        paxTBD: boolean;
        timeTBD: boolean;
      }> = [
        {
          startAirport: { icao: params.departure_airport },
          endAirport: { icao: params.arrival_airport },
          dateTime: {
            date: params.departure_date,
            time: params.departure_time || '10:00',
            departure: true,
            local: true,
          },
          paxCount: String(params.passengers),
          paxSegment: true,
          paxTBD: false,
          timeTBD: !params.departure_time,
        },
      ];

      // Add return segment if round-trip
      if (params.return_date) {
        segments.push({
          startAirport: { icao: params.arrival_airport },
          endAirport: { icao: params.departure_airport },
          dateTime: {
            date: params.return_date,
            time: params.return_time || '10:00',
            departure: true,
            local: true,
          },
          paxCount: String(params.passengers),
          paxSegment: true,
          paxTBD: false,
          timeTBD: !params.return_time,
        });
      }

      // Build criteria object for aircraft requirements
      // Only include requiredLift if an aircraft category is specified
      // Sending empty strings causes a 422 "LIFT_INVALID" error
      const criteria: {
        requiredLift?: Array<{
          aircraftCategory: string;
          aircraftType: string;
          aircraftTail: string;
        }>;
        requiredPartnerships: string[];
        maxFuelStopsPerSegment: number;
        includeLiftUpgrades: boolean;
        maxInitialPositioningTimeMinutes: number;
      } = {
        requiredPartnerships: [],
        maxFuelStopsPerSegment: 0,
        includeLiftUpgrades: true,
        maxInitialPositioningTimeMinutes: 0,
      };

      // Only add requiredLift if aircraft_category is specified
      if (params.aircraft_category) {
        criteria.requiredLift = [
          {
            aircraftCategory: params.aircraft_category,
            aircraftType: '',
            aircraftTail: '',
          },
        ];
      }

      // Use the correct Avinode API format with segments[]
      const response = await this.client.post('/trips', {
        externalTripId,
        sourcing: true, // Required: enables sourcing/search functionality
        segments,
        criteria,
      });

      // Extract trip data from Avinode API response
      // The API returns nested structure: { meta: {...}, data: { id, tripId, actions, ... } }
      const tripData = response.data?.data || response.data;

      // Extract the searchInAvinode deep link from actions
      const searchDeepLink = tripData?.actions?.searchInAvinode?.href;
      const viewDeepLink = tripData?.actions?.viewInAvinode?.href;

      // Log successful trip creation
      this.logger.info('Trip created successfully', {
        externalTripId,
        tripId: tripData?.tripId || tripData?.id,
        deepLink: searchDeepLink,
      });

      // Return in the format expected by the UI (chat-interface.tsx expects trip_id and deep_link)
      return {
        success: true,
        trip_id: tripData?.tripId || tripData?.id?.replace('atrip-', '') || externalTripId,
        internal_id: tripData?.id, // e.g., "atrip-65262252"
        deep_link: searchDeepLink,
        view_link: viewDeepLink,
        departure_airport: params.departure_airport,
        arrival_airport: params.arrival_airport,
        departure_date: params.departure_date,
        passengers: params.passengers,
        external_trip_id: externalTripId,
        // Include raw response for debugging
        raw_response: response.data,
      };
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

      // Validate critical fields before processing
      this.validateCriticalFields(rfqData, rfqId);

      // Transform Avinode API response to RFQFlight format
      const flights = this.transformToRFQFlights(rfqData);

      // Derive trip_id using a simple sequential approach consistent with getRFQ
      // Priority: rfqData.trip_id > atrip- prefix > arfq- prefix > numeric ID > fallback extraction
      let tripId: string;
      
      // Step 1: Use trip_id from response data if present
      if (rfqData.trip_id) {
        tripId = rfqData.trip_id;
      }
      // Step 2: If rfqId already has 'atrip-' prefix, use as-is
      else if (rfqId.startsWith('atrip-')) {
        tripId = rfqId;
      }
      // Step 3: If rfqId has 'arfq-' prefix, replace with 'atrip-' prefix
      else if (rfqId.startsWith('arfq-')) {
        tripId = rfqId.replace('arfq-', 'atrip-');
      }
      // Step 4: If rfqId is pure numeric, prefix with 'atrip-'
      else if (/^\d+$/.test(rfqId)) {
        tripId = `atrip-${rfqId}`;
      }
      // Step 5: Attempt safe fallback extraction - strip any single prefix and use remainder
      else {
        const fallbackMatch = rfqId.match(/^[a-z]+-(.+)$/i);
        if (fallbackMatch && fallbackMatch[1]) {
          // Extract the ID portion after the prefix and prepend 'atrip-'
          tripId = `atrip-${fallbackMatch[1]}`;
          // Log warning for unexpected format that required fallback extraction
          this.logger.warn('Unexpected rfqId format, using fallback extraction to derive trip_id', {
            rfqId,
            derivedTripId: tripId,
          });
        } else {
          // Cannot derive meaningful trip_id - throw error with accurate format description
          const errorMessage = `Invalid rfqId format: "${rfqId}". Expected format: "arfq-{id}", "atrip-{id}", or numeric ID. Cannot derive valid trip_id.`;
          this.logger.error(errorMessage, { rfqId });
          throw new Error(errorMessage);
        }
      }

      // Build return object with validated critical fields and fallbacks for non-critical fields
      const result: {
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
      } = {
        rfq_id: this.getFieldWithFallback(
          'rfq_id',
          rfqData.rfq_id,
          rfqId,
          rfqId
        ),
        trip_id: tripId,
        status: (flights.length >= 2 ? 'quotes_received' : 'pending') as 'pending' | 'quotes_received' | 'completed' | 'expired',
        created_at: this.getFieldWithFallback(
          'created_at',
          rfqData.created_at,
          rfqId,
          new Date().toISOString()
        ),
        quote_deadline: this.getFieldWithFallback(
          'quote_deadline',
          rfqData.quote_deadline,
          rfqId,
          new Date(Date.now() + 86400000).toISOString()
        ),
        departure_airport: rfqData.route?.departure?.airport, // Already validated
        arrival_airport: rfqData.route?.arrival?.airport, // Already validated
        departure_date: rfqData.route?.departure?.date, // Already validated
        passengers: this.getFieldWithFallback(
          'passengers',
          rfqData.passengers,
          rfqId,
          4
        ),
        operators_contacted: this.getFieldWithFallback(
          'operators_contacted',
          rfqData.operators_contacted,
          rfqId,
          flights.length
        ),
        flights_received: flights.length,
        flights,
        deep_link: this.getFieldWithFallback(
          'deep_link',
          rfqData.deep_link,
          rfqId,
          `${this.baseUrl}/marketplace/mvc/trips/selling/rfq?source=api&rfq=${rfqId}`
        ),
      };

      return result;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Validate critical fields required for RFQ processing
   * Throws an error if any critical field is missing
   *
   * @param rfqData - The RFQ data from Avinode API
   * @param rfqId - The RFQ identifier for error context
   * @throws Error if critical fields are missing
   */
  private validateCriticalFields(rfqData: any, rfqId: string): void {
    const missingFields: string[] = [];

    // Validate departure airport
    if (!rfqData.route?.departure?.airport) {
      missingFields.push('route.departure.airport');
    } else if (!rfqData.route.departure.airport.icao) {
      missingFields.push('route.departure.airport.icao');
    }

    // Validate arrival airport
    if (!rfqData.route?.arrival?.airport) {
      missingFields.push('route.arrival.airport');
    } else if (!rfqData.route.arrival.airport.icao) {
      missingFields.push('route.arrival.airport.icao');
    }

    // Validate departure date
    if (!rfqData.route?.departure?.date) {
      missingFields.push('route.departure.date');
    }

    // Throw error if any critical fields are missing
    if (missingFields.length > 0) {
      const errorMessage = `Missing critical fields in RFQ data for rfqId "${rfqId}": ${missingFields.join(', ')}`;
      this.logger.error(errorMessage, {
        rfqId,
        missingFields,
        rfqData: this.sanitizeRfqDataForLogging(rfqData),
      });
      throw new Error(errorMessage);
    }

    // Log successful validation
    this.logger.debug('Critical fields validated successfully', {
      rfqId,
      departureAirport: rfqData.route.departure.airport.icao,
      arrivalAirport: rfqData.route.arrival.airport.icao,
      departureDate: rfqData.route.departure.date,
    });
  }

  /**
   * Get field value with fallback, logging a warning if fallback is used
   *
   * @param fieldName - Name of the field for logging context
   * @param originalValue - Original value from API response
   * @param rfqId - RFQ identifier for logging context
   * @param fallbackValue - Fallback value to use if original is missing
   * @returns The original value if present, otherwise fallback value
   */
  private getFieldWithFallback<T>(
    fieldName: string,
    originalValue: T | undefined | null,
    rfqId: string,
    fallbackValue: T
  ): T {
    // Use fallback if original value is missing
    if (originalValue === undefined || originalValue === null) {
      this.logger.warn('Using fallback value for non-critical field', {
        rfqId,
        fieldName,
        originalValue: originalValue === undefined ? 'undefined' : 'null',
        fallbackValue,
      });
      return fallbackValue;
    }

    return originalValue;
  }

  /**
   * Sanitize RFQ data for logging to prevent sensitive information exposure
   * Removes or masks sensitive fields while preserving structure for debugging
   *
   * @param rfqData - The RFQ data to sanitize
   * @returns Sanitized RFQ data safe for logging
   */
  private sanitizeRfqDataForLogging(rfqData: any): any {
    if (!rfqData) {
      return null;
    }

    // Build sanitized object directly from rfqData, excluding sensitive fields
    // Safely compute quotes_count and has_quotes from rfqData.quotes
    return {
      route: rfqData.route,
      passengers: rfqData.passengers,
      rfq_id: rfqData.rfq_id,
      trip_id: rfqData.trip_id,
      created_at: rfqData.created_at,
      quote_deadline: rfqData.quote_deadline,
      // Safely compute quotes metrics for logging
      quotes_count: Array.isArray(rfqData.quotes) ? rfqData.quotes.length : 0,
      has_quotes: Array.isArray(rfqData.quotes) && rfqData.quotes.length > 0,
    };
  }

  /**
   * Transform Avinode API response to RFQFlight array
   * Maps the raw API response to the format expected by UI components
   */
  /**
   * Derive RFQ status from quote response data
   * Maps Avinode quote status to RFQFlight status enum
   * 
   * @param quote - The quote object from Avinode API
   * @returns The derived RFQ status ('unanswered', 'quoted', or 'declined')
   */
  private deriveRfqStatus(quote: any): RFQFlight['rfqStatus'] {
    // 'unanswered' = RFQ sent but no response yet
    // 'quoted' = Response received with quote
    // 'declined' = Response received with decline
    const hasResponse = quote.status === 'quoted' || quote.status === 'declined';
    return hasResponse
      ? (quote.status === 'quoted' ? 'quoted' : 'declined')
      : 'unanswered';
  }

  /**
   * Extract aircraft-related data from a quote
   * Provides default values for missing aircraft information
   * 
   * @param quote - The quote object from Avinode API
   * @returns Object containing aircraft type, model, tail number, year, and capacity
   */
  private extractAircraft(quote: any): {
    aircraftType: string;
    aircraftModel: string;
    tailNumber?: string;
    yearOfManufacture?: number;
    passengerCapacity: number;
  } {
    return {
      aircraftType: quote.aircraft?.type || 'Unknown',
      aircraftModel: quote.aircraft?.model || 'Unknown',
      tailNumber: quote.aircraft?.tailNumber,
      yearOfManufacture: quote.aircraft?.yearOfManufacture,
      passengerCapacity: quote.aircraft?.capacity || 0,
    };
  }

  /**
   * Extract pricing information from a quote
   * Only extracts pricing data if the quote has been quoted (not declined/unanswered)
   * 
   * @param quote - The quote object from Avinode API
   * @param hasQuote - Whether the quote has been quoted (true if rfqStatus === 'quoted')
   * @returns Object containing price, currency, price breakdown, and validity period
   */
  private extractPricing(quote: any, hasQuote: boolean): {
    price: number;
    currency: string;
    priceBreakdown?: {
      base: number;
      taxes: number;
      fees: number;
    };
    validUntil?: string;
  } {
    return {
      price: hasQuote ? (quote.totalPrice?.amount || quote.quote?.totalPrice?.amount || 0) : 0,
      currency: hasQuote ? (quote.totalPrice?.currency || quote.quote?.totalPrice?.currency || 'USD') : 'USD',
      priceBreakdown: hasQuote && quote.pricing ? {
        base: quote.pricing.basePrice || 0,
        taxes: quote.pricing.taxes || 0,
        fees: quote.pricing.fees || 0,
      } : undefined,
      validUntil: hasQuote ? quote.validUntil : undefined,
    };
  }

  /**
   * Map aircraft amenities from quote to RFQFlight amenities format
   * Checks if specific amenities are included in the aircraft amenities array
   * 
   * @param quote - The quote object from Avinode API
   * @returns Object containing boolean flags for each amenity type
   */
  private mapAmenities(quote: any): RFQFlight['amenities'] {
    const amenitiesArray = quote.aircraft?.amenities || [];
    return {
      wifi: amenitiesArray.includes('WiFi') || false,
      pets: amenitiesArray.includes('Pets') || false,
      smoking: false, // Smoking is always false per business rules
      galley: amenitiesArray.includes('Galley') || false,
      lavatory: amenitiesArray.includes('Lavatory') || false,
      medical: amenitiesArray.includes('Medical') || false,
    };
  }

  /**
   * Transform Avinode RFQ data into RFQFlight array format
   * Assembles flight data from quotes/requests, delegating extraction to helper methods
   * 
   * @param rfqData - The RFQ data object from Avinode API
   * @returns Array of RFQFlight objects ready for UI display
   */
  private transformToRFQFlights(rfqData: any): RFQFlight[] {
    // Log available quote sources for debugging
    const quotesFromQuotes = Array.isArray(rfqData.quotes) ? rfqData.quotes : [];
    const quotesFromRequests = Array.isArray(rfqData.requests) ? rfqData.requests : [];
    const quotesFromResponses = Array.isArray(rfqData.responses) ? rfqData.responses : [];
    
    // Combine ALL quotes from ALL possible arrays to ensure we don't miss any
    // This handles cases where quotes might be split across different fields
    // Use a Set to deduplicate by quote ID if the same quote appears in multiple arrays
    const allQuotesMap = new Map<string, any>();
    
    // Add quotes from all sources, using quote ID as key to prevent duplicates
    [...quotesFromQuotes, ...quotesFromRequests, ...quotesFromResponses].forEach((quote: any) => {
      const quoteId = quote.quote?.id || quote.id;
      if (quoteId && !allQuotesMap.has(quoteId)) {
        allQuotesMap.set(quoteId, quote);
      } else if (!quoteId) {
        // If no ID, add with index-based key to preserve it (might be duplicate but better than losing data)
        allQuotesMap.set(`no-id-${allQuotesMap.size}`, quote);
      }
    });
    
    // Convert map back to array
    const quotes = Array.from(allQuotesMap.values());

    // Log quote count for debugging discrepancy issues
    this.logger.info('Transforming RFQ flights', {
      quotesFromQuotes: quotesFromQuotes.length,
      quotesFromRequests: quotesFromRequests.length,
      quotesFromResponses: quotesFromResponses.length,
      totalQuotes: quotes.length,
      rfqId: rfqData.rfq_id || rfqData.id,
    });

    // Get route data from RFQ level (fallback for quote-level route data)
    const rfqDepartureAirport = rfqData.route?.departure?.airport;
    const rfqArrivalAirport = rfqData.route?.arrival?.airport;
    const rfqDepartureDate = rfqData.route?.departure?.date;

    return quotes.map((quote: any, index: number) => {
      // Derive RFQ status using helper method
      const rfqStatus = this.deriveRfqStatus(quote);
      const hasQuote = rfqStatus === 'quoted';

      // Extract aircraft data using helper method
      const aircraft = this.extractAircraft(quote);

      // Extract pricing data using helper method
      const pricing = this.extractPricing(quote, hasQuote);

      // Map amenities using helper method
      const amenities = this.mapAmenities(quote);

      // Extract route data - prefer quote-level, fallback to RFQ-level, NEVER use hardcoded values
      const departureAirport = quote.route?.departure?.airport || rfqDepartureAirport;
      const arrivalAirport = quote.route?.arrival?.airport || rfqArrivalAirport;
      const departureDate = quote.route?.departure?.date || rfqDepartureDate;

      // Validate that we have airport data (should have been validated earlier, but double-check)
      if (!departureAirport?.icao || !arrivalAirport?.icao) {
        this.logger.error('Missing airport data in quote transformation', {
          quoteId: quote.quote?.id || quote.id,
          hasQuoteDeparture: !!quote.route?.departure?.airport,
          hasRfqDeparture: !!rfqDepartureAirport,
          hasQuoteArrival: !!quote.route?.arrival?.airport,
          hasRfqArrival: !!rfqArrivalAirport,
        });
        // If we still don't have airport data after all fallbacks, throw error instead of using hardcoded values
        throw new Error(`Missing required airport data for quote ${quote.quote?.id || quote.id || index}`);
      }

      // Assemble the RFQFlight object with extracted data from API response only
      return {
        id: `flight-${quote.quote?.id || quote.id || index + 1}`,
        quoteId: quote.quote?.id || quote.id || `quote-${index + 1}`,
        departureAirport: {
          icao: departureAirport.icao,
          name: departureAirport.name || quote.route?.departure?.name,
          city: departureAirport.city || quote.route?.departure?.city,
        },
        arrivalAirport: {
          icao: arrivalAirport.icao,
          name: arrivalAirport.name || quote.route?.arrival?.name,
          city: arrivalAirport.city || quote.route?.arrival?.city,
        },
        departureDate: departureDate || new Date().toISOString().split('T')[0],
        departureTime: quote.schedule?.departureTime ? new Date(quote.schedule.departureTime).toTimeString().slice(0, 5) : undefined,
        flightDuration: this.formatDuration(quote.schedule?.flightDuration),
        ...aircraft,
        aircraftImageUrl: undefined,
        operatorName: quote.seller?.companyName || quote.operator?.name || quote.operator_name || 'Unknown Operator',
        operatorRating: quote.seller?.rating || quote.operator?.rating,
        operatorEmail: quote.seller?.email || quote.operator?.email,
        ...pricing,
        amenities,
        rfqStatus,
        lastUpdated: quote.updated_at || quote.received_at || new Date().toISOString(),
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
