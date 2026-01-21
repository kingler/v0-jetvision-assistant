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
export class MockAvinodeClient {
    tripCounter = 0;
    quoteCounter = 0;
    /**
     * Simulate API delay
     */
    async delay(min, max) {
        const ms = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Search for available flights/aircraft (mock)
     */
    async post(endpoint, data) {
        await this.delay(300, 800);
        if (endpoint === '/v1/flights/search') {
            return this.mockFlightSearch(data);
        }
        if (endpoint === '/v1/emptyLeg/search') {
            return this.mockEmptyLegSearch(data);
        }
        if (endpoint === '/v1/rfps') {
            return this.mockCreateRFP(data);
        }
        if (endpoint === '/v1/watches') {
            return this.mockCreateWatch(data);
        }
        // New: Create trip endpoint
        if (endpoint === '/v1/trips') {
            return this.mockCreateTrip(data);
        }
        // New: Send trip message endpoint
        if (endpoint.match(/^\/v1\/tripmsgs\/[^/]+\/sendMessage$/)) {
            const tripId = endpoint.split('/')[3];
            return this.mockSendTripMessage(tripId, data);
        }
        throw new Error(`Unknown POST endpoint: ${endpoint}`);
    }
    /**
     * Get request (mock)
     */
    async get(endpoint, config) {
        await this.delay(200, 500);
        if (endpoint.startsWith('/v1/rfps/')) {
            const rfpId = endpoint.split('/').pop();
            return this.mockGetRFPStatus(rfpId);
        }
        // New: Get RFQ details endpoint (different from RFP)
        if (endpoint.startsWith('/v1/rfqs/')) {
            const rfqId = endpoint.split('/').pop();
            return this.mockGetRFQ(rfqId);
        }
        if (endpoint === '/v1/airports/search') {
            return this.mockSearchAirports(config?.params?.query);
        }
        // New: Get quote details endpoint
        if (endpoint.startsWith('/v1/quotes/')) {
            const quoteId = endpoint.split('/').pop();
            return this.mockGetQuote(quoteId);
        }
        // New: Get trip messages endpoint
        if (endpoint.match(/^\/v1\/tripmsgs\/[^/]+$/)) {
            const tripId = endpoint.split('/').pop();
            return this.mockGetTripMessages(tripId, config?.params);
        }
        throw new Error(`Unknown GET endpoint: ${endpoint}`);
    }
    async delete(endpoint) {
        await this.delay(100, 300);
        return { success: true };
    }
    async put(endpoint, data) {
        await this.delay(200, 400);
        // New: Cancel trip endpoint
        if (endpoint.match(/^\/v1\/trips\/[^/]+\/cancel$/)) {
            const tripId = endpoint.split('/')[3];
            return this.mockCancelTrip(tripId, data);
        }
        return { ...data, updated: true };
    }
    async patch(endpoint, data) {
        await this.delay(200, 400);
        return { ...data, updated: true, updatedAt: new Date().toISOString() };
    }
    /**
     * Mock flight search results with proper nested structure
     */
    mockFlightSearch(data) {
        const searchId = `SEARCH-${Date.now()}`;
        const mockAircraft = this.generateMockAircraft();
        // Filter by capacity
        const filtered = mockAircraft.filter((a) => a.capacity >= (data.passengers || 1));
        // Return 3-5 results
        const count = Math.min(filtered.length, Math.floor(Math.random() * 3) + 3);
        const shuffled = filtered.sort(() => Math.random() - 0.5);
        return {
            search_id: searchId,
            aircraft: shuffled.slice(0, count),
            total: count,
            query: {
                departure: data.departure,
                arrival: data.arrival,
                passengers: data.passengers,
            },
            created_at: new Date().toISOString(),
        };
    }
    /**
     * Mock empty leg search results
     */
    mockEmptyLegSearch(data) {
        const searchId = `EMPTYLEG-${Date.now()}`;
        const mockEmptyLegs = [
            {
                id: 'EL-001',
                aircraft: {
                    type: 'Midsize Jet',
                    model: 'Citation XLS',
                    capacity: 8,
                    tailNumber: 'N800XL',
                },
                route: {
                    departure: {
                        icao: data.departure_airport || 'KTEB',
                        name: 'Teterboro Airport',
                    },
                    arrival: {
                        icao: data.arrival_airport || 'KOPF',
                        name: 'Miami-Opa Locka Executive',
                    },
                    departureDate: data.date_range?.from || new Date().toISOString().split('T')[0],
                },
                pricing: {
                    amount: 15000,
                    currency: 'USD',
                    discountPercentage: 45,
                },
                operator: {
                    id: 'comp-wheels-up-006',
                    name: 'Wheels Up',
                    rating: 4.5,
                },
            },
            {
                id: 'EL-002',
                aircraft: {
                    type: 'Light Jet',
                    model: 'Learjet 75',
                    capacity: 7,
                    tailNumber: 'N75LJ',
                },
                route: {
                    departure: {
                        icao: data.departure_airport || 'KTEB',
                        name: 'Teterboro Airport',
                    },
                    arrival: {
                        icao: data.arrival_airport || 'KOPF',
                        name: 'Miami-Opa Locka Executive',
                    },
                    departureDate: data.date_range?.from || new Date().toISOString().split('T')[0],
                },
                pricing: {
                    amount: 12500,
                    currency: 'USD',
                    discountPercentage: 55,
                },
                operator: {
                    id: 'comp-xojet-007',
                    name: 'XOJET',
                    rating: 4.4,
                },
            },
        ];
        return {
            search_id: searchId,
            empty_legs: mockEmptyLegs,
            total: mockEmptyLegs.length,
        };
    }
    /**
     * Mock RFP creation with proper Avinode structure
     */
    mockCreateRFP(data) {
        this.tripCounter++;
        const tripId = `atrip-${64956150 + this.tripCounter}`;
        const requestId = `arfq-${12345670 + this.tripCounter}`;
        const operatorCount = data.operator_ids?.length || 5;
        return {
            trip_id: tripId,
            request_id: requestId,
            status: 'created',
            created_at: new Date().toISOString(),
            operators_notified: operatorCount,
            quote_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            deep_link: `https://sandbox.avinode.com/marketplace/mvc/search#preSearch`,
            watch_url: `https://sandbox.avinode.com/marketplace/mvc/trips/selling/rfq?source=api&rfq=${requestId}`,
        };
    }
    /**
     * Mock RFP status with quotes matching database schema
     */
    mockGetRFPStatus(rfpId) {
        const tripId = rfpId.replace('arfq-', 'atrip-');
        const quotes = this.generateMockQuotes(rfpId, tripId);
        return {
            trip_id: tripId,
            request_id: rfpId,
            status: quotes.length >= 3 ? 'quotes_received' : 'pending',
            created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            quote_deadline: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
            operators_contacted: 5,
            quotes_received: quotes.length,
            quotes: quotes,
            deep_link: `https://sandbox.avinode.com/marketplace/mvc/trips/selling/rfq?source=api&rfq=${rfpId}`,
        };
    }
    /**
     * Mock watch creation
     */
    mockCreateWatch(data) {
        return {
            watch_id: `WATCH-${Date.now()}`,
            status: 'active',
            created_at: new Date().toISOString(),
            type: data.type,
        };
    }
    /**
     * Mock airport search
     */
    mockSearchAirports(query) {
        const allAirports = [
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
        const searchLower = (query || '').toLowerCase();
        const filtered = allAirports.filter((a) => a.icao.toLowerCase().includes(searchLower) ||
            a.iata.toLowerCase().includes(searchLower) ||
            a.name.toLowerCase().includes(searchLower) ||
            a.city.toLowerCase().includes(searchLower));
        return {
            airports: filtered,
            total: filtered.length,
        };
    }
    /**
     * Generate mock aircraft with proper nested structure
     */
    generateMockAircraft() {
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
        ];
    }
    /**
     * Generate mock quotes matching database schema
     */
    generateMockQuotes(requestId, tripId) {
        const count = Math.floor(Math.random() * 4) + 2; // 2-5 quotes
        const operators = [
            { id: 'comp-exec-jet-001', name: 'Executive Jet Management', rating: 4.8 },
            { id: 'comp-netjets-002', name: 'NetJets', rating: 4.9 },
            { id: 'comp-vistajet-003', name: 'VistaJet', rating: 4.7 },
            { id: 'comp-flexjet-004', name: 'Flexjet', rating: 4.6 },
            { id: 'comp-luxury-jets-005', name: 'Luxury Jets International', rating: 4.8 },
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
            const basePrice = Math.floor(Math.random() * 40000) + 30000;
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
                status: 'received',
                score: 85 - i * 5,
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
    // ============================================================================
    // New Mock Methods for Deep Link Workflow
    // ============================================================================
    /**
     * Mock get RFQ details
     */
    mockGetRFQ(rfqId) {
        const tripId = `atrip-${rfqId.replace('arfq-', '')}`;
        const quotes = this.generateMockQuotes(rfqId, tripId);
        return {
            rfq_id: rfqId,
            trip_id: tripId,
            status: 'quoted',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            quote_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            route: {
                departure: {
                    airport: 'KTEB',
                    name: 'Teterboro Airport',
                    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    time: '10:00',
                },
                arrival: {
                    airport: 'KLAX',
                    name: 'Los Angeles International Airport',
                },
            },
            passengers: 6,
            quotes_received: quotes.length,
            quotes,
            operators_contacted: 8,
            deep_link: `https://marketplace.avinode.com/rfq/${rfqId}`,
        };
    }
    /**
     * Mock create trip - returns trip ID and deep link
     */
    mockCreateTrip(data) {
        this.tripCounter++;
        const tripId = `atrip-${64956150 + this.tripCounter}`;
        const departureAirport = data.route?.departure?.airport || 'KTEB';
        const arrivalAirport = data.route?.arrival?.airport || 'KLAX';
        return {
            trip_id: tripId,
            deep_link: `https://sandbox.avinode.com/marketplace/mvc/search#preSearch`,
            search_link: `https://sandbox.avinode.com/marketplace/mvc/search/load/${tripId}?source=api&origin=api_action`,
            status: 'created',
            created_at: new Date().toISOString(),
            route: {
                departure: {
                    airport: departureAirport,
                    date: data.route?.departure?.date || new Date().toISOString().split('T')[0],
                    time: data.route?.departure?.time,
                },
                arrival: {
                    airport: arrivalAirport,
                },
                return: data.route?.return,
            },
            passengers: data.passengers || 1,
        };
    }
    /**
     * Mock get quote details
     */
    mockGetQuote(quoteId) {
        const basePrice = Math.floor(Math.random() * 40000) + 30000;
        const taxes = Math.floor(basePrice * 0.075);
        const fees = Math.floor(Math.random() * 2000) + 500;
        const fuelSurcharge = Math.floor(Math.random() * 3000) + 1500;
        const totalPrice = basePrice + taxes + fees + fuelSurcharge;
        return {
            quote_id: quoteId,
            rfq_id: `arfq-${quoteId.replace('aquote-', '')}`,
            trip_id: `atrip-${quoteId.replace('aquote-', '')}`,
            status: 'received',
            operator: {
                id: 'comp-netjets-002',
                name: 'NetJets',
                rating: 4.9,
                contact: {
                    name: 'John Smith',
                    email: 'quotes@netjets.com',
                    phone: '+1-555-0100',
                },
            },
            aircraft: {
                type: 'Heavy Jet',
                model: 'Gulfstream G650',
                registration: 'N650NJ',
                capacity: 16,
                year_built: 2021,
                amenities: ['WiFi', 'Satellite Phone', 'Full Galley', 'Enclosed Lavatory', 'Bedroom'],
            },
            pricing: {
                base_price: basePrice,
                taxes,
                fees,
                fuel_surcharge: fuelSurcharge,
                total: totalPrice,
                currency: 'USD',
                breakdown: {
                    'Hourly Rate': basePrice * 0.7,
                    'Positioning': basePrice * 0.3,
                    'FET (7.5%)': taxes,
                    'Landing Fees': fees * 0.6,
                    'Handling': fees * 0.4,
                    'Fuel Surcharge': fuelSurcharge,
                },
            },
            availability: {
                confirmed: true,
                outbound: true,
                return: true,
                notes: 'Aircraft positioned at KTEB. Full crew available.',
            },
            valid_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            notes: 'Premium service included. Catering options available upon request.',
        };
    }
    /**
     * Mock cancel trip
     */
    mockCancelTrip(tripId, data) {
        return {
            trip_id: tripId,
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            reason: data.reason || 'Cancelled by user',
        };
    }
    /**
     * Mock send trip message
     */
    mockSendTripMessage(tripId, data) {
        return {
            message_id: `msg-${Date.now()}`,
            trip_id: tripId,
            status: 'sent',
            sent_at: new Date().toISOString(),
            recipient_count: data.recipient_type === 'specific_operator' ? 1 : 5,
        };
    }
    /**
     * Mock get trip messages
     */
    mockGetTripMessages(tripId, params) {
        const limit = params?.limit || 50;
        const mockMessages = [
            {
                message_id: `msg-${tripId}-001`,
                trip_id: tripId,
                sender: {
                    id: 'user-buyer-001',
                    name: 'Sarah Johnson',
                    company: 'JetVision',
                    type: 'buyer',
                },
                content: 'Please confirm aircraft availability for the requested dates.',
                sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                read: true,
            },
            {
                message_id: `msg-${tripId}-002`,
                trip_id: tripId,
                sender: {
                    id: 'user-seller-001',
                    name: 'John Smith',
                    company: 'NetJets',
                    type: 'seller',
                },
                content: 'Aircraft confirmed and available. G650 N650NJ is positioned at KTEB and ready for the requested departure.',
                sent_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
                read: true,
            },
            {
                message_id: `msg-${tripId}-003`,
                trip_id: tripId,
                sender: {
                    id: 'user-buyer-001',
                    name: 'Sarah Johnson',
                    company: 'JetVision',
                    type: 'buyer',
                },
                content: 'Great! Client has specific catering requirements. Will send details shortly.',
                sent_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                read: true,
            },
            {
                message_id: `msg-${tripId}-004`,
                trip_id: tripId,
                sender: {
                    id: 'system',
                    name: 'System',
                    type: 'system',
                },
                content: 'Quote updated: NetJets has revised their pricing.',
                sent_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                read: false,
            },
        ];
        // Filter by since if provided
        let filteredMessages = mockMessages;
        if (params?.since) {
            const sinceDate = new Date(params.since);
            filteredMessages = mockMessages.filter((m) => new Date(m.sent_at) > sinceDate);
        }
        return {
            trip_id: tripId,
            messages: filteredMessages.slice(0, limit),
            total_count: filteredMessages.length,
            has_more: filteredMessages.length > limit,
        };
    }
}
//# sourceMappingURL=mock-client.js.map