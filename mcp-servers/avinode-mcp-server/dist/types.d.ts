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
/**
 * Create Trip Parameters
 * Creates a trip container in Avinode and returns a deep link for manual operator selection
 */
export interface CreateTripParams {
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    departure_time?: string;
    return_date?: string;
    return_time?: string;
    passengers: number;
    aircraft_category?: 'light' | 'midsize' | 'heavy' | 'ultra-long-range';
    special_requirements?: string;
    client_reference?: string;
}
/**
 * Get RFQ Parameters
 * Retrieves details of a Request for Quote
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
 * Retrieves message history for a trip
 */
export interface GetTripMessagesParams {
    trip_id: string;
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
 * Create Trip Response
 */
export interface CreateTripResponse {
    trip_id: string;
    deep_link: string;
    search_link: string;
    status: 'created' | 'pending';
    created_at: string;
    route: {
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
//# sourceMappingURL=types.d.ts.map