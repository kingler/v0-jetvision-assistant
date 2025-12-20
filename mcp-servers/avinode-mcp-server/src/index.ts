#!/usr/bin/env node

/**
 * Avinode MCP Server
 *
 * Provides MCP tools for interacting with the Avinode API.
 * Implements the deep link workflow for human-in-the-loop flight search.
 *
 * Core Tools:
 * - search_flights: Search for available charter flights
 * - search_empty_legs: Search for empty leg flights at discounted prices
 * - create_rfp: Create RFP and send to operators
 * - get_rfp_status: Get RFP status and quotes
 * - create_watch: Create watch for monitoring updates
 * - search_airports: Search airports by name/code
 *
 * Deep Link Workflow Tools (ONEK-129):
 * - create_trip: Create trip container and return deep link for Avinode search
 * - get_rfq: Retrieve RFQ details by ID
 * - get_quote: Get specific quote details by quote ID
 * - cancel_trip: Cancel an active trip
 * - send_trip_message: Send message to operators in trip thread
 * - get_trip_messages: Retrieve message history for a trip
 *
 * Supports mock mode for development/testing when AVINODE_API_KEY is not set.
 *
 * @see docs/implementation/WORKFLOW-AVINODE-INTEGRATION.md
 * @see https://developer.avinodegroup.com/docs/search-in-avinode-from-your-system
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getAvinodeClient, AvinodeClient } from './client.js';
import { MockAvinodeClient } from './mock-client.js';
import type {
  FlightSearchParams,
  EmptyLegSearchParams,
  CreateRFPParams,
  GetRFPStatusParams,
  CreateWatchParams,
  SearchAirportsParams,
  CreateTripParams,
  GetRFQParams,
  GetQuoteParams,
  CancelTripParams,
  SendTripMessageParams,
  GetTripMessagesParams,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
config({ path: resolve(__dirname, '../../../.env.local') });

// Check for API key and determine mode
const apiKey = process.env.AVINODE_API_KEY;
const useMockMode = !apiKey || apiKey.startsWith('mock_');

// Get appropriate client (mock or real)
let avinodeClient: AvinodeClient | MockAvinodeClient;

if (useMockMode) {
  console.error('Running in MOCK MODE - using simulated Avinode data');
  avinodeClient = new MockAvinodeClient();
} else {
  avinodeClient = getAvinodeClient();
}

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'search_flights',
    description:
      'Search for available charter flights via Avinode API. Returns list of available aircraft from operators.',
    inputSchema: {
      type: 'object',
      properties: {
        departure_airport: {
          type: 'string',
          description: 'Departure airport ICAO code (e.g., KTEB, KJFK)',
        },
        departure_date: {
          type: 'string',
          description: 'Departure date in YYYY-MM-DD format',
        },
        departure_time: {
          type: 'string',
          description: 'Optional departure time in HH:MM format',
        },
        arrival_airport: {
          type: 'string',
          description: 'Arrival airport ICAO code',
        },
        passengers: {
          type: 'number',
          description: 'Number of passengers',
        },
        aircraft_types: {
          type: 'array',
          description: 'Optional array of aircraft types to filter by',
          items: { type: 'string' },
        },
        max_budget: {
          type: 'number',
          description: 'Optional maximum budget in USD',
        },
        min_operator_rating: {
          type: 'number',
          description: 'Optional minimum operator rating (0-5)',
        },
      },
      required: ['departure_airport', 'departure_date', 'arrival_airport', 'passengers'],
    },
  },
  {
    name: 'search_empty_legs',
    description:
      'Search for empty leg flights (repositioning flights at discounted prices). Can save clients 30-75% on costs.',
    inputSchema: {
      type: 'object',
      properties: {
        departure_airport: {
          type: 'string',
          description: 'Departure airport ICAO code',
        },
        arrival_airport: {
          type: 'string',
          description: 'Arrival airport ICAO code',
        },
        date_range: {
          type: 'object',
          description: 'Date range to search within',
          properties: {
            from: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            to: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
          },
          required: ['from', 'to'],
        },
        passengers: {
          type: 'number',
          description: 'Number of passengers',
        },
        max_price: {
          type: 'number',
          description: 'Optional maximum price in USD',
        },
        aircraft_types: {
          type: 'array',
          description: 'Optional array of aircraft types',
          items: { type: 'string' },
        },
      },
      required: ['departure_airport', 'arrival_airport', 'date_range', 'passengers'],
    },
  },
  {
    name: 'create_rfp',
    description:
      'Create a Request for Proposal (RFP) and send to selected operators on Avinode',
    inputSchema: {
      type: 'object',
      properties: {
        flight_details: {
          type: 'object',
          description: 'Flight search criteria',
        },
        operator_ids: {
          type: 'array',
          description: 'Array of operator IDs to send RFP to',
          items: { type: 'string' },
        },
        message: {
          type: 'string',
          description: 'Optional message to operators',
        },
        quote_deadline: {
          type: 'string',
          description: 'Quote deadline in ISO 8601 format',
        },
        client_reference: {
          type: 'string',
          description: 'Internal reference ID for tracking',
        },
      },
      required: ['flight_details', 'operator_ids'],
    },
  },
  {
    name: 'get_rfp_status',
    description: 'Get status of an RFP and retrieve received quotes',
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
  },
  {
    name: 'create_watch',
    description:
      'Create a watch to monitor RFP status, price changes, or empty leg availability',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of watch to create',
          enum: ['rfp', 'empty_leg', 'price_alert'],
        },
        rfp_id: {
          type: 'string',
          description: 'RFP ID to watch (if type is "rfp")',
        },
        empty_leg_id: {
          type: 'string',
          description: 'Empty leg ID to watch (if type is "empty_leg")',
        },
        notifications: {
          type: 'object',
          description: 'Notification preferences',
          properties: {
            on_new_quote: { type: 'boolean' },
            on_price_change: { type: 'boolean' },
            on_deadline_approaching: { type: 'boolean' },
          },
        },
        webhook_url: {
          type: 'string',
          description: 'Optional webhook URL for notifications',
        },
      },
      required: ['type', 'notifications'],
    },
  },
  {
    name: 'search_airports',
    description: 'Search for airports by name, city, or ICAO/IATA code',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (airport name, city, or code)',
        },
        country: {
          type: 'string',
          description: 'Optional country code filter (e.g., US, GB)',
        },
      },
      required: ['query'],
    },
  },
  // ============================================================================
  // Deep Link Workflow Tools
  // ============================================================================
  {
    name: 'create_trip',
    description:
      'Create a trip container in Avinode and return a deep link for manual operator selection. This is the primary tool for initiating the flight search workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        departure_airport: {
          type: 'string',
          description: 'Departure airport ICAO code (e.g., KTEB, KJFK)',
        },
        arrival_airport: {
          type: 'string',
          description: 'Arrival airport ICAO code',
        },
        departure_date: {
          type: 'string',
          description: 'Departure date in YYYY-MM-DD format',
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
        passengers: {
          type: 'number',
          description: 'Number of passengers',
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
  },
  {
    name: 'get_rfq',
    description: 'Retrieve details of a Request for Quote (RFQ) including status and received quotes',
    inputSchema: {
      type: 'object',
      properties: {
        rfq_id: {
          type: 'string',
          description: 'The RFQ identifier (e.g., arfq-12345678)',
        },
      },
      required: ['rfq_id'],
    },
  },
  {
    name: 'get_quote',
    description: 'Get detailed information about a specific quote from an operator',
    inputSchema: {
      type: 'object',
      properties: {
        quote_id: {
          type: 'string',
          description: 'The quote identifier (e.g., aquote-12345678)',
        },
      },
      required: ['quote_id'],
    },
  },
  {
    name: 'cancel_trip',
    description: 'Cancel an active trip. This will notify all operators and close the RFQ.',
    inputSchema: {
      type: 'object',
      properties: {
        trip_id: {
          type: 'string',
          description: 'The trip identifier (e.g., atrip-12345678)',
        },
        reason: {
          type: 'string',
          description: 'Optional cancellation reason',
        },
      },
      required: ['trip_id'],
    },
  },
  {
    name: 'send_trip_message',
    description: 'Send a message to operators in the trip conversation thread',
    inputSchema: {
      type: 'object',
      properties: {
        trip_id: {
          type: 'string',
          description: 'The trip identifier',
        },
        message: {
          type: 'string',
          description: 'The message content to send',
        },
        recipient_type: {
          type: 'string',
          description: 'Who to send the message to',
          enum: ['all_operators', 'specific_operator'],
        },
        operator_id: {
          type: 'string',
          description: 'Specific operator ID (required if recipient_type is specific_operator)',
        },
      },
      required: ['trip_id', 'message'],
    },
  },
  {
    name: 'get_trip_messages',
    description: 'Retrieve the message history for a trip conversation thread',
    inputSchema: {
      type: 'object',
      properties: {
        trip_id: {
          type: 'string',
          description: 'The trip identifier',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to retrieve (default: 50)',
        },
        since: {
          type: 'string',
          description: 'Optional ISO 8601 timestamp to retrieve messages after',
        },
      },
      required: ['trip_id'],
    },
  },
];

// Initialize MCP server
const server = new Server(
  {
    name: 'avinode-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'search_flights': {
        const params = args as unknown as FlightSearchParams;
        result = await searchFlights(params);
        break;
      }

      case 'search_empty_legs': {
        const params = args as unknown as EmptyLegSearchParams;
        result = await searchEmptyLegs(params);
        break;
      }

      case 'create_rfp': {
        const params = args as unknown as CreateRFPParams;
        result = await createRFP(params);
        break;
      }

      case 'get_rfp_status': {
        const params = args as unknown as GetRFPStatusParams;
        result = await getRFPStatus(params);
        break;
      }

      case 'create_watch': {
        const params = args as unknown as CreateWatchParams;
        result = await createWatch(params);
        break;
      }

      case 'search_airports': {
        const params = args as unknown as SearchAirportsParams;
        result = await searchAirports(params);
        break;
      }

      // Deep Link Workflow Tools
      case 'create_trip': {
        const params = args as unknown as CreateTripParams;
        result = await createTrip(params);
        break;
      }

      case 'get_rfq': {
        const params = args as unknown as GetRFQParams;
        result = await getRFQ(params);
        break;
      }

      case 'get_quote': {
        const params = args as unknown as GetQuoteParams;
        result = await getQuote(params);
        break;
      }

      case 'cancel_trip': {
        const params = args as unknown as CancelTripParams;
        result = await cancelTrip(params);
        break;
      }

      case 'send_trip_message': {
        const params = args as unknown as SendTripMessageParams;
        result = await sendTripMessage(params);
        break;
      }

      case 'get_trip_messages': {
        const params = args as unknown as GetTripMessagesParams;
        result = await getTripMessages(params);
        break;
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool implementation functions

async function searchFlights(params: FlightSearchParams) {
  const response = await avinodeClient.post('/v1/flights/search', {
    departure: {
      airport: params.departure_airport,
      date: params.departure_date,
      time: params.departure_time,
    },
    arrival: {
      airport: params.arrival_airport,
    },
    passengers: params.passengers,
    filters: {
      aircraft_types: params.aircraft_types,
      max_budget: params.max_budget,
      min_operator_rating: params.min_operator_rating,
    },
  });

  return {
    search_id: response.search_id,
    flights: response.results || [],
    total_results: response.total_results || 0,
  };
}

async function searchEmptyLegs(params: EmptyLegSearchParams) {
  const response = await avinodeClient.post('/v1/emptyLeg/search', {
    departure_airport: params.departure_airport,
    arrival_airport: params.arrival_airport,
    date_range: params.date_range,
    passengers: params.passengers,
    filters: {
      max_price: params.max_price,
      aircraft_types: params.aircraft_types,
    },
  });

  return {
    search_id: response.search_id,
    empty_legs: response.results || [],
    total_results: response.total_results || 0,
  };
}

async function createRFP(params: CreateRFPParams) {
  const response = await avinodeClient.post('/v1/rfps', {
    flight_details: params.flight_details,
    operator_ids: params.operator_ids,
    message: params.message,
    quote_deadline: params.quote_deadline,
    client_reference: params.client_reference,
  });

  return {
    rfp_id: response.rfp_id,
    status: response.status,
    created_at: response.created_at,
    operators_contacted: response.operators_contacted,
    quote_deadline: response.quote_deadline,
    watch_url: response.watch_url,
    deep_link: response.deep_link,
  };
}

async function getRFPStatus(params: GetRFPStatusParams) {
  const response = await avinodeClient.get(`/v1/rfps/${params.rfp_id}`);

  return {
    rfp_id: response.rfp_id,
    status: response.status,
    created_at: response.created_at,
    quote_deadline: response.quote_deadline,
    operators_contacted: response.operators_contacted,
    quotes_received: response.quotes_received,
    quotes: response.quotes || [],
    deep_link: response.deep_link,
  };
}

async function createWatch(params: CreateWatchParams) {
  const response = await avinodeClient.post('/v1/watches', {
    type: params.type,
    rfp_id: params.rfp_id,
    empty_leg_id: params.empty_leg_id,
    notifications: params.notifications,
    webhook_url: params.webhook_url,
  });

  return {
    watch_id: response.watch_id,
    status: response.status,
    created_at: response.created_at,
  };
}

async function searchAirports(params: SearchAirportsParams) {
  const response = await avinodeClient.get('/v1/airports/search', {
    params: {
      query: params.query,
      country: params.country,
    },
  });

  return {
    airports: response.airports || [],
    total_results: response.airports?.length || 0,
  };
}

// ============================================================================
// Deep Link Workflow Tool Implementations
// ============================================================================

/**
 * Create a trip container and return deep link for manual operator selection
 */
async function createTrip(params: CreateTripParams) {
  // Validate required parameters
  if (!params.departure_airport || !params.arrival_airport) {
    throw new Error('departure_airport and arrival_airport are required');
  }
  if (!params.departure_date) {
    throw new Error('departure_date is required');
  }
  if (!params.passengers || params.passengers < 1) {
    throw new Error('passengers must be at least 1');
  }

  const response = await avinodeClient.post('/v1/trips', {
    route: {
      departure: {
        airport: params.departure_airport,
        date: params.departure_date,
        time: params.departure_time,
      },
      arrival: {
        airport: params.arrival_airport,
      },
      return: params.return_date
        ? {
            date: params.return_date,
            time: params.return_time,
          }
        : undefined,
    },
    passengers: params.passengers,
    aircraft_category: params.aircraft_category,
    special_requirements: params.special_requirements,
    client_reference: params.client_reference,
  });

  return {
    trip_id: response.trip_id,
    deep_link: response.deep_link,
    search_link: response.search_link || response.deep_link,
    status: response.status || 'created',
    created_at: response.created_at || new Date().toISOString(),
    route: {
      departure: {
        airport: params.departure_airport,
        date: params.departure_date,
        time: params.departure_time,
      },
      arrival: {
        airport: params.arrival_airport,
      },
      return: params.return_date
        ? {
            date: params.return_date,
            time: params.return_time,
          }
        : undefined,
    },
    passengers: params.passengers,
  };
}

/**
 * Get RFQ details including status and quotes
 */
async function getRFQ(params: GetRFQParams) {
  if (!params.rfq_id) {
    throw new Error('rfq_id is required');
  }

  const response = await avinodeClient.get(`/v1/rfqs/${params.rfq_id}`);

  return {
    rfq_id: response.rfq_id || params.rfq_id,
    trip_id: response.trip_id,
    status: response.status,
    created_at: response.created_at,
    quote_deadline: response.quote_deadline,
    route: response.route,
    passengers: response.passengers,
    quotes_received: response.quotes_received || response.quotes?.length || 0,
    quotes: response.quotes || [],
    operators_contacted: response.operators_contacted,
    deep_link: response.deep_link,
  };
}

/**
 * Get detailed quote information
 */
async function getQuote(params: GetQuoteParams) {
  if (!params.quote_id) {
    throw new Error('quote_id is required');
  }

  const response = await avinodeClient.get(`/v1/quotes/${params.quote_id}`);

  return {
    quote_id: response.quote_id || params.quote_id,
    rfq_id: response.rfq_id,
    trip_id: response.trip_id,
    status: response.status,
    operator: response.operator,
    aircraft: response.aircraft,
    pricing: response.pricing,
    availability: response.availability,
    valid_until: response.valid_until,
    created_at: response.created_at,
    notes: response.notes,
  };
}

/**
 * Cancel an active trip
 */
async function cancelTrip(params: CancelTripParams) {
  if (!params.trip_id) {
    throw new Error('trip_id is required');
  }

  const response = await avinodeClient.put(`/v1/trips/${params.trip_id}/cancel`, {
    reason: params.reason,
  });

  return {
    trip_id: params.trip_id,
    status: 'cancelled',
    cancelled_at: response.cancelled_at || new Date().toISOString(),
    reason: params.reason,
  };
}

/**
 * Send a message in the trip conversation thread
 */
async function sendTripMessage(params: SendTripMessageParams) {
  if (!params.trip_id) {
    throw new Error('trip_id is required');
  }
  if (!params.message) {
    throw new Error('message is required');
  }
  if (params.recipient_type === 'specific_operator' && !params.operator_id) {
    throw new Error('operator_id is required when recipient_type is specific_operator');
  }

  const response = await avinodeClient.post(`/v1/tripmsgs/${params.trip_id}/sendMessage`, {
    message: params.message,
    recipient_type: params.recipient_type || 'all_operators',
    operator_id: params.operator_id,
  });

  return {
    message_id: response.message_id,
    trip_id: params.trip_id,
    status: response.status || 'sent',
    sent_at: response.sent_at || new Date().toISOString(),
    recipient_count: response.recipient_count || 1,
  };
}

/**
 * Get message history for a trip
 */
async function getTripMessages(params: GetTripMessagesParams) {
  if (!params.trip_id) {
    throw new Error('trip_id is required');
  }

  const response = await avinodeClient.get(`/v1/tripmsgs/${params.trip_id}`, {
    params: {
      limit: params.limit || 50,
      since: params.since,
    },
  });

  return {
    trip_id: params.trip_id,
    messages: response.messages || [],
    total_count: response.total_count || response.messages?.length || 0,
    has_more: response.has_more || false,
  };
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Avinode MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
