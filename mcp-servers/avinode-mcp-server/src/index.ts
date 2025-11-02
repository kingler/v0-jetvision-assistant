#!/usr/bin/env node

/**
 * Avinode MCP Server
 *
 * Provides MCP tools for interacting with Avinode API:
 * - search_flights: Search for available charter flights
 * - search_empty_legs: Search for empty leg flights
 * - create_rfp: Create RFP and send to operators
 * - get_rfp_status: Get RFP status and quotes
 * - create_watch: Create watch for monitoring
 * - search_airports: Search airports by name/code
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
import { getAvinodeClient } from './client.js';
import type {
  FlightSearchParams,
  EmptyLegSearchParams,
  CreateRFPParams,
  GetRFPStatusParams,
  CreateWatchParams,
  SearchAirportsParams,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
config({ path: resolve(__dirname, '../../../.env.local') });

// Validate environment variables (only for real API mode)
const useMock = process.env.USE_MOCK_AVINODE === 'true';
const apiKey = process.env.AVINODE_API_KEY;

if (!useMock && !apiKey) {
  console.error('Error: Missing AVINODE_API_KEY in .env.local');
  console.error('Set USE_MOCK_AVINODE=true to use mock data instead.');
  process.exit(1);
}

// Get Avinode client (will use mock or real API based on environment)
const avinodeClient = getAvinodeClient();

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
