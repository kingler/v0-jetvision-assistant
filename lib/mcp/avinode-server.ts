/**
 * Avinode MCP Server
 *
 * Provides MCP tools for interacting with the Avinode API.
 * Uses the production AvinodeClient which handles API communication.
 */

import { BaseMCPServer } from './base-server';
import { MCPToolDefinition, MCPServerConfig } from './types';
import { AvinodeClient } from './clients/avinode-client';

/**
 * Avinode MCP Server
 * Implements tools: search_flights, create_rfp, get_quote_status, get_quotes, get_rfq, get_rfq_flights
 */
export class AvinodeMCPServer extends BaseMCPServer {
  private client: AvinodeClient | null = null;
  private apiKey: string = '';
  private clientInitialized: boolean = false;

  constructor() {
    const config: MCPServerConfig = {
      name: 'avinode-server',
      version: '1.0.0',
      transport: 'stdio',
      timeout: 30000,
    };

    super(config);

    // Register all tools (client is lazily initialized on first use)
    this.registerAvinodeTools();
  }

  /**
   * Lazily initialize the Avinode client on first use
   * This ensures environment variables are loaded in Next.js before reading them
   */
  private initializeClient(): void {
    // Skip if already initialized
    if (this.clientInitialized) {
      return;
    }

    this.clientInitialized = true;

    // Read environment variables at call time (lazy loading)
    this.apiKey = process.env.AVINODE_API_KEY || '';
    const baseUrl = process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

    this.logger.info('Initializing Avinode client (lazy)', {
      apiKeyLength: this.apiKey.length,
      baseUrl,
      hasApiKey: this.apiKey.length > 0,
    });

    // Validate API key before creating client
    if (this.isValidApiKey(this.apiKey)) {
      try {
        this.client = new AvinodeClient({
          apiKey: this.apiKey,
          baseUrl,
        });
        this.logger.info('Avinode client initialized successfully', {
          baseUrl,
          hasApiKey: true,
          apiKeyPrefix: this.apiKey.substring(0, 20) + '...',
        });
      } catch (error) {
        this.logger.error('Failed to initialize Avinode client', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.client = null;
      }
    } else {
      // Invalid API key - set client to null and log warning
      this.client = null;
      // Compute safe prefix to avoid misleading '...' for empty keys
      const apiKeyPrefix = this.apiKey ? this.apiKey.substring(0, 4) + '...' : '(none)';
      this.logger.warn('Avinode API key is invalid or missing. Client unavailable.', {
        apiKeyProvided: !!this.apiKey,
        apiKeyLength: this.apiKey.length,
        apiKeyPrefix,
      });
    }
  }

  /**
   * Validate API key format
   * Checks for non-empty, non-placeholder values
   * @param apiKey - The API key to validate
   * @returns true if the API key is valid, false otherwise
   */
  private isValidApiKey(apiKey: string): boolean {
    // Check if API key is empty
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    // Check for common placeholder/mock values (case-insensitive)
    const normalizedKey = apiKey.toLowerCase().trim();
    const invalidValues = ['mock', 'test', 'placeholder', 'your-api-key', 'xxx', 'null', 'undefined'];

    // Check if key matches any invalid placeholder pattern
    if (invalidValues.some((invalid) => normalizedKey === invalid || normalizedKey.startsWith(`${invalid}_`))) {
      return false;
    }

    // Check minimum length (most API keys are at least 20 characters)
    if (normalizedKey.length < 10) {
      return false;
    }

    return true;
  }

  /**
   * Check if client is available
   * @returns true if client is initialized and ready to use
   */
  private isClientAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Ensure client is available before making API calls
   * Initializes client lazily if not already done
   * @throws Error if client is not available
   */
  private ensureClientAvailable(): void {
    // Lazy initialization - read env vars on first call
    this.initializeClient();

    if (!this.isClientAvailable()) {
      throw new Error(
        'Avinode client is not available. Please configure a valid AVINODE_API_KEY environment variable.'
      );
    }
  }

  /**
   * Check if the server is using mock mode (no real API key configured)
   * Returns true if client is null (invalid/missing API key) or API key is a placeholder
   */
  isUsingMockMode(): boolean {
    // Lazy initialization - read env vars on first call
    this.initializeClient();

    // Client is null when API key is invalid
    if (!this.isClientAvailable()) {
      return true;
    }
    // Also check for placeholder values
    return !this.isValidApiKey(this.apiKey);
  }

  /**
   * Call a tool directly (for API route usage)
   * This bypasses the server state check and executes the tool directly
   */
  async callTool(name: string, params: any): Promise<any> {
    // Ensure server is in a valid state for direct tool calls
    // For API usage, we execute tools directly without requiring the full server to be running

    // Check if client is available before making API calls
    this.ensureClientAvailable();

    switch (name) {
      case 'search_flights':
        return await this.client!.searchFlights(params);

      case 'create_rfp':
        return await this.client!.createRFP(params);

      case 'get_quote_status':
        return await this.client!.getQuoteStatus(params.rfp_id);

      case 'get_quotes':
        return await this.client!.getQuotes(params.rfp_id);

      case 'search_airports':
        // Only mock client has searchAirports
        if (this.client && 'searchAirports' in this.client && typeof this.client.searchAirports === 'function') {
          return await (this.client as any).searchAirports(params);
        }
        // For real client, we'd need to implement this differently
        return { airports: [], total: 0 };

      case 'create_trip':
        // Create trip and return deep link for manual operator selection
        return await this.client!.createTrip(params);

      case 'get_rfq':
        // Get RFQ details including all received quotes
        // Called when user provides a Trip ID after completing Avinode selection
        return await this.client!.getRFQFlights(params.rfq_id);

      case 'send_trip_message':
        // Send a message to operators for a trip
        return await this.client!.sendTripMessage(params);

      case 'get_trip_messages':
        // Get messages for a trip or request
        return await this.client!.getTripMessages(params);

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
    this.registerTool(this.createCreateTripTool());
    this.registerTool(this.createGetRFQTool());
    this.registerTool(this.createListTripsTool());
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
        this.ensureClientAvailable();
        return await this.client!.searchFlights(params);
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
        this.ensureClientAvailable();
        return await this.client!.createRFP(params);
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
        this.ensureClientAvailable();
        return await this.client!.getQuoteStatus(params.rfp_id);
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
        this.ensureClientAvailable();
        return await this.client!.getQuotes(params.rfp_id);
      },
    };
  }

  /**
   * Create create_trip tool - the primary tool for deep link workflow
   * Creates a trip container in Avinode and returns a deep link for manual operator selection
   */
  private createCreateTripTool(): MCPToolDefinition {
    return {
      name: 'create_trip',
      description: 'Create a trip container in Avinode and return a deep link for manual operator selection. This is the primary tool for initiating the flight search workflow. The deep link allows users to open the Avinode marketplace to select aircraft and send RFPs to operators.',
      inputSchema: {
        type: 'object',
        properties: {
          departure_airport: {
            type: 'string',
            description: 'Departure airport ICAO code (e.g., KTEB, KJFK)',
            pattern: '^[A-Z]{4}$',
          },
          arrival_airport: {
            type: 'string',
            description: 'Arrival airport ICAO code',
            pattern: '^[A-Z]{4}$',
          },
          departure_date: {
            type: 'string',
            description: 'Departure date in YYYY-MM-DD format',
          },
          passengers: {
            type: 'number',
            description: 'Number of passengers',
            minimum: 1,
            maximum: 19,
          },
          departure_time: {
            type: 'string',
            description: 'Optional departure time in HH:MM format',
          },
          return_date: {
            type: 'string',
            description: 'Optional return date for round-trip in YYYY-MM-DD format',
          },
          return_time: {
            type: 'string',
            description: 'Optional return time in HH:MM format',
          },
          aircraft_category: {
            type: 'string',
            description: 'Optional aircraft category preference',
            enum: ['light', 'midsize', 'heavy', 'ultra-long-range'],
          },
          special_requirements: {
            type: 'string',
            description: 'Optional special requirements or notes',
          },
          client_reference: {
            type: 'string',
            description: 'Optional internal reference ID for tracking',
          },
        },
        required: ['departure_airport', 'arrival_airport', 'departure_date', 'passengers'],
      },
      execute: async (params: any) => {
        this.ensureClientAvailable();
        return await this.client!.createTrip(params);
      },
    };
  }

  /**
   * Create get_rfq tool - retrieves RFQ details and quotes
   * Automatically handles both RFQ IDs (arfq-*) and Trip IDs (atrip-*)
   * When a Trip ID is provided, returns all RFQs for that trip with flattened quotes
   */
  private createGetRFQTool(): MCPToolDefinition {
    return {
      name: 'get_rfq',
      description: 'Get RFQ (Request for Quote) details including all received quotes from operators. Automatically handles both RFQ IDs (arfq-*) and Trip IDs (atrip-*). When a Trip ID is provided, returns all RFQs for that trip with their quotes.',
      inputSchema: {
        type: 'object',
        properties: {
          rfq_id: {
            type: 'string',
            description: 'The RFQ identifier (e.g., arfq-12345678) or Trip ID (e.g., atrip-12345678). If it starts with "atrip-", returns all RFQs for that trip.',
          },
        },
        required: ['rfq_id'],
      },
      execute: async (params: any) => {
        this.ensureClientAvailable();
        // Use getRFQFlights to return transformed data in RFQFlight format
        // This provides a consistent, well-structured response for the UI
        return await this.client!.getRFQFlights(params.rfq_id);
      },
    };
  }

  /**
   * Create list_trips tool - lists all trips for the user
   * Tries Avinode API first, falls back to local database if unavailable
   */
  private createListTripsTool(): MCPToolDefinition {
    return {
      name: 'list_trips',
      description: 'List all trips for the user. Returns trips from Avinode API if available, falls back to local database. Use this when the user asks to see their trips, flight requests, or wants to review past bookings.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of trips to return (default: 20)',
            default: 20,
          },
          status: {
            type: 'string',
            description: 'Filter by trip status',
            enum: ['all', 'active', 'completed'],
            default: 'all',
          },
        },
        required: [],
      },
      execute: async (params: any) => {
        this.ensureClientAvailable();
        return await this.client!.listTrips({
          limit: params.limit || 20,
          status: params.status || 'all',
        });
      },
    };
  }
}
