/**
 * Avinode MCP Server - Unit Tests (TDD Red Phase)
 *
 * Tests written FIRST before implementation.
 * Following the specification from TASK-008.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the AvinodeClient to prevent real API calls
vi.mock('@/lib/mcp/clients/avinode-client', () => {
  return {
    AvinodeClient: vi.fn().mockImplementation(() => ({
      searchFlights: vi.fn().mockImplementation((params: any) => {
        // Base aircraft list
        let aircraft = [
          {
            id: 'AC-001',
            type: 'Citation XLS',
            category: 'midsize',
            capacity: 8,
            operator: 'Test Operator',
          },
          {
            id: 'AC-002',
            type: 'Gulfstream G550',
            category: 'heavy',
            capacity: 14,
            operator: 'Premium Jets',
          },
          {
            id: 'AC-003',
            type: 'Phenom 300',
            category: 'light',
            capacity: 6,
            operator: 'Light Jets Inc',
          },
        ];

        // Filter by aircraft_category if provided
        if (params.aircraft_category) {
          aircraft = aircraft.filter((a) => a.category === params.aircraft_category);
        }

        // Filter by passenger capacity
        if (params.passengers) {
          aircraft = aircraft.filter((a) => a.capacity >= params.passengers);
        }

        return Promise.resolve({ aircraft });
      }),
      createRFP: vi.fn().mockResolvedValue({
        rfp_id: 'RFP-12345',
        status: 'created',
        operators_notified: 3,
      }),
      getQuoteStatus: vi.fn().mockImplementation((rfpId: string) => {
        if (rfpId === 'NONEXISTENT') {
          return Promise.reject(new Error('RFP not found'));
        }
        return Promise.resolve({
          rfp_id: rfpId,
          total_operators: 5,
          responded: 3,
          pending: 2,
          created_at: '2025-11-15T10:00:00Z',
        });
      }),
      getQuotes: vi.fn().mockImplementation((rfpId: string) => {
        if (rfpId === 'NONEXISTENT') {
          return Promise.reject(new Error('RFP not found'));
        }
        return Promise.resolve({
          rfp_id: rfpId,
          quotes: [
            {
              quote_id: 'Q-001',
              operator_id: 'OP-001',
              operator_name: 'Premium Jets',
              aircraft_type: 'Gulfstream G550',
              base_price: 45000,
            },
            {
              quote_id: 'Q-002',
              operator_id: 'OP-002',
              operator_name: 'Executive Air',
              aircraft_type: 'Citation X',
              base_price: 38000,
            },
            {
              quote_id: 'Q-003',
              operator_id: 'OP-003',
              operator_name: 'Charter Plus',
              aircraft_type: 'Challenger 350',
              base_price: 42000,
            },
          ],
        });
      }),
      createTrip: vi.fn().mockResolvedValue({
        trip_id: 'TRP-12345',
        deep_link: 'https://app.avinode.com/trips/TRP-12345',
        status: 'created',
      }),
      getRFQ: vi.fn().mockImplementation((rfqId: string) => {
        // If it's a Trip ID (atrip-*), return array of RFQs
        if (rfqId.startsWith('atrip-')) {
          return Promise.resolve([
            {
              rfq_id: 'arfq-12345',
              trip_id: rfqId,
              status: 'quoted',
              quotes: [
                {
                  quote_id: 'aquote-001',
                  operator_id: 'OP-001',
                  operator_name: 'NetJets',
                  aircraft_type: 'Gulfstream G650',
                  base_price: 45000,
                  total_price: 52000,
                },
                {
                  quote_id: 'aquote-002',
                  operator_id: 'OP-002',
                  operator_name: 'VistaJet',
                  aircraft_type: 'Challenger 350',
                  base_price: 38000,
                  total_price: 44000,
                },
              ],
            },
            {
              rfq_id: 'arfq-12346',
              trip_id: rfqId,
              status: 'pending',
              quotes: [],
            },
          ]);
        }
        // Single RFQ response
        return Promise.resolve({
          rfq_id: rfqId,
          status: 'active',
          quotes: [],
        });
      }),
    })),
  };
});

import { AvinodeMCPServer } from '@/lib/mcp/avinode-server';

describe('AvinodeMCPServer', () => {
  let server: AvinodeMCPServer;

  beforeEach(() => {
    // Set valid API key format for testing (avoids isValidApiKey rejection)
    // Keys starting with 'mock_' or 'test_' are explicitly rejected
    process.env.AVINODE_API_KEY = 'valid_api_key_12345678';
    server = new AvinodeMCPServer();
  });

  afterEach(async () => {
    if (server.getState() === 'running') {
      await server.stop();
    }
    delete process.env.AVINODE_API_KEY;
  });

  describe('Tool Registration', () => {
    it('should register all 6 Avinode tools', () => {
      const tools = server.getTools();
      expect(tools).toContain('search_flights');
      expect(tools).toContain('create_rfp');
      expect(tools).toContain('get_quote_status');
      expect(tools).toContain('get_quotes');
      expect(tools).toContain('create_trip');
      expect(tools).toContain('get_rfq');
    });

    it('should have exactly 6 tools registered', () => {
      const tools = server.getTools();
      expect(tools).toHaveLength(6);
    });
  });

  describe('search_flights Tool', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should search flights with valid parameters', async () => {
      const result = await server.executeTool('search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
      });

      expect(result).toHaveProperty('aircraft');
      expect(Array.isArray(result.aircraft)).toBe(true);
      expect(result.aircraft.length).toBeGreaterThan(0);

      // Verify aircraft structure
      const aircraft = result.aircraft[0];
      expect(aircraft).toHaveProperty('id');
      expect(aircraft).toHaveProperty('type');
      expect(aircraft).toHaveProperty('category');
      expect(aircraft).toHaveProperty('capacity');
      expect(aircraft).toHaveProperty('operator');
    });

    it('should filter by aircraft category', async () => {
      const result = await server.executeTool('search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        aircraft_category: 'midsize',
      });

      // All returned aircraft should be midsize
      result.aircraft.forEach((aircraft: any) => {
        expect(aircraft.category).toBe('midsize');
      });
    });

    it('should validate required parameters', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'KTEB',
          // Missing arrival_airport, passengers, departure_date
        })
      ).rejects.toThrow('Validation failed');
    });

    it('should validate ICAO airport codes format', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'JFK', // Only 3 characters
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15',
        })
      ).rejects.toThrow();
    });

    it('should validate passenger count range', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 50, // Too many
          departure_date: '2025-11-15',
        })
      ).rejects.toThrow('Validation failed');
    });

    it('should validate passenger count minimum', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 0, // Too few
          departure_date: '2025-11-15',
        })
      ).rejects.toThrow('Validation failed');
    });

    it('should filter aircraft by passenger capacity', async () => {
      const result = await server.executeTool('search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 12,
        departure_date: '2025-11-15',
      });

      // All returned aircraft should have capacity >= 12
      result.aircraft.forEach((aircraft: any) => {
        expect(aircraft.capacity).toBeGreaterThanOrEqual(12);
      });
    });
  });

  describe('create_rfp Tool', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should create RFP with valid parameters', async () => {
      const result = await server.executeTool('create_rfp', {
        flight_details: {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15',
        },
        operator_ids: ['OP-001', 'OP-002', 'OP-003'],
      });

      expect(result).toHaveProperty('rfp_id');
      expect(result).toHaveProperty('status', 'created');
      expect(result).toHaveProperty('operators_notified');
      expect(result.operators_notified).toBe(3);
    });

    it('should include optional special requirements', async () => {
      const result = await server.executeTool('create_rfp', {
        flight_details: {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15',
        },
        operator_ids: ['OP-001'],
        special_requirements: 'Pet-friendly aircraft required',
      });

      expect(result).toHaveProperty('rfp_id');
      expect(result.rfp_id).toMatch(/^RFP-/);
    });

    it('should require at least one operator', async () => {
      await expect(
        server.executeTool('create_rfp', {
          flight_details: {
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            passengers: 6,
            departure_date: '2025-11-15',
          },
          operator_ids: [], // Empty array
        })
      ).rejects.toThrow('Validation failed');
    });

    it('should validate flight details structure', async () => {
      await expect(
        server.executeTool('create_rfp', {
          flight_details: {
            departure_airport: 'KTEB',
            // Missing required fields
          },
          operator_ids: ['OP-001'],
        })
      ).rejects.toThrow();
    });
  });

  describe('get_quote_status Tool', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should return status for existing RFP', async () => {
      const result = await server.executeTool('get_quote_status', {
        rfp_id: 'RFP-12345',
      });

      expect(result).toHaveProperty('rfp_id', 'RFP-12345');
      expect(result).toHaveProperty('total_operators');
      expect(result).toHaveProperty('responded');
      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('created_at');
      expect(typeof result.total_operators).toBe('number');
      expect(typeof result.responded).toBe('number');
      expect(typeof result.pending).toBe('number');
    });

    it('should throw error for non-existent RFP', async () => {
      await expect(
        server.executeTool('get_quote_status', {
          rfp_id: 'NONEXISTENT',
        })
      ).rejects.toThrow('RFP not found');
    });

    it('should validate rfp_id parameter', async () => {
      await expect(
        server.executeTool('get_quote_status', {})
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('get_quotes Tool', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should return quotes for existing RFP', async () => {
      const result = await server.executeTool('get_quotes', {
        rfp_id: 'RFP-12345',
      });

      expect(result).toHaveProperty('rfp_id');
      expect(result).toHaveProperty('quotes');
      expect(Array.isArray(result.quotes)).toBe(true);

      if (result.quotes.length > 0) {
        const quote = result.quotes[0];
        expect(quote).toHaveProperty('quote_id');
        expect(quote).toHaveProperty('operator_id');
        expect(quote).toHaveProperty('operator_name');
        expect(quote).toHaveProperty('aircraft_type');
        expect(quote).toHaveProperty('base_price');
        expect(typeof quote.base_price).toBe('number');
      }
    });

    it('should return multiple quotes', async () => {
      const result = await server.executeTool('get_quotes', {
        rfp_id: 'RFP-12345',
      });

      expect(result.quotes.length).toBeGreaterThanOrEqual(2);
      expect(result.quotes.length).toBeLessThanOrEqual(4);
    });

    it('should throw error for non-existent RFP', async () => {
      await expect(
        server.executeTool('get_quotes', {
          rfp_id: 'NONEXISTENT',
        })
      ).rejects.toThrow('RFP not found');
    });
  });

  describe('get_rfq Tool', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should return single RFQ details for RFQ ID', async () => {
      const result = await server.executeTool('get_rfq', {
        rfq_id: 'arfq-12345',
      });

      expect(result).toHaveProperty('rfq_id');
      expect(result).toHaveProperty('status');
    });

    it('should return array of RFQs for Trip ID', async () => {
      const result = await server.executeTool('get_rfq', {
        rfq_id: 'atrip-64956150',
      });

      // Trip ID response returns array of RFQs
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // First RFQ should have expected structure
      const firstRfq = result[0];
      expect(firstRfq).toHaveProperty('rfq_id');
      expect(firstRfq).toHaveProperty('trip_id');
      expect(firstRfq).toHaveProperty('status');
    });

    it('should include quotes in each RFQ from Trip ID response', async () => {
      const result = await server.executeTool('get_rfq', {
        rfq_id: 'atrip-64956150',
      });

      // Check that RFQs contain quotes array
      expect(Array.isArray(result)).toBe(true);
      const rfqWithQuotes = result.find((rfq: any) => rfq.quotes && rfq.quotes.length > 0);
      expect(rfqWithQuotes).toBeDefined();
      expect(Array.isArray(rfqWithQuotes.quotes)).toBe(true);

      // Verify quote structure
      const quote = rfqWithQuotes.quotes[0];
      expect(quote).toHaveProperty('quote_id');
      expect(quote).toHaveProperty('operator_name');
      expect(quote).toHaveProperty('aircraft_type');
    });

    it('should include RFQ details in each array item', async () => {
      const result = await server.executeTool('get_rfq', {
        rfq_id: 'atrip-64956150',
      });

      // Each RFQ in array should have expected structure
      const rfq = result[0];
      expect(rfq).toHaveProperty('rfq_id');
      expect(rfq).toHaveProperty('trip_id');
      expect(rfq).toHaveProperty('status');
      expect(rfq).toHaveProperty('quotes');
    });

    it('should validate rfq_id parameter is required', async () => {
      await expect(
        server.executeTool('get_rfq', {})
      ).rejects.toThrow();
    });
  });

  describe('Mock Mode', () => {
    it('should detect mock mode from API key', () => {
      process.env.AVINODE_API_KEY = 'mock_key';
      const mockServer = new AvinodeMCPServer();
      expect(mockServer.isUsingMockMode()).toBe(true);
    });

    it('should detect mock mode from empty API key', () => {
      delete process.env.AVINODE_API_KEY;
      const mockServer = new AvinodeMCPServer();
      expect(mockServer.isUsingMockMode()).toBe(true);
    });

    it('should detect real mode from real API key', () => {
      process.env.AVINODE_API_KEY = 'real_api_key_xyz';
      const realServer = new AvinodeMCPServer();
      expect(realServer.isUsingMockMode()).toBe(false);
    });

    it('should return realistic mock data', async () => {
      await server.start();
      const result = await server.executeTool('search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
      });

      // Mock should return 3-5 aircraft
      expect(result.aircraft.length).toBeGreaterThanOrEqual(3);
      expect(result.aircraft.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should not expose API keys in errors', async () => {
      try {
        await server.executeTool('search_flights', {});
      } catch (error: any) {
        const errorString = JSON.stringify(error);
        expect(errorString).not.toContain(process.env.AVINODE_API_KEY!);
      }
    });

    it('should handle validation errors gracefully', async () => {
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'INVALID',
        })
      ).rejects.toThrow();
    });
  });

  describe('Lifecycle Management', () => {
    it('should start successfully', async () => {
      await server.start();
      expect(server.getState()).toBe('running');
    });

    it('should stop successfully', async () => {
      await server.start();
      await server.stop();
      expect(server.getState()).toBe('stopped');
    });

    it('should prevent tool execution when not running', async () => {
      // Server not started
      await expect(
        server.executeTool('search_flights', {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15',
        })
      ).rejects.toThrow();
    });
  });
});
