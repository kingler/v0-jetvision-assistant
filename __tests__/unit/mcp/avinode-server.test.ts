/**
 * Avinode MCP Server - Unit Tests (TDD Red Phase)
 *
 * Tests written FIRST before implementation.
 * Following the specification from TASK-008.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server';

describe('AvinodeMCPServer', () => {
  let server: AvinodeMCPServer;

  beforeEach(() => {
    // Set mock mode for testing
    process.env.AVINODE_API_KEY = 'mock_key_for_testing';
    server = new AvinodeMCPServer();
  });

  afterEach(async () => {
    if (server.getState() === 'running') {
      await server.stop();
    }
    delete process.env.AVINODE_API_KEY;
  });

  describe('Tool Registration', () => {
    it('should register all 4 Avinode tools', () => {
      const tools = server.getTools();
      expect(tools).toContain('search_flights');
      expect(tools).toContain('create_rfp');
      expect(tools).toContain('get_quote_status');
      expect(tools).toContain('get_quotes');
    });

    it('should have exactly 4 tools registered', () => {
      const tools = server.getTools();
      expect(tools).toHaveLength(4);
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
