/**
 * Avinode MCP Server Types
 */

export interface FlightSearchParams {
  departure_airport: string;
  departure_date: string;
  departure_time?: string;
  arrival_airport: string;
  passengers: number;
  aircraft_types?: string[];
  max_budget?: number;
  min_operator_rating?: number;
}

export interface EmptyLegSearchParams {
  departure_airport: string;
  arrival_airport: string;
  date_range: {
    from: string;
    to: string;
  };
  passengers: number;
  max_price?: number;
  aircraft_types?: string[];
}

export interface CreateRFPParams {
  flight_details: FlightSearchParams;
  operator_ids: string[];
  message?: string;
  quote_deadline?: string;
  client_reference?: string;
}

export interface GetRFPStatusParams {
  rfp_id: string;
}

export interface CreateWatchParams {
  type: 'rfp' | 'empty_leg' | 'price_alert';
  rfp_id?: string;
  empty_leg_id?: string;
  notifications: {
    on_new_quote?: boolean;
    on_price_change?: boolean;
    on_deadline_approaching?: boolean;
  };
  webhook_url?: string;
}

export interface SearchAirportsParams {
  query: string;
  country?: string;
}

// ============================================================================
// New Tool Parameter Interfaces for Deep Link Workflow
// ============================================================================

/**
 * Trip Segment - Individual leg of a multi-segment trip
 * Used for multi-city trips (3+ segments) or when each segment needs different passenger counts
 *
 * @example
 * // NYC → London → Paris → NYC
 * const segments: TripSegment[] = [
 *   { departure_airport: 'KJFK', arrival_airport: 'EGLL', departure_date: '2026-02-15', passengers: 6 },
 *   { departure_airport: 'EGLL', arrival_airport: 'LFPG', departure_date: '2026-02-18', passengers: 6 },
 *   { departure_airport: 'LFPG', arrival_airport: 'KJFK', departure_date: '2026-02-22', passengers: 6 }
 * ]
 */
export interface TripSegment {
  /** Departure airport ICAO code (e.g., KJFK, EGLL) */
  departure_airport: string;
  /** Arrival airport ICAO code */
  arrival_airport: string;
  /** Departure date in YYYY-MM-DD format */
  departure_date: string;
  /** Optional departure time in HH:MM format */
  departure_time?: string;
  /** Number of passengers for this segment */
  passengers: number;
}

/**
 * Trip Type - Categorizes the trip based on segment count
 */
export type TripType = 'single_leg' | 'round_trip' | 'multi_city';

/**
 * Create Trip Parameters
 * Creates a trip container in Avinode and returns a deep link for manual operator selection
 *
 * Supports three modes:
 * 1. Legacy flat params (backward compatible) - single-leg or round-trip
 * 2. segments[] array - multi-city trips with N segments
 * 3. Legacy with return_passengers - round-trip with different pax on return
 *
 * @example
 * // Single-leg (legacy)
 * { departure_airport: 'KJFK', arrival_airport: 'EGLL', departure_date: '2026-02-15', passengers: 6 }
 *
 * @example
 * // Round-trip with different return passengers
 * { departure_airport: 'KJFK', arrival_airport: 'EGLL', departure_date: '2026-02-15',
 *   return_date: '2026-02-20', passengers: 6, return_passengers: 4 }
 *
 * @example
 * // Multi-city with segments[]
 * { segments: [
 *     { departure_airport: 'KJFK', arrival_airport: 'EGLL', departure_date: '2026-02-15', passengers: 6 },
 *     { departure_airport: 'EGLL', arrival_airport: 'LFPG', departure_date: '2026-02-18', passengers: 6 },
 *     { departure_airport: 'LFPG', arrival_airport: 'KJFK', departure_date: '2026-02-22', passengers: 6 }
 *   ]
 * }
 */
export interface CreateTripParams {
  // ========== Legacy params (backward compatible) ==========
  /** Departure airport ICAO code - required for legacy mode */
  departure_airport?: string;
  /** Arrival airport ICAO code - required for legacy mode */
  arrival_airport?: string;
  /** Departure date in YYYY-MM-DD format - required for legacy mode */
  departure_date?: string;
  /** Optional departure time in HH:MM format */
  departure_time?: string;
  /** Return date for round-trip in YYYY-MM-DD format */
  return_date?: string;
  /** Return time in HH:MM format */
  return_time?: string;
  /** Number of passengers - required for legacy mode */
  passengers?: number;
  /** Number of passengers on return leg (defaults to outbound passengers if not specified) */
  return_passengers?: number;

  // ========== Multi-segment params (new) ==========
  /** Array of flight segments for multi-city trips */
  segments?: TripSegment[];

  // ========== Common params ==========
  /** Optional aircraft category preference */
  aircraft_category?: 'light' | 'midsize' | 'heavy' | 'ultra-long-range';
  /** Optional special requirements or notes */
  special_requirements?: string;
  /** Optional internal reference ID for tracking */
  client_reference?: string;
}

/**
 * Get RFQ Parameters
 * Retrieves details of a Request for Quote or all RFQs for a Trip ID
 * - RFQ ID (arfq-*): Returns single RFQ with quotes
 * - Trip ID (atrip-*): Returns all RFQs for that trip
 */
export interface GetRFQParams {
  rfq_id: string;
}

/**
 * Get Quote Parameters
 * Retrieves details of a specific quote
 */
export interface GetQuoteParams {
  quote_id: string;
}

/**
 * Cancel Trip Parameters
 * Cancels an active trip
 */
export interface CancelTripParams {
  trip_id: string;
  reason?: string;
}

/**
 * Send Trip Message Parameters
 * Sends a message to operators in the trip thread
 */
export interface SendTripMessageParams {
  trip_id: string;
  message: string;
  recipient_type?: 'all_operators' | 'specific_operator';
  operator_id?: string;
}

/**
 * Get Trip Messages Parameters
 * Retrieves message history for a trip or request
 * Supports both trip-level and request-specific message retrieval
 * - trip_id: Use for trip-level messages (GET /tripmsgs/{tripId})
 * - request_id: Use for request-specific messages (GET /tripmsgs/{requestId}/chat)
 */
export interface GetTripMessagesParams {
  trip_id?: string;
  request_id?: string;
  limit?: number;
  since?: string;
}

export interface FlightResult {
  id: string;
  operator: {
    id: string;
    name: string;
    rating: number;
  };
  aircraft: {
    type: string;
    model: string;
    registration: string;
    capacity: number;
    yearBuilt?: number;
    amenities?: string[];
  };
  schedule: {
    departure_time: string;
    arrival_time: string;
    duration_minutes: number;
  };
  pricing: {
    estimated_total: number;
    currency: string;
    price_per_hour?: number;
  };
  availability: {
    status: 'available' | 'pending' | 'unavailable';
    valid_until?: string;
  };
}

export interface EmptyLegResult extends FlightResult {
  empty_leg_id: string;
  discount_percentage?: number;
  original_price?: number;
}

export interface RFPResponse {
  rfp_id: string;
  status: 'sent' | 'in_progress' | 'completed';
  created_at: string;
  operators_contacted: number;
  quote_deadline?: string;
  watch_url?: string;
}

export interface Quote {
  quote_id: string;
  operator: {
    id: string;
    name: string;
    rating: number;
  };
  aircraft: {
    type: string;
    model: string;
    registration: string;
  };
  pricing: {
    total: number;
    currency: string;
    breakdown?: {
      base_price: number;
      fuel_surcharge?: number;
      taxes_fees?: number;
    };
  };
  terms?: {
    cancellation_policy?: string;
    payment_terms?: string;
  };
  valid_until: string;
  notes?: string;
  received_at: string;
}

export interface Airport {
  icao: string;
  iata?: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/**
 * Aircraft Photo
 * Returned when tailphotos or typephotos query params are enabled
 */
export interface AircraftPhoto {
  url: string;
  caption?: string;
  type?: 'exterior' | 'interior' | 'cabin' | 'cockpit' | 'galley' | 'lavatory';
  width?: number;
  height?: number;
  thumbnail_url?: string;
}

// ============================================================================
// Response Interfaces for New Tools
// ============================================================================

/**
 * Create Trip Response
 * Enhanced to support multi-segment trips
 */
export interface CreateTripResponse {
  trip_id: string;
  deep_link: string;
  search_link: string;
  status: 'created' | 'pending';
  created_at: string;
  /** Type of trip: single_leg, round_trip, or multi_city */
  trip_type: TripType;
  /** Number of segments in this trip */
  segment_count: number;
  /** Legacy route format (for backward compatibility with single-leg/round-trip) */
  route?: {
    departure: {
      airport: string;
      date: string;
      time?: string;
    };
    arrival: {
      airport: string;
    };
    return?: {
      date: string;
      time?: string;
    };
  };
  /** New segments array (for multi-city trips) */
  segments?: TripSegment[];
  passengers: number;
}

/**
 * RFQ Details Response
 */
export interface RFQDetailsResponse {
  rfq_id: string;
  trip_id: string;
  status: 'pending' | 'quoted' | 'declined' | 'expired' | 'cancelled';
  created_at: string;
  quote_deadline?: string;
  route: {
    departure: {
      airport: string;
      name?: string;
      date: string;
      time?: string;
    };
    arrival: {
      airport: string;
      name?: string;
    };
  };
  passengers: number;
  quotes_received: number;
  quotes: Quote[];
  operators_contacted: number;
  deep_link: string;
  // Timestamp fields (when timestamps=true)
  updated_by_buyer?: string;
  latest_updated_date_by_seller?: string;
  // Photo arrays (when tailphotos/typephotos=true)
  aircraft_photos?: AircraftPhoto[];
  type_photos?: AircraftPhoto[];
}

/**
 * Quote Details Response
 */
export interface QuoteDetailsResponse {
  quote_id: string;
  rfq_id: string;
  trip_id: string;
  status: 'pending' | 'received' | 'accepted' | 'rejected' | 'expired' | 'counter_offer';
  operator: {
    id: string;
    name: string;
    rating: number;
    contact?: {
      name: string;
      email?: string;
      phone?: string;
    };
  };
  aircraft: {
    type: string;
    model: string;
    registration: string;
    capacity: number;
    year_built?: number;
    amenities?: string[];
    photos?: AircraftPhoto[];
    type_photos?: AircraftPhoto[];
  };
  pricing: {
    base_price: number;
    taxes?: number;
    fees?: number;
    fuel_surcharge?: number;
    total: number;
    currency: string;
    breakdown?: Record<string, number>;
  };
  availability: {
    confirmed: boolean;
    outbound: boolean;
    return?: boolean;
    notes?: string;
  };
  valid_until: string;
  created_at: string;
  notes?: string;
}

/**
 * Cancel Trip Response
 */
export interface CancelTripResponse {
  trip_id: string;
  status: 'cancelled';
  cancelled_at: string;
  reason?: string;
}

/**
 * Trip Message
 */
export interface TripMessage {
  message_id: string;
  trip_id: string;
  sender: {
    id: string;
    name: string;
    company?: string;
    type: 'buyer' | 'seller' | 'system';
  };
  content: string;
  sent_at: string;
  read: boolean;
}

/**
 * Send Message Response
 */
export interface SendMessageResponse {
  message_id: string;
  trip_id: string;
  status: 'sent' | 'pending' | 'failed';
  sent_at: string;
  recipient_count: number;
}

/**
 * Get Messages Response
 */
export interface GetMessagesResponse {
  trip_id: string;
  messages: TripMessage[];
  total_count: number;
  has_more: boolean;
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
  tailPhotoUrl?: string;
  operatorName: string;
  operatorRating?: number;
  operatorEmail?: string;
  totalPrice: number;
  currency: string;
  priceBreakdown?: {
    basePrice: number;
    fuelSurcharge?: number;
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
  aircraftCategory?: string;
  hasMedical?: boolean;
  hasPackage?: boolean;
  avinodeDeepLink?: string;
  /** Message ID for retrieving specific operator messages (from webhook events) */
  messageId?: string;
}

// ============================================================================
// Empty Leg Watch Types (ONEK-147, ONEK-148)
// ============================================================================

/**
 * Create Empty Leg Watch Parameters
 * Creates a watch for empty leg flights on a specific route
 * @see ONEK-147
 */
export interface CreateEmptyLegWatchParams {
  /** Departure airport ICAO code */
  departure_airport: string;
  /** Arrival airport ICAO code */
  arrival_airport: string;
  /** Start date of the watch period (YYYY-MM-DD) */
  date_range_start: string;
  /** End date of the watch period (YYYY-MM-DD, up to 90 days from start) */
  date_range_end: string;
  /** Number of passengers */
  passengers: number;
  /** Optional maximum price threshold in USD */
  max_price?: number;
  /** Optional aircraft category filter */
  aircraft_categories?: ('light' | 'midsize' | 'heavy' | 'ultra-long-range')[];
  /** Optional notification preferences */
  notification_email?: string;
}

/**
 * Empty Leg Watch Response
 */
export interface EmptyLegWatchResponse {
  watch_id: string;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  departure_airport: string;
  arrival_airport: string;
  date_range: {
    start: string;
    end: string;
  };
  passengers: number;
  max_price?: number;
  aircraft_categories?: string[];
  created_at: string;
  expires_at: string;
  matches_count: number;
}

/**
 * Empty Leg Match
 * Represents a matching empty leg flight for a watch
 * @see ONEK-148
 */
export interface EmptyLegMatch {
  match_id: string;
  watch_id: string;
  empty_leg_id: string;
  /** Route details */
  departure: {
    airport: string;
    name?: string;
    city?: string;
    date: string;
    time?: string;
  };
  arrival: {
    airport: string;
    name?: string;
    city?: string;
  };
  /** Pricing */
  price: number;
  currency: string;
  discount_percentage?: number;
  regular_price?: number;
  /** Aircraft details */
  aircraft: {
    type: string;
    model: string;
    category: string;
    capacity: number;
    registration?: string;
  };
  /** Operator details */
  operator: {
    id: string;
    name: string;
    rating?: number;
  };
  /** Status */
  viewed: boolean;
  interested: boolean;
  matched_at: string;
  valid_until?: string;
  deep_link?: string;
}

/**
 * Get Empty Leg Watch Matches Response
 */
export interface GetEmptyLegMatchesResponse {
  watch_id: string;
  matches: EmptyLegMatch[];
  total_count: number;
  unviewed_count: number;
}

/**
 * Update Empty Leg Watch Parameters
 */
export interface UpdateEmptyLegWatchParams {
  watch_id: string;
  /** Pause or resume the watch */
  status?: 'active' | 'paused';
  /** Update max price threshold */
  max_price?: number;
  /** Update notification email */
  notification_email?: string;
}

/**
 * Mark Empty Leg Match Parameters
 */
export interface MarkEmptyLegMatchParams {
  match_id: string;
  /** Mark as viewed */
  viewed?: boolean;
  /** Mark as interested */
  interested?: boolean;
}
