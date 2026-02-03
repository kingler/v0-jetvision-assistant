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
 * Extract numeric ID from Avinode identifiers that may contain prefixes.
 */
function extractNumericId(id: string): string {
  if (!id.startsWith('arfq-') && !id.startsWith('atrip-')) {
    return id;
  }

  const match = id.match(/^(?:arfq|atrip)-(.+)$/);
  if (!match || !match[1]) {
    throw new Error(
      `Failed to extract numeric ID from identifier: "${id}". Expected format: "arfq-<id>" or "atrip-<id>"`
    );
  }

  const numericId = match[1].trim();
  if (!numericId) {
    throw new Error(`Extracted numeric ID is empty from identifier: "${id}".`);
  }

  if (!/\d/.test(numericId)) {
    throw new Error(
      `Extracted numeric ID contains no numeric characters: "${numericId}" from identifier: "${id}".`
    );
  }

  return numericId;
}

type AvinodeCancelReason = 'BY_CLIENT' | 'CHANGED' | 'BOOKED' | 'OTHER';

function normalizeCancelReason(reason?: string): AvinodeCancelReason | undefined {
  if (!reason) {
    return undefined;
  }

  const trimmed = reason.trim();
  if (!trimmed) {
    return undefined;
  }

  const upper = trimmed.toUpperCase();
  if (upper === 'BY_CLIENT' || upper === 'CHANGED' || upper === 'BOOKED' || upper === 'OTHER') {
    return upper as AvinodeCancelReason;
  }

  if (upper.includes('CLIENT')) {
    return 'BY_CLIENT';
  }
  if (upper.includes('BOOK')) {
    return 'BOOKED';
  }
  if (upper.includes('CHANGE')) {
    return 'CHANGED';
  }

  return 'OTHER';
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
  /** Aircraft tail number (registration) - maps to aircraft.registration in API */
  tailNumber?: string;
  /** Year aircraft was manufactured - maps to aircraft.year_built in API */
  yearOfManufacture?: number;
  /** Maximum passenger capacity - maps to aircraft.capacity in API */
  passengerCapacity: number;
  /** Aircraft photo URL - retrieved via tailphotos=true query param */
  tailPhotoUrl?: string;
  operatorName: string;
  operatorRating?: number;
  operatorEmail?: string;
  /** Total price - maps to pricing.total in Avinode API */
  totalPrice: number;
  /** Currency code (ISO 4217) - maps to pricing.currency in API */
  currency: string;
  /** Price breakdown - maps to pricing.breakdown in API */
  priceBreakdown?: {
    /** Base charter price - maps to pricing.base_price */
    basePrice: number;
    /** Fuel surcharge - maps to pricing.fuel_surcharge */
    fuelSurcharge?: number;
    /** Tax amount - maps to pricing.taxes */
    taxes: number;
    /** Additional fees - maps to pricing.fees */
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
  /** Aircraft category (e.g., "Heavy jet", "Light jet") - maps to aircraftCategory.name in API */
  aircraftCategory?: string;
  /** Whether medical equipment is available */
  hasMedical?: boolean;
  /** Whether package/cargo transport is available */
  hasPackage?: boolean;
  /** Deep link to view this flight in Avinode marketplace - maps to actions.viewInAvinode.href */
  avinodeDeepLink?: string;
  /**
   * Leg type for round-trip proposals
   * - 'outbound': First leg (departure to destination)
   * - 'return': Return leg (destination back to origin)
   * Default: 'outbound' for backward compatibility
   */
  legType?: 'outbound' | 'return';
  /**
   * Leg sequence number for multi-leg trips
   * - 1: First leg (outbound)
   * - 2: Second leg (return)
   * Used for ordering and grouping in proposals
   */
  legSequence?: number;
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
      const response = await this.client.post('/rfqs', params);
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
      const response = await this.client.get(`/rfqs/${rfpId}/status`);
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
      const response = await this.client.get(`/rfqs/${rfpId}/quotes`);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Cancel an active RFQ/trip in Avinode.
   */
  async cancelTrip(params: { trip_id: string; reason?: string }) {
    const apiId = extractNumericId(params.trip_id);
    const normalizedReason = normalizeCancelReason(params.reason);
    const messageToSeller = params.reason?.trim() || undefined;
    try {
      this.logger.info('Cancelling RFQ via Avinode API', {
        trip_id: params.trip_id,
        api_id: apiId,
      });
      const response = await this.client.put(`/rfqs/${apiId}/cancel`, {
        reason: normalizedReason,
        messageToSeller,
      });
      this.logger.info('Avinode cancel response received', {
        trip_id: params.trip_id,
        status: response.status,
      });
      return {
        trip_id: params.trip_id,
        status: 'cancelled',
        cancelled_at: response.data?.cancelled_at || new Date().toISOString(),
        reason: params.reason,
      };
    } catch (error) {
      const axiosError = error as AxiosError | undefined;
      const message = error instanceof Error ? error.message : '';
      if (axiosError?.response?.status === 404 || message.toLowerCase().includes('resource not found')) {
        try {
          this.logger.warn('RFQ cancel not found, attempting trip cancel', {
            trip_id: params.trip_id,
            api_id: apiId,
          });
          const tripResponse = await this.client.put(`/trips/${apiId}/cancel`, {
            reason: normalizedReason,
            messageToSeller,
          });
          this.logger.info('Avinode trip cancel response received', {
            trip_id: params.trip_id,
            status: tripResponse.status,
          });
          return {
            trip_id: params.trip_id,
            status: 'cancelled',
            cancelled_at: tripResponse.data?.cancelled_at || new Date().toISOString(),
            reason: params.reason,
          };
        } catch (tripError) {
          const tripAxiosError = tripError as AxiosError | undefined;
          this.logger.error('Avinode trip cancel failed', {
            trip_id: params.trip_id,
            status: tripAxiosError?.response?.status,
            data: tripAxiosError?.response?.data,
          });
          throw this.sanitizeError(tripError);
        }
      }
      this.logger.error('Avinode cancel failed', {
        trip_id: params.trip_id,
        status: axiosError?.response?.status,
        data: axiosError?.response?.data,
      });
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get RFQ details by ID or all RFQs for a trip identifier
   * 
   * PRIMARY PATTERN (per test script): For Trip IDs, use GET /trips/{tripId} -> extract data.rfqs[]
   * - Trip ID (atrip-*, alphanumeric like B22E7Z): GET /trips/{tripId} - Returns trip with embedded rfqs[] array
   * - RFQ ID (arfq-*): GET /rfqs/{id} - Returns single RFQ object
   * 
   * @param id - The RFQ or Trip identifier (e.g., arfq-12345678, atrip-12345678, B22E7Z, QQ263P, or numeric ID)
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
    // Handle different ID formats - extract numeric ID if prefixed
    // For IDs like QQ263P, B22E7Z, use as-is (Avinode API accepts various formats)
    let apiId = id;
    const isTripId = id.startsWith('atrip-');
    const isRfqId = id.startsWith('arfq-');
    
    if (isTripId || isRfqId) {
      // Extract numeric ID from prefixed format (handles IDs with hyphens like "atrip-123-456")
      const match = id.match(/^(?:arfq|atrip)-(.+)$/);
      if (match && match[1]) {
        apiId = match[1].trim();
      }
    }
    // For other formats (like QQ263P, B22E7Z), use the ID as-is

    // Default query parameters for comprehensive data
    const defaultParams = {
      taildetails: true,
      typedetails: true,
      timestamps: true,
      tailphotos: true,
      typephotos: true,
      ...options,
    };

    try {
      // PRIMARY PATTERN: For alphanumeric Trip IDs, use GET /rfqs/{tripId} directly
      // This returns full RFQ objects with segments and sellerLift data
      // Individual GET /rfqs/{numericId} calls often return NOT_FOUND
      if (isTripId || (!isRfqId && /^[A-Z0-9]+$/.test(apiId))) {
        // Alphanumeric IDs (like B22E7Z, T68XYN) are Trip IDs
        this.logger.debug('Using GET /rfqs/{tripId} pattern for Trip ID', { id, apiId });

        try {
          // Use GET /rfqs/{tripId} which returns full RFQ objects directly
          const response = await this.client.get(`/rfqs/${apiId}`, {
            params: defaultParams,
          });

          const rfqData = response.data?.data ?? response.data;

          // Handle array response (multiple RFQs for trip)
          if (Array.isArray(rfqData)) {
            this.logger.info('Fetched RFQs via /rfqs/{tripId}', {
              tripId: apiId,
              rfqCount: rfqData.length,
              hasSegments: rfqData[0]?.segments?.length > 0,
              hasSellerLift: Array.isArray(rfqData[0]?.sellerLift),
            });
            return rfqData;
          }

          // Handle single RFQ response
          if (rfqData && typeof rfqData === 'object') {
            this.logger.info('Fetched single RFQ via /rfqs/{tripId}', {
              tripId: apiId,
              hasSegments: rfqData.segments?.length > 0,
              hasSellerLift: Array.isArray(rfqData.sellerLift),
            });
            return [rfqData];
          }

          this.logger.warn('Unexpected response from /rfqs/{tripId}', { tripId: apiId });
          return [];
        } catch (rfqError: any) {
          // Fallback to /trips/{tripId} if /rfqs fails
          this.logger.warn('GET /rfqs/{tripId} failed, attempting /trips fallback', {
            id,
            apiId,
            error: rfqError?.message,
            status: rfqError?.response?.status,
          });

          try {
            const tripResponse = await this.client.get(`/trips/${apiId}`);
            const tripPayload = tripResponse.data?.data ?? tripResponse.data;
            const tripRfqRefs = tripPayload?.rfqs || [];

            if (!Array.isArray(tripRfqRefs) || tripRfqRefs.length === 0) {
              this.logger.warn('Trip response has no rfqs array', { id, apiId });
              return [];
            }

            // Return the embedded RFQ data from trip response (contains segments, sellerLift, etc.)
            this.logger.info('Using embedded RFQ data from trip response', {
              tripId: apiId,
              rfqCount: tripRfqRefs.length,
            });
            return tripRfqRefs;
          } catch (tripError: any) {
            this.logger.error('Both /rfqs/{tripId} and /trips/{tripId} failed', {
              id,
              apiId,
              rfqError: rfqError?.message,
              tripError: tripError?.message,
            });
            throw this.sanitizeError(rfqError);
          }
        }
      } else {
        // For RFQ IDs (arfq-* or single RFQ lookups), use /rfqs/{id} endpoint
        this.logger.debug('Using GET /rfqs/{id} pattern for RFQ ID', { id, apiId });
        
        const response = await this.client.get(`/rfqs/${apiId}`, {
          params: defaultParams,
        });

        // Extract RFQs from response (handles both single RFQ and array responses)
        return this.extractRfqsFromResponse(response.data);
      }
    } catch (error: any) {
      const status = error?.response?.status;

      // Legacy fallback: if /rfqs fails with 404, try /trips (for backward compatibility)
      if ((status === 404 || status === 400) && !isTripId) {
        try {
          this.logger.debug('GET /rfqs/{id} failed, attempting /trips fallback', { id, apiId });
          const tripResponse = await this.client.get(`/trips/${apiId}`);
          const tripPayload = tripResponse.data?.data ?? tripResponse.data;
          const tripRfqRefs = tripPayload?.rfqs || tripPayload?.data?.rfqs;

          if (Array.isArray(tripRfqRefs) && tripRfqRefs.length > 0) {
            // Return embedded RFQ data directly (contains segments, sellerLift, etc.)
            // Individual RFQ fetches often fail with NOT_FOUND
            this.logger.info('Using embedded RFQ data from trip fallback', {
              id,
              apiId,
              rfqCount: tripRfqRefs.length,
            });
            return tripRfqRefs;
          }
        } catch (tripError) {
          // If fallback also fails, throw the original error
          throw this.sanitizeError(error);
        }
      }

      throw this.sanitizeError(error);
    }
  }

  /**
   * Extract RFQs from API response (handles various response structures)
   * 
   * @param responseData - The response data from the API
   * @returns Array of RFQs or single RFQ object
   */
  private extractRfqsFromResponse(responseData: any): any {
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

    // Default: treat as single RFQ if it's an object, or wrap in array if needed
    return responseData;
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

      // Log raw response structure for debugging prod vs dev differences
      this.logger.info('Avinode API raw response structure:', {
        hasData: !!response.data,
        hasNestedData: !!response.data?.data,
        tripDataKeys: tripData ? Object.keys(tripData) : [],
        hasActions: !!tripData?.actions,
        actionKeys: tripData?.actions ? Object.keys(tripData.actions) : [],
        hasSearchInAvinode: !!tripData?.actions?.searchInAvinode,
        searchInAvinodeHref: tripData?.actions?.searchInAvinode?.href,
      });

      // Extract the searchInAvinode deep link from actions
      const searchDeepLink = tripData?.actions?.searchInAvinode?.href;
      const viewDeepLink = tripData?.actions?.viewInAvinode?.href;

      // Log successful trip creation with deep link status
      this.logger.info('Trip created successfully', {
        externalTripId,
        tripId: tripData?.tripId || tripData?.id,
        deepLink: searchDeepLink,
        deepLinkMissing: !searchDeepLink,
        viewLink: viewDeepLink,
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
    rfqs?: any[];
    total_rfqs?: number;
    total_quotes?: number;
  }> {
    try {
      // Fetch RFQ data from Avinode API
      const rfqData = await this.getRFQ(rfqId);

      const rfqItems = Array.isArray(rfqData) ? rfqData : [rfqData];

      if (rfqItems.length === 0) {
        const fallbackAirport = { icao: 'N/A', name: 'Unknown', city: 'Unknown' };
        return {
          rfq_id: rfqId,
          trip_id: rfqId,
          status: 'pending',
          created_at: new Date().toISOString(),
          quote_deadline: new Date().toISOString(),
          departure_airport: fallbackAirport,
          arrival_airport: fallbackAirport,
          departure_date: new Date().toISOString().split('T')[0],
          passengers: 0,
          operators_contacted: 0,
          flights_received: 0,
          flights: [],
          deep_link: '',
          rfqs: [],
          total_rfqs: 0,
          total_quotes: 0,
        };
      }

      const flights: RFQFlight[] = [];
      const rfqs: any[] = [];

      for (const rfqItem of rfqItems) {
        if (!rfqItem) {
          continue;
        }

        rfqs.push(rfqItem);

        const lifts = rfqItem.lifts || rfqItem.sellerLift || [];
        const quoteIds = Array.isArray(lifts)
          ? lifts.flatMap((lift: any) => {
              const quotes = lift?.links?.quotes || lift?.quotes || [];
              return quotes.map((quote: any) => quote.id || quote.quote_id).filter(Boolean);
            })
          : [];

        if ((!rfqItem.quotes || rfqItem.quotes.length === 0) && quoteIds.length > 0) {
          const quoteDetails = await Promise.all(
            quoteIds.map(async (quoteId: string) => {
              try {
                return await this.fetchQuoteDetails(quoteId);
              } catch (error) {
                this.logger.warn('Failed to fetch quote details', {
                  quoteId,
                  error: error instanceof Error ? error.message : String(error),
                });
                return null;
              }
            })
          );

          rfqItem.quotes = quoteDetails.filter(Boolean);
        }

        const rfqItemId = rfqItem.rfq_id || rfqItem.id || rfqId;
        try {
          this.validateCriticalFields(rfqItem, rfqItemId);
        } catch (error) {
          this.logger.warn('Skipping RFQ with missing critical fields', {
            rfqId: rfqItemId,
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }

        const itemFlights = this.transformToRFQFlights(rfqItem);
        flights.push(...itemFlights);
      }

      // Derive trip_id using a simple sequential approach consistent with getRFQ
      // Priority: rfqData.trip_id > atrip- prefix > arfq- prefix > numeric ID > fallback extraction
      let tripId: string;
      
      const primaryRfq = rfqItems[0];

      // Step 1: Use trip_id from response data if present
      if (primaryRfq?.trip_id) {
        tripId = primaryRfq.trip_id;
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
      // Default: If no specific prefix, treat the rfqId as a direct Avinode ID for the trip_id
      else {
        tripId = rfqId;
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
        rfqs?: any[];
        total_rfqs?: number;
        total_quotes?: number;
      } = {
        rfq_id: this.getFieldWithFallback(
          'rfq_id',
          primaryRfq?.rfq_id,
          rfqId,
          rfqId
        ),
        trip_id: tripId,
        status: (flights.length >= 2 ? 'quotes_received' : 'pending') as 'pending' | 'quotes_received' | 'completed' | 'expired',
        created_at: this.getFieldWithFallback(
          'created_at',
          primaryRfq?.created_at,
          rfqId,
          new Date().toISOString()
        ),
        quote_deadline: this.getFieldWithFallback(
          'quote_deadline',
          primaryRfq?.quote_deadline,
          rfqId,
          new Date(Date.now() + 86400000).toISOString()
        ),
        departure_airport: (() => {
          const airport = this.extractRouteFromRfq(primaryRfq || {})?.departureAirport;
          return this.getFieldWithFallback(
            'departure_airport',
            airport ? { icao: airport.icao, name: airport.name || 'Unknown', city: airport.city || 'Unknown' } : undefined,
            rfqId,
            { icao: 'UNKNOWN', name: 'Unknown', city: 'Unknown' }
          );
        })(),
        arrival_airport: (() => {
          const airport = this.extractRouteFromRfq(primaryRfq || {})?.arrivalAirport;
          return this.getFieldWithFallback(
            'arrival_airport',
            airport ? { icao: airport.icao, name: airport.name || 'Unknown', city: airport.city || 'Unknown' } : undefined,
            rfqId,
            { icao: 'UNKNOWN', name: 'Unknown', city: 'Unknown' }
          );
        })(),
        departure_date: this.getFieldWithFallback(
          'departure_date',
          this.extractRouteFromRfq(primaryRfq || {})?.departureDate,
          rfqId,
          new Date().toISOString().split('T')[0]
        ),
        passengers: this.getFieldWithFallback(
          'passengers',
          primaryRfq?.passengers,
          rfqId,
          4
        ),
        operators_contacted: this.getFieldWithFallback(
          'operators_contacted',
          primaryRfq?.operators_contacted,
          rfqId,
          flights.length
        ),
        flights_received: flights.length,
        flights,
        deep_link: this.getFieldWithFallback(
          'deep_link',
          primaryRfq?.deep_link,
          rfqId,
          `${this.baseUrl}/marketplace/mvc/trips/selling/rfq?source=api&rfq=${rfqId}`
        ),
        rfqs,
        total_rfqs: rfqs.length,
        total_quotes: flights.length,
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
    const route = this.extractRouteFromRfq(rfqData);

    // Validate departure airport
    if (!route?.departureAirport) {
      missingFields.push('route.departure.airport');
    } else if (!route.departureAirport.icao) {
      missingFields.push('route.departure.airport.icao');
    }

    // Validate arrival airport
    if (!route?.arrivalAirport) {
      missingFields.push('route.arrival.airport');
    } else if (!route.arrivalAirport.icao) {
      missingFields.push('route.arrival.airport.icao');
    }

    // Validate departure date
    if (!route?.departureDate) {
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
    // Use the normalized route object from extractRouteFromRfq instead of accessing rfqData.route.departure
    // This handles both route.departure format and segments[] format from the API
    this.logger.debug('Critical fields validated successfully', {
      rfqId,
      departureAirport: route.departureAirport?.icao,
      arrivalAirport: route.arrivalAirport?.icao,
      departureDate: route.departureDate,
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

  private extractRouteFromRfq(rfqData: any): {
    departureAirport?: { icao: string; name?: string; city?: string };
    arrivalAirport?: { icao: string; name?: string; city?: string };
    departureDate?: string;
  } {
    const route = rfqData.route;
    if (route?.departure?.airport?.icao && route?.arrival?.airport?.icao && route?.departure?.date) {
      return {
        departureAirport: route.departure.airport,
        arrivalAirport: route.arrival.airport,
        departureDate: route.departure.date,
      };
    }

    const segments = Array.isArray(rfqData.segments) ? rfqData.segments : [];
    if (segments.length === 0) {
      return {};
    }

    const segment = segments[0];
    const startDetails = segment.startAirportDetails || segment.startAirport;
    const endDetails = segment.endAirportDetails || segment.endAirport;

    const normalizeAirport = (airport: any) => {
      if (!airport || !airport.icao) return undefined;
      return {
        icao: airport.icao,
        name: airport.name,
        city: airport.city,
      };
    };

    const departureDate =
      segment.dateTime?.date ||
      segment.departureDateTime?.dateTimeLocal?.split('T')[0] ||
      segment.departureDateTime?.dateTimeUTC?.split('T')[0];

    return {
      departureAirport: normalizeAirport(startDetails),
      arrivalAirport: normalizeAirport(endDetails),
      departureDate,
    };
  }

  private async fetchQuoteDetails(quoteId: string): Promise<any> {
    const response = await this.client.get(`/quotes/${quoteId}`, {
      params: {
        taildetails: true,
        typedetails: true,
        tailphotos: true,
        typephotos: true,
        quotebreakdown: true,
        latestquote: true,
      },
    });

    return response.data?.data ?? response.data;
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
    // 'quoted' = Response received with quote (Avinode: "Accepted")
    // 'declined' = Response received with decline (Avinode: "Declined")

    // Check sourcingDisplayStatus from sellerLiftData first (Avinode's primary status field)
    // Values: "Accepted", "Unanswered", "Declined"
    const sourcingStatus = quote.sellerLiftData?.sourcingDisplayStatus?.toLowerCase();
    if (sourcingStatus) {
      if (sourcingStatus === 'accepted') {
        // Check if quote is expired
        if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
          return 'expired';
        }
        return 'quoted';
      }
      if (sourcingStatus === 'declined') {
        return 'declined';
      }
      // 'unanswered' or any other status
      return 'unanswered';
    }

    // Fallback: check quote.status for backwards compatibility
    if (quote.status === 'quoted' && quote.validUntil && new Date(quote.validUntil) < new Date()) {
      return 'expired';
    }
    const hasResponse = quote.status === 'quoted' || quote.status === 'declined';
    return hasResponse
      ? (quote.status === 'quoted' ? 'quoted' : 'declined')
      : 'unanswered';
  }

  /**
   * Extract aircraft-related data from a quote
   * Provides default values for missing aircraft information
   *
   * Checks multiple sources:
   * - quote.aircraft (standard quote format)
   * - quote.lift (lift data)
   * - quote.sellerLiftData (from RFQ level, enriched by transformToRFQFlights)
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
    tailPhotoUrl?: string;
  } {
    // Check sellerLiftData (from RFQ level enrichment)
    const sellerLift = quote.sellerLiftData || {};

    return {
      aircraftType:
        quote.aircraft?.type ||
        quote.lift?.aircraftType ||
        sellerLift.aircraftType ||
        sellerLift.liftType ||
        'Unknown',
      aircraftModel:
        quote.aircraft?.model ||
        quote.lift?.aircraftSuperType ||
        sellerLift.aircraftSuperType ||
        sellerLift.aircraftModel ||
        'Unknown',
      tailNumber:
        quote.aircraft?.tailNumber ||
        quote.lift?.aircraftTail ||
        sellerLift.aircraftTail,
      yearOfManufacture: quote.aircraft?.yearOfManufacture || sellerLift.yearOfManufacture,
      passengerCapacity:
        quote.aircraft?.capacity ||
        quote.lift?.maxPax ||
        sellerLift.maxPax ||
        sellerLift.paxCapacity ||
        0,
      tailPhotoUrl:
        quote.aircraft?.tail_photo_url ||
        quote.aircraft?.tailPhotoUrl ||
        quote.tailPhotos?.[0]?.url ||
        quote.typePhotos?.[0]?.url ||
        quote.lift?.tailPhotos?.[0]?.url ||
        quote.lift?.typePhotos?.[0]?.url ||
        sellerLift.tailPhotos?.[0]?.url ||
        sellerLift.typePhotos?.[0]?.url,
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
    totalPrice: number;
    currency: string;
    priceBreakdown?: {
      basePrice: number;
      fuelSurcharge?: number;
      taxes: number;
      fees: number;
    };
    validUntil?: string;
  } {
    const sellerPrice = quote.sellerPrice || quote.sellerPriceWithoutCommission;

    // FIX: Extract price REGARDLESS of hasQuote status
    // For unanswered RFQs, Avinode may provide estimatedPrice (initial marketplace price)
    // This allows displaying the initial price before operators respond
    // Priority: sellerPrice > totalPrice > quote.totalPrice > pricing > estimatedPrice
    const totalPrice =
      sellerPrice?.price ||
      quote.totalPrice?.amount ||
      quote.quote?.totalPrice?.amount ||
      quote.pricing?.total ||
      quote.estimatedPrice?.amount ||
      quote.estimated_price?.amount ||
      // Also check sellerLiftData for price (may be nested in lift object)
      quote.sellerLiftData?.sellerPrice?.price ||
      quote.sellerLiftData?.estimatedPrice?.amount ||
      quote.sellerLiftData?.pricing?.total ||
      0;

    const currency =
      sellerPrice?.currency ||
      quote.totalPrice?.currency ||
      quote.quote?.totalPrice?.currency ||
      quote.pricing?.currency ||
      quote.estimatedPrice?.currency ||
      quote.estimated_price?.currency ||
      quote.sellerLiftData?.sellerPrice?.currency ||
      quote.sellerLiftData?.estimatedPrice?.currency ||
      'USD';

    return {
      totalPrice,
      currency,
      priceBreakdown: (hasQuote || totalPrice > 0) && quote.pricing ? {
        basePrice: quote.pricing.basePrice || 0,
        fuelSurcharge: quote.pricing.fuelSurcharge,
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

  private extractQuoteRoute(quote: any): {
    departureAirport?: { icao: string; name?: string; city?: string };
    arrivalAirport?: { icao: string; name?: string; city?: string };
    departureDate?: string;
    departureTime?: string;
    flightMinutes?: number;
  } {
    // Check for route object first (standard quote format)
    if (quote?.route?.departure?.airport?.icao && quote?.route?.arrival?.airport?.icao) {
      return {
        departureAirport: quote.route.departure.airport,
        arrivalAirport: quote.route.arrival.airport,
        departureDate: quote.route.departure.date,
      };
    }

    // Check for segments array (from RFQ level or quote level)
    const segments = Array.isArray(quote?.segments) ? quote.segments : [];
    if (segments.length === 0) {
      return {};
    }

    const segment = segments[0];
    const normalizeAirport = (airport: any) => {
      if (!airport || !airport.icao) return undefined;
      return {
        icao: airport.icao,
        name: airport.name,
        city: airport.city,
      };
    };

    // Extract airport info - check both startAirportDetails and startAirport patterns
    const departureAirport = normalizeAirport(segment.startAirportDetails || segment.startAirport);
    const arrivalAirport = normalizeAirport(segment.endAirportDetails || segment.endAirport);

    // Log for debugging if airports are missing
    if (!departureAirport?.icao || !arrivalAirport?.icao) {
      this.logger.debug('extractQuoteRoute: segment airport data', {
        hasStartAirportDetails: !!segment.startAirportDetails,
        hasStartAirport: !!segment.startAirport,
        hasEndAirportDetails: !!segment.endAirportDetails,
        hasEndAirport: !!segment.endAirport,
        startDetails: segment.startAirportDetails,
        startAirport: segment.startAirport,
      });
    }

    return {
      departureAirport,
      arrivalAirport,
      departureDate:
        segment.dateTime?.date ||
        segment.departureDateTime?.dateTimeLocal?.split('T')[0] ||
        segment.departureDateTime?.dateTimeUTC?.split('T')[0],
      departureTime:
        segment.dateTime?.time ||
        segment.departureDateTime?.dateTimeLocal?.split('T')[1]?.slice(0, 5),
      flightMinutes: segment.flightMinutes || segment.blockMinutes,
    };
  }

  /**
   * Transform Avinode RFQ data into RFQFlight array format
   * Assembles flight data from quotes/requests, delegating extraction to helper methods
   *
   * Each RFQ from Avinode represents one operator's response, containing:
   * - sellerCompany: operator information
   * - sellerLift[]: aircraft/lift options with links.quotes[] for quote references
   * - segments[]: route information
   *
   * @param rfqData - The RFQ data object from Avinode API
   * @returns Array of RFQFlight objects ready for UI display
   */
  private transformToRFQFlights(rfqData: any): RFQFlight[] {
    // IMPORTANT: Avinode API structure for RFQs:
    // - sellerLift[].links.quotes[] contains quote references
    // - sellerCompany contains operator info
    // - segments[] contains route info

    // Extract quote sources from various possible locations
    const quotesFromQuotes = Array.isArray(rfqData.quotes) ? rfqData.quotes : [];
    const quotesFromRequests = Array.isArray(rfqData.requests) ? rfqData.requests : [];
    const quotesFromResponses = Array.isArray(rfqData.responses) ? rfqData.responses : [];

    // Extract from sellerLift - this is where Avinode puts the operator's response data
    const sellerLifts = Array.isArray(rfqData.sellerLift) ? rfqData.sellerLift : [];
    const quotesFromSellerLift: any[] = [];

    for (const lift of sellerLifts) {
      // sellerLift contains aircraft/lift info and may have links.quotes references
      // Create a quote-like object from the lift data + sellerCompany
      const quoteRefs = lift?.links?.quotes || lift?.quotes || [];

      if (quoteRefs.length > 0) {
        // There are quote references - add them with lift and company context
        for (const quoteRef of quoteRefs) {
          quotesFromSellerLift.push({
            ...quoteRef,
            sellerLiftData: lift,
            sellerCompany: rfqData.sellerCompany,
            segments: rfqData.segments,
          });
        }
      } else {
        // No quote references, but we still have operator response data
        // Create a "pending" quote entry from the lift data
        quotesFromSellerLift.push({
          id: lift.id || `lift-${sellerLifts.indexOf(lift)}`,
          sellerLiftData: lift,
          sellerCompany: rfqData.sellerCompany,
          segments: rfqData.segments,
          status: 'unanswered', // No quote submitted yet
        });
      }
    }

    // If no lifts but we have sellerCompany, create a placeholder for this operator
    if (sellerLifts.length === 0 && rfqData.sellerCompany) {
      quotesFromSellerLift.push({
        id: rfqData.id || `rfq-pending`,
        sellerCompany: rfqData.sellerCompany,
        segments: rfqData.segments,
        status: 'unanswered',
      });
    }

    // Combine ALL quotes from ALL possible sources
    const allQuotesMap = new Map<string, any>();

    // Add quotes from all sources, using quote ID as key to prevent duplicates
    // IMPORTANT: Merge data when duplicates are found to preserve both sellerPrice and sellerLiftData
    [...quotesFromQuotes, ...quotesFromRequests, ...quotesFromResponses, ...quotesFromSellerLift].forEach((quote: any) => {
      const quoteId = quote.quote?.id || quote.id;
      if (quoteId) {
        if (allQuotesMap.has(quoteId)) {
          // Merge: combine existing quote with new data
          // This ensures sellerPrice from fetchQuoteDetails is merged with sellerLiftData from sellerLift
          const existing = allQuotesMap.get(quoteId);
          allQuotesMap.set(quoteId, {
            ...existing,
            ...quote,
            // Preserve sellerPrice if it exists in either
            sellerPrice: existing.sellerPrice || quote.sellerPrice,
            // Preserve sellerLiftData if it exists in either
            sellerLiftData: existing.sellerLiftData || quote.sellerLiftData,
            // Preserve sellerCompany if it exists in either
            sellerCompany: existing.sellerCompany || quote.sellerCompany,
          });
        } else {
          allQuotesMap.set(quoteId, quote);
        }
      } else {
        // If no ID, add with index-based key to preserve it
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
    const rfqRoute = this.extractRouteFromRfq(rfqData);
    const rfqDepartureAirport = rfqRoute?.departureAirport;
    const rfqArrivalAirport = rfqRoute?.arrivalAirport;
    const rfqDepartureDate = rfqRoute?.departureDate;

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
      const quoteRoute = this.extractQuoteRoute(quote);
      const departureAirport = quoteRoute.departureAirport || rfqDepartureAirport;
      const arrivalAirport = quoteRoute.arrivalAirport || rfqArrivalAirport;
      const departureDate = quoteRoute.departureDate || rfqDepartureDate;

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

      // Extract operator info - check sellerCompany first (from RFQ level), then quote level
      const sellerCompany = quote.sellerCompany;
      const operatorName =
        sellerCompany?.displayName ||
        quote.seller?.companyName ||
        quote.operator?.name ||
        quote.operator_name ||
        'Unknown Operator';

      const operatorEmail =
        sellerCompany?.contactInfo?.emails?.[0] ||
        quote.seller?.email ||
        quote.operator?.email;

      // Extract deep link from actions if available
      const viewInAvinodeHref = quote.actions?.viewInAvinode?.href ||
        quote.sellerLiftData?.actions?.viewInAvinode?.href;

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
        departureTime: quoteRoute.departureTime || (quote.schedule?.departureTime ? new Date(quote.schedule.departureTime).toTimeString().slice(0, 5) : undefined),
        flightDuration: this.formatDuration(
          quoteRoute.flightMinutes || quote.schedule?.flightDuration || quote.schedule?.duration_minutes
        ),
        ...aircraft,
        aircraftImageUrl: undefined,
        operatorName,
        operatorRating: quote.seller?.rating || quote.operator?.rating,
        operatorEmail,
        ...pricing,
        amenities,
        rfqStatus,
        lastUpdated: quote.updated_at || quote.received_at || quote.createdOn || new Date().toISOString(),
        responseTimeMinutes: quote.response_time_minutes,
        isSelected: false,
        avinodeDeepLink: viewInAvinodeHref,
      };
    });
  }

  /**
   * List trips from Avinode API
   * Falls back to empty array if API is unavailable
   *
   * @param options - Optional filters for the trip list
   * @returns Array of trip summaries with metadata about source
   */
  async listTrips(options?: {
    limit?: number;
    status?: 'all' | 'active' | 'completed';
  }): Promise<{
    trips: Array<{
      trip_id: string;
      route: string;
      departure_airport: string;
      arrival_airport: string;
      departure_date: string;
      passengers: number;
      status: string;
      deep_link?: string;
      quote_count?: number;
      created_at: string;
    }>;
    source: 'api' | 'database';
    total: number;
  }> {
    try {
      // Try Avinode API first
      const response = await this.client.get('/trips', {
        params: {
          limit: options?.limit || 20,
          ...(options?.status && options.status !== 'all' ? { status: options.status } : {}),
        },
      });

      // Transform API response to standard format
      const apiTrips = Array.isArray(response.data?.data) ? response.data.data : [];
      const trips = apiTrips.map((trip: any) => ({
        trip_id: trip.tripId || trip.id || '',
        route: `${trip.departure?.icao || 'N/A'} → ${trip.arrival?.icao || 'N/A'}`,
        departure_airport: trip.departure?.icao || '',
        arrival_airport: trip.arrival?.icao || '',
        departure_date: trip.departureDateTime || trip.departure_date || '',
        passengers: trip.passengers || trip.pax || 0,
        status: trip.status || 'unknown',
        deep_link: trip.actions?.searchInAvinode?.href || trip.deep_link,
        quote_count: trip.quoteCount || trip.rfqs?.length || 0,
        created_at: trip.created_at || trip.createdAt || new Date().toISOString(),
      }));

      return {
        trips,
        source: 'api',
        total: response.data?.meta?.total || trips.length,
      };
    } catch (error) {
      // API unavailable - return empty array (caller should use database fallback)
      this.logger.warn('Avinode API unavailable for listTrips, returning empty result', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        trips: [],
        source: 'api',
        total: 0,
      };
    }
  }

  /**
   * Send a chat message for an RFQ/request
   * Uses Avinode API: POST /tripmsgs/{requestId}/chat
   *
   * @param params - Message parameters including trip_id (used to find RFQ) or request_id, and message content
   * @returns Message delivery confirmation
   * @see https://developer.avinodegroup.com/docs/download-respond-rfq
   */
  async sendTripMessage(params: {
    trip_id: string;
    message: string;
    recipient_type?: 'all_operators' | 'specific_operator';
    operator_id?: string;
  }): Promise<{
    success: boolean;
    message_id: string;
    trip_id: string;
    sent_at: string;
  }> {
    try {
      // Avinode uses POST /tripmsgs/{requestId}/chat for sending messages
      // First, we need to get the RFQ ID from the trip
      // The trip_id might be the trip identifier or an RFQ ID directly

      let requestId = params.trip_id;

      // If trip_id doesn't look like an RFQ ID, try to get RFQs for the trip
      if (!params.trip_id.startsWith('arfq-')) {
        try {
          const tripData = await this.getRFQ(params.trip_id);
          const rfqs = Array.isArray(tripData) ? tripData : [tripData];
          if (rfqs.length > 0 && rfqs[0]?.id) {
            requestId = rfqs[0].id;
          }
        } catch (e) {
          // Use trip_id as-is if we can't get RFQs
          this.logger.warn('Could not get RFQ for trip, using trip_id directly', {
            trip_id: params.trip_id,
          });
        }
      }

      // Send chat message using the correct Avinode endpoint
      const response = await this.client.post(`/tripmsgs/${requestId}/chat`, {
        message: params.message,
      });

      return {
        success: true,
        message_id: response.data?.data?.id || response.data?.id || `msg-${Date.now()}`,
        trip_id: params.trip_id,
        sent_at: new Date().toISOString(),
      };
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get a specific trip message by ID
   * Uses Avinode API: GET /tripmsgs/{messageId}
   *
   * Note: Avinode doesn't have a "list all messages" endpoint.
   * Messages are received via webhooks (TripChatSeller, TripChatBuyer events)
   * and stored in the local database. This method fetches individual message details.
   *
   * @param params - Query parameters including message_id, trip_id, or request_id
   * @returns Message details or empty array if fetching from trip/request
   * @see https://developer.avinodegroup.com/docs/avinode-webhooks
   */
  async getTripMessages(params: {
    trip_id?: string;
    request_id?: string;
    message_id?: string;
    limit?: number;
    since?: string;
  }): Promise<{
    messages: Array<{
      id: string;
      content: string;
      sender_type: 'operator' | 'iso_agent' | 'system';
      sender_name?: string;
      sender_operator_id?: string;
      sender_iso_agent_id?: string;
      created_at: string;
      status?: 'sent' | 'delivered' | 'read' | 'failed';
    }>;
    total: number;
    trip_id?: string;
    request_id?: string;
  }> {
    try {
      // If a specific message_id is provided, fetch that message
      if (params.message_id) {
        const response = await this.client.get(`/tripmsgs/${params.message_id}`);
        const msg = response.data?.data || response.data;

        if (msg) {
          return {
            messages: [{
              id: msg.id || params.message_id,
              content: msg.message || msg.content || msg.text || '',
              sender_type: msg.senderType ||
                (msg.type?.includes('Seller') ? 'operator' : 'iso_agent'),
              sender_name: msg.senderName || msg.sender?.name || 'Unknown',
              sender_operator_id: msg.senderOperatorId,
              sender_iso_agent_id: msg.senderIsoAgentId,
              created_at: msg.createdAt || msg.created_at || new Date().toISOString(),
              status: 'delivered',
            }],
            total: 1,
            trip_id: params.trip_id,
            request_id: params.request_id,
          };
        }
      }

      // For trip_id or request_id, try to get trip details which may include chat info
      // Note: Avinode doesn't provide a direct "list messages" endpoint
      // Messages should be stored locally via webhooks
      const tripOrRequestId = params.trip_id || params.request_id;

      if (tripOrRequestId) {
        // Try to get trip/RFQ details which might include linked messages
        try {
          const tripData = await this.getRFQ(tripOrRequestId);
          const rfqs = Array.isArray(tripData) ? tripData : [tripData];

          // Extract any chat/message info from the RFQ data
          const messages: Array<{
            id: string;
            content: string;
            sender_type: 'operator' | 'iso_agent' | 'system';
            sender_name?: string;
            sender_operator_id?: string;
            sender_iso_agent_id?: string;
            created_at: string;
            status?: 'sent' | 'delivered' | 'read' | 'failed';
          }> = [];

          for (const rfq of rfqs) {
            // Check for chat/messages in the RFQ response
            const rfqMessages = rfq?.chat || rfq?.messages || rfq?.tripMessages || [];
            if (Array.isArray(rfqMessages)) {
              for (const msg of rfqMessages) {
                messages.push({
                  id: msg.id || `msg-${messages.length}`,
                  content: msg.message || msg.content || msg.text || '',
                  sender_type: msg.senderType ||
                    (msg.type?.includes('Seller') ? 'operator' : 'iso_agent'),
                  sender_name: msg.senderName || msg.sender?.name || 'Unknown',
                  sender_operator_id: msg.senderOperatorId,
                  sender_iso_agent_id: msg.senderIsoAgentId,
                  created_at: msg.createdAt || msg.created_at || new Date().toISOString(),
                  status: msg.status || 'delivered',
                });
              }
            }
          }

          return {
            messages,
            total: messages.length,
            trip_id: params.trip_id,
            request_id: params.request_id,
          };
        } catch (e) {
          // If we can't get trip data, return empty messages
          this.logger.warn('Could not get messages for trip/request', {
            trip_id: params.trip_id,
            request_id: params.request_id,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Return empty messages array - messages should come from webhooks/local DB
      return {
        messages: [],
        total: 0,
        trip_id: params.trip_id,
        request_id: params.request_id,
      };
    } catch (error) {
      throw this.sanitizeError(error);
    }
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
