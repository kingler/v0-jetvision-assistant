/**
 * Mock Avinode Client for MCP Server
 *
 * Provides realistic mock data for development and testing.
 * Data structures match the real Avinode API (TripRequestSellerResponse webhooks)
 * and the Supabase database schema (quotes table).
 *
 * @see lib/types/avinode-webhooks.ts - Real Avinode webhook types
 * @see lib/mock-data/avinode-webhook-payloads.ts - Realistic mock payloads
 * @see lib/types/supabase.ts - Database Quote schema
 */
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
export declare class MockAvinodeClient {
    private tripCounter;
    private quoteCounter;
    /**
     * Simulate API delay
     */
    private delay;
    /**
     * Search for available flights/aircraft (mock)
     */
    post<T = any>(endpoint: string, data: any): Promise<T>;
    /**
     * Get request (mock)
     */
    get<T = any>(endpoint: string, config?: any): Promise<T>;
    delete<T = any>(endpoint: string): Promise<T>;
    put<T = any>(endpoint: string, data: any): Promise<T>;
    /**
     * Mock flight search results with proper nested structure
     */
    private mockFlightSearch;
    /**
     * Mock empty leg search results
     */
    private mockEmptyLegSearch;
    /**
     * Mock RFP creation with proper Avinode structure
     */
    private mockCreateRFP;
    /**
     * Mock RFP status with quotes matching database schema
     */
    private mockGetRFPStatus;
    /**
     * Mock watch creation
     */
    private mockCreateWatch;
    /**
     * Mock airport search
     */
    private mockSearchAirports;
    /**
     * Generate mock aircraft with proper nested structure
     */
    private generateMockAircraft;
    /**
     * Generate mock quotes matching database schema
     */
    private generateMockQuotes;
    /**
     * Mock get RFQ details
     */
    private mockGetRFQ;
    /**
     * Mock create trip - returns trip ID and deep link
     */
    private mockCreateTrip;
    /**
     * Mock get quote details
     */
    private mockGetQuote;
    /**
     * Mock cancel trip
     */
    private mockCancelTrip;
    /**
     * Mock send trip message
     */
    private mockSendTripMessage;
    /**
     * Mock get trip messages
     */
    private mockGetTripMessages;
}
//# sourceMappingURL=mock-client.d.ts.map