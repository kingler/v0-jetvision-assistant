/**
 * Avinode MCP Server
 *
 * Provides MCP tools for interacting with the Avinode API.
 * Supports both mock mode (for testing) and real API mode.
 */

import { BaseMCPServer, MCPToolDefinition, MCPServerConfig } from './base-server';
import { AvinodeClient } from './clients/avinode-client';
import { MockAvinodeClient } from './clients/mock-avinode-client';

/**
 * Avinode MCP Server
 * Implements 4 tools: search_flights, create_rfp, get_quote_status, get_quotes
 */
export class AvinodeMCPServer extends BaseMCPServer {
  private client: AvinodeClient | MockAvinodeClient;
  private useMockMode: boolean;

  constructor() {
    const config: MCPServerConfig = {
      name: 'avinode-server',
      version: '1.0.0',
      transport: 'stdio',
      timeout: 30000,
    };

    super(config);

    // Detect mock mode
    const apiKey = process.env.AVINODE_API_KEY || '';
    this.useMockMode = !apiKey || apiKey.startsWith('mock_');

    // Initialize appropriate client
    if (this.useMockMode) {
      this.client = new MockAvinodeClient();
    } else {
      this.client = new AvinodeClient({
        apiKey,
        baseUrl: process.env.AVINODE_BASE_URL || 'https://api.avinode.com',
      });
    }

    // Register all tools
    this.registerAvinodeTools();
  }

  /**
   * Check if server is using mock mode
   */
  isUsingMockMode(): boolean {
    return this.useMockMode;
  }

  /**
   * Call a tool directly (for API route usage)
   * This bypasses the server state check and executes the tool directly
   */
  async callTool(name: string, params: any): Promise<any> {
    // Ensure server is in a valid state for direct tool calls
    // For API usage, we execute tools directly without requiring the full server to be running

    switch (name) {
      case 'search_flights':
        return await this.client.searchFlights(params);

      case 'create_rfp':
        return await this.client.createRFP(params);

      case 'get_quote_status':
        return await this.client.getQuoteStatus(params.rfp_id);

      case 'get_quotes':
        return await this.client.getQuotes(params.rfp_id);

      case 'search_airports':
        // Only mock client has searchAirports
        if ('searchAirports' in this.client && typeof this.client.searchAirports === 'function') {
          return await (this.client as any).searchAirports(params);
        }
        // For real client, we'd need to implement this differently
        return { airports: [], total: 0 };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Register all Avinode tools
   */
  private registerAvinodeTools(): void {
    this.registerTool(this.createSearchFlightsTool());
    this.registerTool(this.createCreateRFPTool());
    this.registerTool(this.createGetQuoteStatusTool());
    this.registerTool(this.createGetQuotesTool());
  }

  /**
   * Create search_flights tool
   */
  private createSearchFlightsTool(): MCPToolDefinition {
    return {
      name: 'search_flights',
      description: 'Search for available charter flights and aircraft',
      inputSchema: {
        type: 'object',
        properties: {
          departure_airport: {
            type: 'string',
            description: 'Departure airport ICAO code (4 letters)',
            pattern: '^[A-Z]{4}$',
          },
          arrival_airport: {
            type: 'string',
            description: 'Arrival airport ICAO code (4 letters)',
            pattern: '^[A-Z]{4}$',
          },
          passengers: {
            type: 'number',
            description: 'Number of passengers (1-19)',
            minimum: 1,
            maximum: 19,
          },
          departure_date: {
            type: 'string',
            description: 'Departure date (ISO format: YYYY-MM-DD)',
          },
          aircraft_category: {
            type: 'string',
            description: 'Optional aircraft category filter',
            enum: ['light', 'midsize', 'heavy', 'ultra-long-range'],
          },
        },
        required: ['departure_airport', 'arrival_airport', 'passengers', 'departure_date'],
      },
      execute: async (params: any) => {
        return await this.client.searchFlights(params);
      },
    };
  }

  /**
   * Create create_rfp tool
   */
  private createCreateRFPTool(): MCPToolDefinition {
    return {
      name: 'create_rfp',
      description: 'Create an RFP (Request for Proposal) and distribute to operators',
      inputSchema: {
        type: 'object',
        properties: {
          flight_details: {
            type: 'object',
            description: 'Flight details for the RFP',
            properties: {
              departure_airport: {
                type: 'string',
                description: 'Departure airport ICAO code',
                pattern: '^[A-Z]{4}$',
              },
              arrival_airport: {
                type: 'string',
                description: 'Arrival airport ICAO code',
                pattern: '^[A-Z]{4}$',
              },
              passengers: {
                type: 'number',
                description: 'Number of passengers',
                minimum: 1,
                maximum: 19,
              },
              departure_date: {
                type: 'string',
                description: 'Departure date (ISO format)',
              },
            },
            required: ['departure_airport', 'arrival_airport', 'passengers', 'departure_date'],
          },
          operator_ids: {
            type: 'array',
            description: 'Array of operator IDs to send RFP to',
            items: { type: 'string' },
            minItems: 1,
          },
          special_requirements: {
            type: 'string',
            description: 'Optional special requirements or notes',
          },
        },
        required: ['flight_details', 'operator_ids'],
      },
      execute: async (params: any) => {
        return await this.client.createRFP(params);
      },
    };
  }

  /**
   * Create get_quote_status tool
   */
  private createGetQuoteStatusTool(): MCPToolDefinition {
    return {
      name: 'get_quote_status',
      description: 'Get the status of an RFP and how many operators have responded',
      inputSchema: {
        type: 'object',
        properties: {
          rfp_id: {
            type: 'string',
            description: 'The RFP ID to check status for',
          },
        },
        required: ['rfp_id'],
      },
      execute: async (params: any) => {
        return await this.client.getQuoteStatus(params.rfp_id);
      },
    };
  }

  /**
   * Create get_quotes tool
   */
  private createGetQuotesTool(): MCPToolDefinition {
    return {
      name: 'get_quotes',
      description: 'Get all quotes received for an RFP',
      inputSchema: {
        type: 'object',
        properties: {
          rfp_id: {
            type: 'string',
            description: 'The RFP ID to get quotes for',
          },
        },
        required: ['rfp_id'],
      },
      execute: async (params: any) => {
        return await this.client.getQuotes(params.rfp_id);
      },
    };
  }
}
