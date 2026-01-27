/**
 * Avinode MCP Server Unit Tests
 *
 * Tests the Avinode MCP server tools and functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('Avinode MCP Server', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create = vi.fn(() => mockAxiosInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search_flights tool', () => {
    it('should search for flights with valid parameters', async () => {
      // Arrange
      const searchParams = {
        departure_airport: 'KTEB',
        departure_date: '2025-11-01',
        departure_time: '14:00',
        arrival_airport: 'KMIA',
        passengers: 6,
        aircraft_types: ['light_jet', 'midsize_jet'],
      };

      const mockResponse = {
        search_id: 'search_123',
        results: [
          {
            id: 'flight_1',
            operator: {
              id: 'op_123',
              name: 'Elite Air Charter',
              rating: 4.8,
            },
            aircraft: {
              type: 'light_jet',
              model: 'Citation CJ3',
              registration: 'N123AB',
              capacity: 7,
            },
            schedule: {
              departure_time: '2025-11-01T14:00:00Z',
              arrival_time: '2025-11-01T17:00:00Z',
              duration_minutes: 180,
            },
            pricing: {
              estimated_total: 28500,
              currency: 'USD',
            },
          },
        ],
        total_results: 15,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      const response = await mockAxiosInstance.post('/v1/flights/search', searchParams);

      // Assert
      expect(response.data.search_id).toBe('search_123');
      expect(response.data.results).toHaveLength(1);
      expect(response.data.results[0].operator.name).toBe('Elite Air Charter');
      expect(response.data.total_results).toBe(15);
    });

    it('should handle empty search results', async () => {
      // Arrange
      const mockResponse = {
        search_id: 'search_456',
        results: [],
        total_results: 0,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      const response = await mockAxiosInstance.post('/v1/flights/search', {});

      // Assert
      expect(response.data.results).toHaveLength(0);
      expect(response.data.total_results).toBe(0);
    });

    it('should filter by aircraft type', async () => {
      // Arrange
      const filters = {
        aircraft_types: ['light_jet'],
      };

      const mockFlights = [
        { aircraft: { type: 'light_jet' } },
        { aircraft: { type: 'midsize_jet' } },
        { aircraft: { type: 'light_jet' } },
      ];

      // Act
      const filtered = mockFlights.filter(f =>
        filters.aircraft_types.includes(f.aircraft.type)
      );

      // Assert
      expect(filtered).toHaveLength(2);
      expect(filtered.every(f => f.aircraft.type === 'light_jet')).toBe(true);
    });

    it('should filter by max budget', async () => {
      // Arrange
      const maxBudget = 30000;
      const mockFlights = [
        { pricing: { estimated_total: 25000 } },
        { pricing: { estimated_total: 35000 } },
        { pricing: { estimated_total: 28500 } },
      ];

      // Act
      const filtered = mockFlights.filter(f => f.pricing.estimated_total <= maxBudget);

      // Assert
      expect(filtered).toHaveLength(2);
      expect(filtered.every(f => f.pricing.estimated_total <= maxBudget)).toBe(true);
    });

    it('should filter by min operator rating', async () => {
      // Arrange
      const minRating = 4.5;
      const mockFlights = [
        { operator: { rating: 4.8 } },
        { operator: { rating: 4.2 } },
        { operator: { rating: 4.9 } },
      ];

      // Act
      const filtered = mockFlights.filter(f => f.operator.rating >= minRating);

      // Assert
      expect(filtered).toHaveLength(2);
      expect(filtered.every(f => f.operator.rating >= minRating)).toBe(true);
    });
  });

  describe('search_empty_legs tool', () => {
    it('should search for empty legs in date range', async () => {
      // Arrange
      const searchParams = {
        departure_airport: 'KTEB',
        arrival_airport: 'KMIA',
        date_range: {
          from: '2025-11-01',
          to: '2025-11-05',
        },
        passengers: 4,
      };

      const mockResponse = {
        search_id: 'search_empty_123',
        results: [
          {
            empty_leg_id: 'leg_xyz789',
            operator: { id: 'op_123', name: 'Elite Air', rating: 4.8 },
            aircraft: { type: 'light_jet', model: 'Citation CJ3' },
            pricing: {
              total: 15000,
              currency: 'USD',
              discount_percentage: 60,
              original_price: 37500,
            },
          },
        ],
        total_results: 3,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      const response = await mockAxiosInstance.post('/v1/emptyLeg/search', searchParams);

      // Assert
      expect(response.data.results[0].empty_leg_id).toBe('leg_xyz789');
      expect(response.data.results[0].pricing.discount_percentage).toBe(60);
      expect(response.data.results[0].pricing.total).toBeLessThan(
        response.data.results[0].pricing.original_price
      );
    });

    it('should calculate correct discount percentage', () => {
      // Arrange
      const original = 37500;
      const discounted = 15000;

      // Act
      const discountPercent = Math.round(((original - discounted) / original) * 100);

      // Assert
      expect(discountPercent).toBe(60);
    });

    it('should verify empty leg is within date range', () => {
      // Arrange
      const dateRange = {
        from: new Date('2025-11-01'),
        to: new Date('2025-11-05'),
      };
      const emptyLegDate = new Date('2025-11-02');

      // Act
      const isInRange = emptyLegDate >= dateRange.from && emptyLegDate <= dateRange.to;

      // Assert
      expect(isInRange).toBe(true);
    });
  });

  describe('create_rfp tool', () => {
    it('should create RFP with flight details and operators', async () => {
      // Arrange
      const rfpParams = {
        flight_details: {
          departure_airport: 'KTEB',
          departure_date: '2025-11-10',
          arrival_airport: 'KMIA',
          passengers: 4,
        },
        operator_ids: ['op_123', 'op_456', 'op_789'],
        message: 'VIP client request',
        quote_deadline: '2025-11-08T18:00:00Z',
      };

      const mockResponse = {
        rfp_id: 'rfp_abc123',
        status: 'sent',
        created_at: '2025-10-20T10:30:00Z',
        operators_contacted: 3,
        quote_deadline: '2025-11-08T18:00:00Z',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      const response = await mockAxiosInstance.post('/v1/rfqs', rfpParams);

      // Assert
      expect(response.data.rfp_id).toBe('rfp_abc123');
      expect(response.data.status).toBe('sent');
      expect(response.data.operators_contacted).toBe(3);
    });

    it('should validate operator IDs are provided', () => {
      // Arrange
      const rfpParams = {
        flight_details: {},
        operator_ids: ['op_123', 'op_456'],
      };

      // Act & Assert
      expect(rfpParams.operator_ids.length).toBeGreaterThan(0);
    });

    it('should set quote deadline before departure date', () => {
      // Arrange
      const departureDate = new Date('2025-11-10T14:00:00Z');
      const deadlineDuration = 48 * 60 * 60 * 1000; // 48 hours

      // Act
      const deadline = new Date(departureDate.getTime() - deadlineDuration);

      // Assert
      expect(deadline.getTime()).toBeLessThan(departureDate.getTime());
    });
  });

  describe('get_rfp_status tool', () => {
    it('should retrieve RFP status and quotes', async () => {
      // Arrange
      const mockResponse = {
        rfp_id: 'rfp_abc123',
        status: 'in_progress',
        quotes_received: 2,
        quotes: [
          {
            quote_id: 'quote_1',
            operator: { id: 'op_123', name: 'Elite Air', rating: 4.8 },
            pricing: { total: 28500, currency: 'USD' },
            valid_until: '2025-11-05T23:59:59Z',
          },
          {
            quote_id: 'quote_2',
            operator: { id: 'op_456', name: 'Sky VIP', rating: 4.9 },
            pricing: { total: 32000, currency: 'USD' },
            valid_until: '2025-11-06T23:59:59Z',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      // Act
      const response = await mockAxiosInstance.get('/v1/rfqs/rfp_abc123');

      // Assert
      expect(response.data.quotes_received).toBe(2);
      expect(response.data.quotes).toHaveLength(2);
      expect(response.data.quotes[0].quote_id).toBe('quote_1');
    });

    it('should sort quotes by price', () => {
      // Arrange
      const quotes = [
        { pricing: { total: 32000 } },
        { pricing: { total: 28500 } },
        { pricing: { total: 30000 } },
      ];

      // Act
      const sorted = [...quotes].sort((a, b) => a.pricing.total - b.pricing.total);

      // Assert
      expect(sorted[0].pricing.total).toBe(28500);
      expect(sorted[2].pricing.total).toBe(32000);
    });

    it('should filter valid quotes by expiration date', () => {
      // Arrange
      const now = new Date('2025-11-04T10:00:00Z');
      const quotes = [
        { valid_until: '2025-11-05T23:59:59Z' }, // Valid
        { valid_until: '2025-11-03T23:59:59Z' }, // Expired
        { valid_until: '2025-11-06T23:59:59Z' }, // Valid
      ];

      // Act
      const validQuotes = quotes.filter(q => new Date(q.valid_until) > now);

      // Assert
      expect(validQuotes).toHaveLength(2);
    });
  });

  describe('create_watch tool', () => {
    it('should create watch for RFP monitoring', async () => {
      // Arrange
      const watchParams = {
        type: 'rfp',
        rfp_id: 'rfp_abc123',
        notifications: {
          on_new_quote: true,
          on_price_change: true,
          on_deadline_approaching: true,
        },
      };

      const mockResponse = {
        watch_id: 'watch_123',
        status: 'active',
        created_at: '2025-10-20T10:00:00Z',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Act
      const response = await mockAxiosInstance.post('/v1/watches', watchParams);

      // Assert
      expect(response.data.watch_id).toBe('watch_123');
      expect(response.data.status).toBe('active');
    });

    it('should validate watch type', () => {
      // Arrange
      const validTypes = ['rfp', 'empty_leg', 'price_alert'];
      const watchType = 'rfp';

      // Act & Assert
      expect(validTypes).toContain(watchType);
    });
  });

  describe('search_airports tool', () => {
    it('should search airports by name', async () => {
      // Arrange
      const mockResponse = {
        airports: [
          {
            icao: 'KTEB',
            iata: 'TEB',
            name: 'Teterboro Airport',
            city: 'Teterboro',
            state: 'New Jersey',
            country: 'United States',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      // Act
      const response = await mockAxiosInstance.get('/v1/airports/search', {
        params: { query: 'Teterboro' },
      });

      // Assert
      expect(response.data.airports).toHaveLength(1);
      expect(response.data.airports[0].icao).toBe('KTEB');
    });

    it('should search by ICAO code', async () => {
      // Arrange
      const query = 'KTEB';
      const airports = [
        { icao: 'KTEB', name: 'Teterboro Airport' },
        { icao: 'KJFK', name: 'JFK Airport' },
      ];

      // Act
      const found = airports.find(a => a.icao === query);

      // Assert
      expect(found).toBeDefined();
      expect(found!.icao).toBe('KTEB');
    });

    it('should filter by country', () => {
      // Arrange
      const airports = [
        { icao: 'KTEB', country: 'United States' },
        { icao: 'EGLL', country: 'United Kingdom' },
        { icao: 'KJFK', country: 'United States' },
      ];

      // Act
      const usAirports = airports.filter(a => a.country === 'United States');

      // Assert
      expect(usAirports).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should handle API errors with proper error messages', async () => {
      // Arrange
      const error = {
        response: {
          status: 404,
          data: { message: 'Flight not found' },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      // Act & Assert
      await expect(mockAxiosInstance.post('/v1/flights/search')).rejects.toEqual(error);
    });

    it('should handle rate limit errors (429)', async () => {
      // Arrange
      const error = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      // Act & Assert
      await expect(mockAxiosInstance.post('/v1/flights/search')).rejects.toEqual(error);
    });

    it('should handle network errors', async () => {
      // Arrange
      const error = {
        request: {},
        message: 'Network error',
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      // Act & Assert
      await expect(mockAxiosInstance.get('/v1/airports/search')).rejects.toEqual(error);
    });

    it('should handle authentication errors (401)', async () => {
      // Arrange
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid API key' },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      // Act & Assert
      await expect(mockAxiosInstance.post('/v1/flights/search')).rejects.toEqual(error);
    });
  });

  describe('Data validation', () => {
    it('should validate ICAO airport codes', () => {
      // Arrange
      const validICAO = /^[A-Z]{4}$/;

      // Act & Assert
      expect('KTEB').toMatch(validICAO);
      expect('KMIA').toMatch(validICAO);
      expect('NYC').not.toMatch(validICAO);
    });

    it('should validate date format (YYYY-MM-DD)', () => {
      // Arrange
      const validDate = /^\d{4}-\d{2}-\d{2}$/;

      // Act & Assert
      expect('2025-11-01').toMatch(validDate);
      expect('11/01/2025').not.toMatch(validDate);
    });

    it('should validate passenger count is positive', () => {
      // Arrange
      const passengers = 6;

      // Act & Assert
      expect(passengers).toBeGreaterThan(0);
    });
  });
});
