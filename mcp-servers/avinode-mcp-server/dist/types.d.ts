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
//# sourceMappingURL=types.d.ts.map