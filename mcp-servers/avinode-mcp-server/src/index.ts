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
  RFQFlight,
} from './types.js';

/**
 * Get Message Parameters
 * Retrieves a specific message by message ID
 */
interface GetMessageParams {
  message_id: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from MCP server directory first, then project root
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../../../.env.local') });

// Check for API token and determine mode
const apiToken = process.env.API_TOKEN || process.env.AVINODE_API_TOKEN;
const authToken = process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN;
const useMockMode = !apiToken || !authToken || apiToken.startsWith('mock_');

// Get appropriate client (mock or real)
let avinodeClient: AvinodeClient | MockAvinodeClient;

if (useMockMode) {
  console.error('Running in MOCK MODE - using simulated Avinode data');
  console.error('Set API_TOKEN and AUTHENTICATION_TOKEN for live API access');
  avinodeClient = new MockAvinodeClient();
} else {
  try {
    avinodeClient = getAvinodeClient();
    const baseURL = process.env.BASE_URI || process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';
    console.error(`Avinode API configured: ${baseURL}`);
  } catch (error) {
    // If client initialization fails (e.g., missing BASE_URI in production), log and rethrow
    console.error('Failed to initialize Avinode client:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Extracts numeric ID from Avinode identifiers that may contain prefixes.
 * 
 * Handles IDs with known prefixes (arfq-, atrip-) and preserves the full suffix
 * even when it contains additional hyphens (e.g., "arfq-123-456" -> "123-456").
 * 
 * @param id - The identifier to extract numeric ID from (e.g., "arfq-123-456", "atrip-789", "123456")
 * @returns The numeric ID with full suffix preserved
 * @throws Error if the resulting numericId is empty or contains non-numeric characters
 * 
 * @example
 * extractNumericId('arfq-123-456') // Returns '123-456'
 * extractNumericId('atrip-789') // Returns '789'
 * extractNumericId('123456') // Returns '123456'
 */
function extractNumericId(id: string): string {
  // Preserve original if no known prefix
  if (!id.startsWith('arfq-') && !id.startsWith('atrip-')) {
    return id;
  }

  // Extract everything after the first hyphen using regex
  // This captures the full suffix even if it contains additional hyphens
  const match = id.match(/^(?:arfq|atrip)-(.+)$/);
  
  if (!match || !match[1]) {
    throw new Error(
      `Failed to extract numeric ID from identifier: "${id}". ` +
      `Expected format: "arfq-<id>" or "atrip-<id>"`
    );
  }

  // Trim whitespace from the extracted numeric ID to handle inputs like "arfq- 123 "
  const numericId = match[1].trim();

  // Validate that the extracted ID is not empty after trimming
  if (!numericId || numericId.length === 0) {
    throw new Error(
      `Extracted numeric ID is empty from identifier: "${id}". ` +
      `The ID must contain a value after the prefix.`
    );
  }

  // Validate that the extracted ID contains at least one numeric character
  // This ensures it's not purely alphabetic while allowing hyphens in composite IDs
  if (!/\d/.test(numericId)) {
    throw new Error(
      `Extracted numeric ID contains no numeric characters: "${numericId}" from identifier: "${id}". ` +
      `The ID must contain at least one digit.`
    );
  }

  // Note: We allow hyphens in the numeric ID as Avinode may use composite IDs (e.g., "123-456")
  // The API will validate the actual format, so we just ensure it's not empty and contains digits
  // Return the trimmed numeric ID to ensure no leading/trailing whitespace
  return numericId;
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
    description: 'Retrieve details of a Request for Quote (RFQ) including status and received quotes. Automatically handles both RFQ IDs (arfq-*) and Trip IDs (atrip-*). When a Trip ID is provided, uses the Read all RFQs for a given trip identifier endpoint (GET /rfqs/{tripId}) per Avinode API documentation: https://developer.avinodegroup.com/reference/readtriprfqs. Returns all RFQs and quotes for that trip with comprehensive aircraft, operator, and pricing details.',
    inputSchema: {
      type: 'object',
      properties: {
        rfq_id: {
          type: 'string',
          description: 'The RFQ identifier (e.g., arfq-12345678) or Trip ID (e.g., atrip-12345678). If it starts with "atrip-", uses GET /rfqs/{tripId} endpoint to return all RFQs for that trip per https://developer.avinodegroup.com/reference/readtriprfqs.',
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
    description: 'Retrieve the message history for a trip conversation thread. Supports both trip ID and request ID (RFQ ID) formats. When request_id is provided, uses GET /tripmsgs/{requestId}/chat endpoint per Avinode API documentation.',
    inputSchema: {
      type: 'object',
      properties: {
        trip_id: {
          type: 'string',
          description: 'The trip identifier (e.g., atrip-12345678). Use this for trip-level messages.',
        },
        request_id: {
          type: 'string',
          description: 'The request ID (RFQ ID) for request-specific messages. When provided, uses GET /tripmsgs/{requestId}/chat endpoint per https://developer.avinodegroup.com/reference/readmessage',
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
      required: [],
    },
  },
  {
    name: 'get_message',
    description: 'Retrieve a specific trip message by message ID. Uses GET /tripmsgs/{messageId} endpoint per Avinode API documentation: https://developer.avinodegroup.com/reference/readmessage and https://sandbox.avinode.com/api/tripmsgs/{messageId}',
    inputSchema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'The message identifier (e.g., asellermsg-12345678). Extracts numeric ID if prefixed.',
        },
      },
      required: ['message_id'],
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
        const params = args as unknown as GetTripMessagesParams & { request_id?: string };
        result = await getTripMessages(params);
        break;
      }

      case 'get_message': {
        const params = args as unknown as { message_id: string };
        result = await getMessage(params);
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
  const response = await avinodeClient.post('/flights/search', {
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
  const response = await avinodeClient.post('/emptyLeg/search', {
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

/**
 * Create an RFQ (Request for Quote)
 * 
 * @see https://developer.avinodegroup.com/reference/createrfq_1
 * Endpoint: POST /api/rfqs (not /rfps)
 */
async function createRFP(params: CreateRFPParams) {
  // Use correct endpoint per Avinode API documentation
  // @see https://developer.avinodegroup.com/reference/createrfq_1
  const response = await avinodeClient.post('/rfqs', {
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
  const response = await avinodeClient.get(`/rfqs/${params.rfp_id}`);

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
  const response = await avinodeClient.post('/watches', {
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
  const response = await avinodeClient.get('/airports/search', {
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
 *
 * @see https://developer.avinodegroup.com/reference/createtrip
 *
 * CORRECT request format per Avinode API (verified December 2025):
 * {
 *   "segments": [
 *     {
 *       "startAirport": { "icao": "KTEB" },
 *       "endAirport": { "icao": "KPBI" },
 *       "dateTime": {
 *         "date": "2025-01-15",
 *         "time": "10:00"
 *       },
 *       "paxCount": "4",
 *       "paxSegment": true
 *     }
 *   ],
 *   "sourcing": true,
 *   "criteria": {}
 * }
 *
 * Key differences from legacy format:
 * - Itinerary goes in top-level `segments[]`, NOT `criteria.legs[]`
 * - Airports use `startAirport`/`endAirport`, NOT `departureAirport`/`arrivalAirport`
 * - DateTime is nested object `dateTime: { date, time }`, NOT separate fields
 * - Passengers is `paxCount` (string) per segment, NOT `criteria.pax` (number)
 * - `sourcing: true` is REQUIRED for deep link prefill to work
 * - `criteria` object is for filters only (aircraft category, fuel stops, etc.)
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

  // Build segments array using correct Avinode API format
  const segments: Array<{
    startAirport: { icao: string };
    endAirport: { icao: string };
    dateTime: {
      date: string;
      time: string;
    };
    paxCount: string;
    paxSegment: boolean;
  }> = [
    {
      startAirport: { icao: params.departure_airport },
      endAirport: { icao: params.arrival_airport },
      dateTime: {
        date: params.departure_date,
        time: params.departure_time || '10:00',
      },
      paxCount: String(params.passengers),
      paxSegment: true,
    },
  ];

  // Add return segment if provided (round-trip)
  if (params.return_date) {
    segments.push({
      startAirport: { icao: params.arrival_airport },
      endAirport: { icao: params.departure_airport },
      dateTime: {
        date: params.return_date,
        time: params.return_time || '10:00',
      },
      paxCount: String(params.passengers),
      paxSegment: true,
    });
  }

  // Build criteria object for optional filters (aircraft category, etc.)
  const criteria: Record<string, unknown> = {};

  // Add aircraft category filter if provided
  if (params.aircraft_category) {
    criteria.requiredLift = [
      {
        aircraftCategory: params.aircraft_category,
        aircraftType: '',
        aircraftTail: '',
      },
    ];
  }

  // Add special requirements as notes if provided
  if (params.special_requirements) {
    criteria.notes = params.special_requirements;
  }

  // Build request body per correct Avinode API format
  const requestBody: Record<string, unknown> = {
    segments,           // Top-level segments array (REQUIRED)
    sourcing: true,     // Enable sourcing/search functionality (REQUIRED for prefill)
    criteria,           // Optional filters only
  };

  // Add external reference if provided
  if (params.client_reference) {
    requestBody.externalTripId = params.client_reference;
  }

  try {
    // Log request for debugging production issues
    console.error('[createTrip] Making API request to /trips with:', {
      segments: requestBody.segments?.length || 0,
      hasSourcing: !!requestBody.sourcing,
      hasCriteria: !!requestBody.criteria,
      hasExternalTripId: !!requestBody.externalTripId,
    });

    // Note: avinodeClient.post() already returns response.data (not the full axios response)
    // So 'response' here is already the data object
    const response = await avinodeClient.post('/trips', requestBody);

    // Log raw response structure for debugging production vs dev differences
    console.error('[createTrip] Raw API response structure:', {
      hasData: !!response.data,
      hasNestedData: !!response.data?.data,
      responseKeys: Object.keys(response || {}),
      dataKeys: response.data ? Object.keys(response.data) : [],
      nestedDataKeys: response.data?.data ? Object.keys(response.data.data) : [],
    });

    // Handle different response structures:
    // 1. Direct response: { id, actions, ... }
    // 2. Nested response: { data: { id, actions, ... } }
    // 3. Double nested: { data: { data: { id, actions, ... } } }
    let tripData = response;
    if (response.data) {
      tripData = response.data;
      // Handle double nesting (some API versions)
      if (tripData.data) {
        tripData = tripData.data;
      }
    }

    // Extract trip ID from various possible locations
    // Avinode API may return: id, tripId, or trip_id
    const tripId = tripData.id || tripData.tripId || tripData.trip_id;
    
    // Extract actions (deep links)
    const actions = tripData.actions || {};
    const deepLink = actions.searchInAvinode?.href || actions.viewInAvinode?.href || tripData.href;

    // Log extracted values for debugging
    console.error('[createTrip] Extracted trip data:', {
      tripId: tripId || 'MISSING',
      hasDeepLink: !!deepLink,
      deepLink: deepLink || 'MISSING',
      hasActions: !!tripData.actions,
      actionKeys: tripData.actions ? Object.keys(tripData.actions) : [],
    });

    // Validate that we have a trip ID - this is critical for the UI
    if (!tripId) {
      const errorMsg = `Failed to extract trip_id from Avinode API response. Response structure: ${JSON.stringify(response).substring(0, 500)}`;
      console.error('[createTrip] ERROR:', errorMsg);
      throw new Error(errorMsg);
    }

    // Return in the format expected by the UI
    const result = {
      trip_id: tripId,
      deep_link: deepLink || undefined,
      search_link: actions.searchInAvinode?.href || deepLink || undefined,
      view_link: actions.viewInAvinode?.href || undefined,
      cancel_link: actions.cancel?.href || undefined,
      status: 'created',
      created_at: new Date().toISOString(),
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

    console.error('[createTrip] Successfully created trip:', {
      trip_id: result.trip_id,
      has_deep_link: !!result.deep_link,
    });

    return result;
  } catch (error) {
    // Enhanced error logging for production debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[createTrip] ERROR creating trip:', {
      error: errorMessage,
      stack: errorStack,
      params: {
        departure_airport: params.departure_airport,
        arrival_airport: params.arrival_airport,
        departure_date: params.departure_date,
        passengers: params.passengers,
      },
    });

    // Re-throw with more context
    throw new Error(`Failed to create trip in Avinode: ${errorMessage}`);
  }
}

/**
 * Transform Avinode API response to RFQFlight array format
 * Maps the raw API response to the format expected by UI components
 */
function transformToRFQFlights(rfqData: any, tripId?: string): RFQFlight[] {
  // Combine ALL quotes from ALL possible arrays to ensure we don't miss any
  const quotesFromQuotes = Array.isArray(rfqData.quotes) ? rfqData.quotes : [];
  const quotesFromRequests = Array.isArray(rfqData.requests) ? rfqData.requests : [];
  const quotesFromResponses = Array.isArray(rfqData.responses) ? rfqData.responses : [];
  
  // Use a Set to deduplicate by quote ID if the same quote appears in multiple arrays
  const allQuotesMap = new Map<string, any>();
  
  // Add quotes from all sources, using quote ID as key to prevent duplicates
  [...quotesFromQuotes, ...quotesFromRequests, ...quotesFromResponses].forEach((quote: any) => {
    const quoteId = quote.quote?.id || quote.id;
    if (quoteId && !allQuotesMap.has(quoteId)) {
      allQuotesMap.set(quoteId, quote);
    } else if (!quoteId) {
      // If no ID, add with index-based key to preserve it
      allQuotesMap.set(`no-id-${allQuotesMap.size}`, quote);
    }
  });
  
  // Convert map back to array
  const quotes = Array.from(allQuotesMap.values());

  // Get route data from RFQ level (fallback for quote-level route data)
  const rfqDepartureAirport = rfqData.route?.departure?.airport;
  const rfqArrivalAirport = rfqData.route?.arrival?.airport;
  const rfqDepartureDate = rfqData.route?.departure?.date;

  return quotes.map((quote: any, index: number) => {
    // Derive RFQ status from quote response
    // When operator responds with a quote, status should be 'quoted'
    // When operator declines, status should be 'declined'
    // Otherwise, status is 'unanswered' or 'sent' (if RFQ was sent but no response yet)
    let rfqStatus: RFQFlight['rfqStatus'];
    
    // Check quote status first (most reliable indicator of operator response)
    if (quote.status === 'quoted' || quote.quote?.status === 'quoted') {
      rfqStatus = 'quoted';
    } else if (quote.status === 'declined' || quote.quote?.status === 'declined') {
      rfqStatus = 'declined';
    } else if (quote.status === 'expired' || quote.quote?.status === 'expired') {
      rfqStatus = 'expired';
    } else if (quote.status === 'sent' || rfqData.status === 'sent') {
      // RFQ was sent but no response yet
      rfqStatus = 'sent';
    } else {
      // Default to unanswered if no clear status
      rfqStatus = 'unanswered';
    }
    
    const hasQuote = rfqStatus === 'quoted';

    // Extract aircraft data
    const aircraftType = quote.aircraft?.type || 'Unknown';
    const aircraftModel = quote.aircraft?.model || quote.aircraft?.type || 'Unknown';
    const tailNumber = quote.aircraft?.tailNumber || quote.aircraft?.registration;
    const yearOfManufacture = quote.aircraft?.yearOfManufacture || quote.aircraft?.year_built;
    const passengerCapacity = quote.aircraft?.capacity || rfqData.passengers || 0;

    // Extract pricing data
    const totalPrice = hasQuote ? (quote.totalPrice?.amount || quote.quote?.totalPrice?.amount || quote.pricing?.total || 0) : 0;
    const currency = hasQuote ? (quote.totalPrice?.currency || quote.quote?.totalPrice?.currency || quote.pricing?.currency || 'USD') : 'USD';
    const priceBreakdown = hasQuote && quote.pricing ? {
      basePrice: quote.pricing.basePrice || quote.pricing.base_price || 0,
      fuelSurcharge: quote.pricing.fuelSurcharge || quote.pricing.fuel_surcharge,
      taxes: quote.pricing.taxes || 0,
      fees: quote.pricing.fees || 0,
    } : undefined;

    // Map amenities
    const amenitiesArray = quote.aircraft?.amenities || [];
    const amenities: RFQFlight['amenities'] = {
      wifi: amenitiesArray.includes('WiFi') || amenitiesArray.includes('wifi') || false,
      pets: amenitiesArray.includes('Pets') || amenitiesArray.includes('pets') || false,
      smoking: false, // Smoking is always false per business rules
      galley: amenitiesArray.includes('Galley') || amenitiesArray.includes('galley') || false,
      lavatory: amenitiesArray.includes('Lavatory') || amenitiesArray.includes('lavatory') || false,
      medical: amenitiesArray.includes('Medical') || amenitiesArray.includes('medical') || false,
    };

    // Extract route data - prefer quote-level, fallback to RFQ-level
    const departureAirport = quote.route?.departure?.airport || rfqDepartureAirport;
    const arrivalAirport = quote.route?.arrival?.airport || rfqArrivalAirport;
    const departureDate = quote.route?.departure?.date || rfqDepartureDate;

    // Validate that we have airport data
    if (!departureAirport?.icao || !arrivalAirport?.icao) {
      console.error('[transformToRFQFlights] Missing airport data', {
        quoteId: quote.quote?.id || quote.id,
        hasQuoteDeparture: !!quote.route?.departure?.airport,
        hasRfqDeparture: !!rfqDepartureAirport,
        hasQuoteArrival: !!quote.route?.arrival?.airport,
        hasRfqArrival: !!rfqArrivalAirport,
      });
      // Skip this quote if we don't have required airport data
      return null;
    }

    // Format flight duration
    const formatDuration = (minutes?: number): string => {
      if (!minutes) return '0h 0m';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    };

    const tailPhotoUrl =
      quote.aircraft?.photos?.[0]?.url ||
      quote.aircraft?.tail_photo_url ||
      quote.tailPhotos?.[0]?.url ||
      quote.typePhotos?.[0]?.url ||
      quote.lift?.tailPhotos?.[0]?.url ||
      quote.lift?.typePhotos?.[0]?.url;

    // Extract message ID if available (from webhook events or API response)
    // Message ID may be in various locations: message.id, messageId, latestMessage.id, etc.
    const messageId = quote.message?.id || 
                     quote.messageId || 
                     quote.latestMessage?.id ||
                     quote.messages?.[0]?.id ||
                     quote.sellerMessage?.id;

    // Assemble the RFQFlight object
    return {
      id: `flight-${quote.quote?.id || quote.id || index + 1}`,
      quoteId: quote.quote?.id || quote.id || `quote-${index + 1}`,
      // Include messageId if available (for retrieving specific messages)
      messageId: messageId,
      departureAirport: {
        icao: departureAirport.icao,
        name: departureAirport.name || quote.route?.departure?.name,
        city: departureAirport.city || quote.route?.departure?.city,
      },
      arrivalAirport: {
        icao: arrivalAirport.icao,
        name: arrivalAirport.name || quote.route?.arrival?.name,
        city: arrivalAirport.city || quote.route?.arrival?.city,
      },
      departureDate: departureDate || new Date().toISOString().split('T')[0],
      departureTime: quote.schedule?.departureTime ? new Date(quote.schedule.departureTime).toTimeString().slice(0, 5) : undefined,
      flightDuration: formatDuration(quote.schedule?.flightDuration || quote.schedule?.duration_minutes),
      aircraftType,
      aircraftModel,
      tailNumber,
      yearOfManufacture,
      passengerCapacity,
      tailPhotoUrl,
      operatorName: quote.seller?.companyName || quote.operator?.name || quote.operator_name || 'Unknown Operator',
      operatorRating: quote.seller?.rating || quote.operator?.rating,
      operatorEmail: quote.seller?.email || quote.operator?.email,
      totalPrice,
      currency,
      priceBreakdown,
      validUntil: hasQuote ? quote.validUntil : undefined,
      amenities,
      rfqStatus,
      lastUpdated: quote.updated_at || quote.received_at || new Date().toISOString(),
      responseTimeMinutes: quote.response_time_minutes,
      isSelected: false,
      avinodeDeepLink: rfqData.deep_link,
    };
  }).filter((flight): flight is RFQFlight => flight !== null);
}

/**
 * Get RFQ details including status and quotes
 * 
 * PRIMARY PATTERN (per test script): For Trip IDs, use GET /trips/{tripId} -> extract data.rfqs[]
 * Correct pattern: GET /trips/{tripId} -> extract data.rfqs[]
 * 
 * Automatically handles both RFQ IDs and Trip IDs:
 * - Trip ID (atrip-*, alphanumeric like B22E7Z): Uses GET /trips/{tripId} first, extracts data.rfqs[]
 *   @see https://developer.avinodegroup.com/reference/readtriprfqs
 * - RFQ ID (arfq-*): Uses GET /rfqs/{id} for single RFQ lookup
 *   @see https://developer.avinodegroup.com/reference/readbynumericid
 * 
 * Returns response in format: { flights: RFQFlight[], ... } for UI components
 * 
 * Optional query parameters (for /rfqs endpoint):
 * - taildetails: Additional aircraft information
 * - tailphotos: Links to aircraft photos
 * - timestamps: Include updatedByBuyer and latestUpdatedDateBySeller
 * - typedetails: Detailed aircraft type information
 * - typephotos: Links to generic aircraft type photos
 */
async function getRFQ(params: GetRFQParams) {
  if (!params.rfq_id) {
    throw new Error('rfq_id is required');
  }

  // Log the incoming RFQ ID for debugging
  console.log('[getRFQ] Received RFQ ID:', params.rfq_id, 'Type:', typeof params.rfq_id);

  // Extract ID for API call
  // Handle different formats: arfq-*, atrip-*, or other formats like QQ263P, B22E7Z
  let apiId: string;
  const isTripId = params.rfq_id.startsWith('atrip-');
  const isRfqId = params.rfq_id.startsWith('arfq-');
  
  if (isTripId || isRfqId) {
    // Extract numeric ID from prefixed format
    try {
      apiId = extractNumericId(params.rfq_id);
      console.log('[getRFQ] Extracted API ID from prefixed format:', apiId);
    } catch (error) {
      console.error('[getRFQ] Error extracting numeric ID:', error);
      throw new Error(
        `Invalid RFQ ID format: "${params.rfq_id}". ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    // For other formats (like QQ263P, B22E7Z), use as-is
    // Alphanumeric IDs like "B22E7Z" are typically Trip IDs
    apiId = params.rfq_id;
    console.log('[getRFQ] Using RFQ ID as-is (no prefix):', apiId);
  }

  let response;
  
  // PRIMARY PATTERN: For Trip IDs, use GET /trips/{tripId} first (per test script)
  // Correct pattern: GET /trips/{tripId} -> extract data.rfqs[]
  // The test script shows this is the correct approach for Trip IDs
  if (isTripId || (!isRfqId && /^[A-Z0-9]+$/.test(apiId))) {
    // Alphanumeric IDs (like B22E7Z) or atrip-* are Trip IDs - use /trips endpoint
    console.log('[getRFQ] Detected Trip ID, using GET /trips/' + apiId + ' (primary pattern)');
    console.log('[getRFQ] Pattern: GET /trips/{tripId} -> extract data.rfqs[]');
    
    try {
      const tripResponse = await avinodeClient.get(`/trips/${apiId}`);
      console.log('[getRFQ] /trips endpoint call successful');
      
      // Extract RFQs from trip response structure: data.rfqs[] or data.data.rfqs[]
      const tripPayload = (tripResponse as any)?.data ?? tripResponse;
      const tripRfqs = tripPayload?.rfqs || tripPayload?.data?.rfqs || tripPayload?.data?.data?.rfqs;
      
      console.log('[getRFQ] Trip response structure:', {
        hasData: !!(tripResponse as any)?.data,
        hasPayloadRfqs: !!tripPayload?.rfqs,
        hasPayloadDataRfqs: !!tripPayload?.data?.rfqs,
        tripPayloadKeys: tripPayload ? Object.keys(tripPayload) : [],
      });

      if (Array.isArray(tripRfqs)) {
        console.log('[getRFQ] Extracted', tripRfqs.length, 'RFQs from trip response');
        response = tripRfqs;
      } else if (tripRfqs) {
        // If rfqs is not an array but exists, wrap it
        response = [tripRfqs];
        console.log('[getRFQ] Wrapped single RFQ in array');
      } else {
        // No RFQs found in trip response - return empty array
        console.warn('[getRFQ] Trip response has no rfqs array - trip may not have RFQs yet');
        response = [];
      }
    } catch (tripError: any) {
      const errorMessage = tripError?.message || 'Unknown error';
      console.error('[getRFQ] /trips endpoint failed:', {
        error: errorMessage,
        status: tripError?.response?.status,
        statusText: tripError?.response?.statusText,
        data: tripError?.response?.data,
        tripId: params.rfq_id,
        apiId: apiId,
      });
      
      // Fallback to /rfqs/{tripId} if /trips fails (for API compatibility)
      try {
        console.warn('[getRFQ] /trips failed, attempting /rfqs fallback');
        response = await avinodeClient.get(`/rfqs/${apiId}`, {
          params: {
            taildetails: true,
            typedetails: true,
            timestamps: true,
            quotebreakdown: true,
            latestquote: true,
            tailphotos: true,
            typephotos: true,
          },
        });
        console.log('[getRFQ] /rfqs fallback successful');
      } catch (rfqError: any) {
        throw new Error(
          `Failed to fetch RFQs for Trip ID "${params.rfq_id}" (API ID: "${apiId}"): ` +
          `Both /trips (${tripError?.response?.status || tripError?.message}) and /rfqs (${rfqError?.response?.status || rfqError?.message}) failed.`
        );
      }
    }
  } else {
    // For RFQ IDs (arfq-* or single RFQ lookups), use /rfqs/{id} endpoint
    console.log('[getRFQ] Detected RFQ ID, using GET /rfqs/' + apiId);
    console.log('[getRFQ] Full API URL will be: /rfqs/' + apiId + ' with query params');
    
    try {
      response = await avinodeClient.get(`/rfqs/${apiId}`, {
        params: {
          taildetails: true, // Additional information about the aircraft (per API docs)
          typedetails: true, // Detailed information about the aircraft type (per API docs)
          timestamps: true, // Include updatedByBuyer and latestUpdatedDateBySeller fields (per API docs)
          quotebreakdown: true, // A detailed breakdown of the quote consisting of different sections and line items (per API docs)
          latestquote: true, // The latest added quote on a lift (per API docs)
          tailphotos: true, // Links to photos of the actual aircraft (per API docs)
          typephotos: true, // Links to generic photos of the aircraft type (per API docs)
        },
      });
      console.log('[getRFQ] /rfqs endpoint call successful');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.error('[getRFQ] /rfqs endpoint failed:', {
        error: errorMessage,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        rfqId: params.rfq_id,
        apiId: apiId,
      });
      
      // Re-throw with more context
      throw new Error(
        `Failed to fetch RFQ "${params.rfq_id}" (API ID: "${apiId}"): ${errorMessage}. ` +
        `Status: ${error?.response?.status || 'N/A'}. ` +
        `Response: ${JSON.stringify(error?.response?.data || {})}`
      );
    }
  }

  console.log('[getRFQ] API response received');
  console.log('[getRFQ] Response type:', typeof response);
  console.log('[getRFQ] Response isArray:', Array.isArray(response));
  console.log('[getRFQ] Response isNull:', response === null);
  console.log('[getRFQ] Response isUndefined:', response === undefined);
  
  // Log full response structure for debugging
  if (response === null || response === undefined) {
    console.warn('[getRFQ] Response is null or undefined!');
  } else if (Array.isArray(response)) {
    console.log('[getRFQ] Response is an array with length:', response.length);
    if (response.length > 0) {
      console.log('[getRFQ] First RFQ sample (first 1000 chars):', JSON.stringify(response[0], null, 2).substring(0, 1000));
      console.log('[getRFQ] First RFQ keys:', Object.keys(response[0]));
    } else {
      console.warn('[getRFQ] Response is an empty array - no RFQs found for Trip ID:', params.rfq_id);
    }
  } else if (typeof response === 'object') {
    console.log('[getRFQ] Response is an object with keys:', Object.keys(response));
    console.log('[getRFQ] Response object sample (first 1000 chars):', JSON.stringify(response, null, 2).substring(0, 1000));
    
    // Check for common response wrapper patterns
    if (response.data !== undefined) {
      console.log('[getRFQ] Response has .data property:', typeof response.data, Array.isArray(response.data));
    }
    if (response.rfqs !== undefined) {
      console.log('[getRFQ] Response has .rfqs property:', typeof response.rfqs, Array.isArray(response.rfqs));
    }
    if (response.results !== undefined) {
      console.log('[getRFQ] Response has .results property:', typeof response.results, Array.isArray(response.results));
    }
  } else {
    console.warn('[getRFQ] Unexpected response type:', typeof response, 'Value:', response);
  }

  // Per API docs: GET /rfqs/{tripId} returns an array of RFQ objects
  // Single RFQ endpoint returns a single object with rfq_id field
  // However, the response might be wrapped in an object with a data or rfqs property
  // Check for nested arrays first
  let actualResponse = response;
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    // Check if response has a nested array (common API pattern)
    if (Array.isArray(response.data)) {
      console.log('[getRFQ] Found nested array in response.data');
      actualResponse = response.data;
    } else if (Array.isArray(response.rfqs)) {
      console.log('[getRFQ] Found nested array in response.rfqs');
      actualResponse = response.rfqs;
    } else if (Array.isArray(response.results)) {
      console.log('[getRFQ] Found nested array in response.results');
      actualResponse = response.results;
    }
  }
  
  // Detect if response is for a Trip ID (array of RFQs) or single RFQ (object with rfq_id)
  const isTripIdResponse = Array.isArray(actualResponse);

  if (isTripIdResponse) {
    // Trip ID response: actualResponse is already an array of RFQs
    const rfqs = actualResponse;
    
    console.log('[getRFQ] Detected Trip ID response (array format)');
    console.log('[getRFQ] Processing', rfqs.length, 'RFQs from Trip ID response');
    
    // Transform all RFQs to RFQFlight format
    const allFlights: RFQFlight[] = [];
    const rfqDetails: any[] = [];
    
    for (const rfq of rfqs) {
      // Extract quotes for backward compatibility
      // Check multiple possible locations for quotes in the response
      const quotes = rfq.quotes || 
                    rfq.requests || 
                    rfq.responses || 
                    (rfq.lifts && Array.isArray(rfq.lifts) ? rfq.lifts.flatMap((lift: any) => lift.quotes || []) : []) ||
                    [];
      
      console.log('[getRFQ] Processing RFQ:', {
        rfq_id: rfq.rfq_id || rfq.id,
        trip_id: rfq.trip_id,
        status: rfq.status,
        has_quotes: !!(rfq.quotes && rfq.quotes.length > 0),
        has_lifts: !!(rfq.lifts && Array.isArray(rfq.lifts) && rfq.lifts.length > 0),
        has_requests: !!(rfq.requests && rfq.requests.length > 0),
        has_responses: !!(rfq.responses && rfq.responses.length > 0),
        quotes_count: quotes.length,
        rfq_keys: Object.keys(rfq),
      });
      
      // Transform this RFQ's quotes to RFQFlight format
      const flights = transformToRFQFlights(rfq, rfq.trip_id || params.rfq_id);
      console.log('[getRFQ] RFQ', rfq.rfq_id || rfq.id, 'has', quotes.length, 'quotes, transformed to', flights.length, 'flights');
      
      // If no flights were created but RFQ exists, log a warning
      if (flights.length === 0 && quotes.length === 0) {
        console.warn('[getRFQ] RFQ exists but has no quotes and no flights were created:', {
          rfq_id: rfq.rfq_id || rfq.id,
          status: rfq.status,
          route: rfq.route,
        });
      }
      
      allFlights.push(...flights);
      
      rfqDetails.push({
        rfq_id: rfq.rfq_id || rfq.id,
        trip_id: rfq.trip_id || params.rfq_id,
        status: rfq.status,
        created_at: rfq.created_at,
        quote_deadline: rfq.quote_deadline,
        route: rfq.route,
        passengers: rfq.passengers,
        quotes_received: quotes.length,
        operators_contacted: rfq.operators_contacted,
        deep_link: rfq.deep_link,
      });
    }

    console.log('[getRFQ] Total flights transformed:', allFlights.length);
    console.log('[getRFQ] Total RFQ details:', rfqDetails.length);

    // If no RFQs found, return user-friendly message directing to Step 2
    if (rfqDetails.length === 0) {
      console.warn('[getRFQ] No RFQs found for Trip ID:', params.rfq_id);
      console.warn('[getRFQ] This could mean:');
      console.warn('[getRFQ]   1. No RFQs have been created for this trip yet');
      console.warn('[getRFQ]   2. The trip ID format is incorrect');
      console.warn('[getRFQ]   3. The API returned an empty array');
      console.warn('[getRFQ]   4. Authentication/authorization issue');
      console.warn('[getRFQ] Original API response was:', {
        type: typeof actualResponse,
        isArray: Array.isArray(actualResponse),
        length: Array.isArray(actualResponse) ? actualResponse.length : 'N/A',
        sample: Array.isArray(actualResponse) && actualResponse.length > 0 
          ? actualResponse[0] 
          : actualResponse,
      });
      
      return {
        trip_id: params.rfq_id,
        rfqs: [],
        total_rfqs: 0,
        quotes: [],
        total_quotes: 0,
        flights: [],
        flights_received: 0,
        message: "No RFQs have been submitted yet for this Trip ID. Please follow the instructions in Step 2 to search for flights and send RFQs to operators via the Avinode marketplace.",
      };
    }
    
    // Log final result summary
    console.log('[getRFQ] Successfully processed Trip ID response:', {
      trip_id: params.rfq_id,
      total_rfqs: rfqDetails.length,
      total_flights: allFlights.length,
      has_flights: allFlights.length > 0,
    });

    return {
      trip_id: params.rfq_id,
      rfqs: rfqDetails,
      total_rfqs: rfqDetails.length,
      quotes: allFlights.map(f => ({
        id: f.id,
        operatorName: f.operatorName,
        aircraftType: f.aircraftType,
        price: f.totalPrice,
        currency: f.currency,
      })),
      total_quotes: allFlights.length,
      // PRIMARY: Return flights array in RFQFlight format for UI components
      flights: allFlights,
      flights_received: allFlights.length,
      status: allFlights.length > 0 ? 'quotes_received' : 'pending',
    };
  }

  // Single RFQ response (original behavior)
  // Use actualResponse which might be the unwrapped response
  const singleRfqData = actualResponse;
  
  console.log('[getRFQ] Processing single RFQ response');
  console.log('[getRFQ] Single RFQ data keys:', singleRfqData && typeof singleRfqData === 'object' ? Object.keys(singleRfqData) : 'N/A');
  
  // Extract quotes from multiple possible locations, including lifts
  const quotesFromQuotes = Array.isArray(singleRfqData.quotes) ? singleRfqData.quotes : [];
  const quotesFromRequests = Array.isArray(singleRfqData.requests) ? singleRfqData.requests : [];
  const quotesFromResponses = Array.isArray(singleRfqData.responses) ? singleRfqData.responses : [];
  const quotesFromLifts = singleRfqData.lifts && Array.isArray(singleRfqData.lifts) 
    ? singleRfqData.lifts.flatMap((lift: any) => lift.quotes || []) 
    : [];
  
  const quotes = [...quotesFromQuotes, ...quotesFromRequests, ...quotesFromResponses, ...quotesFromLifts];
  const quotesReceived = singleRfqData.quotes_received || quotes.length || 0;

  console.log('[getRFQ] Single RFQ quote sources:', {
    quotes: quotesFromQuotes.length,
    requests: quotesFromRequests.length,
    responses: quotesFromResponses.length,
    lifts: quotesFromLifts.length,
    total: quotes.length,
    quotes_received_field: quotesReceived,
  });

  // Log quote count for debugging discrepancy issues
  if (quotes.length !== quotesReceived) {
    console.warn(`[getRFQ] Quote count mismatch for RFQ ${params.rfq_id}:`, {
      quotesArrayLength: quotes.length,
      quotesReceivedField: singleRfqData.quotes_received,
      hasQuotes: !!singleRfqData.quotes,
      hasRequests: !!singleRfqData.requests,
      hasResponses: !!singleRfqData.responses,
      hasLifts: !!singleRfqData.lifts,
    });
  }

  // Transform quotes to RFQFlight format
  const flights = transformToRFQFlights(singleRfqData, singleRfqData.trip_id);

  console.log('[getRFQ] Single RFQ transformed to', flights.length, 'flights');

  return {
    rfq_id: singleRfqData.rfq_id || params.rfq_id,
    trip_id: singleRfqData.trip_id,
    status: singleRfqData.status,
    created_at: singleRfqData.created_at,
    quote_deadline: singleRfqData.quote_deadline,
    route: singleRfqData.route,
    passengers: singleRfqData.passengers,
    quotes_received: quotesReceived,
    quotes: quotes, // Keep for backward compatibility
    // PRIMARY: Return flights array in RFQFlight format for UI components
    flights: flights,
    flights_received: flights.length,
    operators_contacted: singleRfqData.operators_contacted,
    deep_link: singleRfqData.deep_link,
  };
}

/**
 * Get detailed quote information
 */
async function getQuote(params: GetQuoteParams) {
  if (!params.quote_id) {
    throw new Error('quote_id is required');
  }

  const response = await avinodeClient.get(`/quotes/${params.quote_id}`, {
    params: {
      taildetails: true,
      typedetails: true,
      tailphotos: true,
      typephotos: true,
    },
  });

  const payload = (response as any)?.data ?? response;
  const quote = payload?.data ?? payload;

  return {
    quote_id: quote?.id || quote?.quote_id || params.quote_id,
    rfq_id: quote?.rfq_id,
    trip_id: quote?.trip_id,
    status: quote?.status,
    operator: quote?.sellerCompany || quote?.operator,
    aircraft: quote?.lift,
    segments: quote?.segments,
    pricing: quote?.sellerPrice || quote?.pricing,
    availability: quote?.availability,
    valid_until: quote?.valid_until,
    created_at: quote?.createdOn || quote?.created_at,
    notes: quote?.sellerMessage || quote?.notes,
    photos: quote?.tailPhotos || quote?.typePhotos || quote?.photos,
  };
}

/**
 * Cancel an active trip
 * 
 * @see https://developer.avinodegroup.com/reference/readbynumericid
 * Endpoint: PUT /api/rfqs/{id}/cancel
 */
async function cancelTrip(params: CancelTripParams) {
  if (!params.trip_id) {
    throw new Error('trip_id is required');
  }

  // Extract numeric ID if prefixed
  // Uses robust extraction to handle IDs with additional hyphens (e.g., "atrip-123-456")
  let numericId: string;
  try {
    numericId = extractNumericId(params.trip_id);
  } catch (error) {
    throw new Error(
      `Invalid trip ID format: "${params.trip_id}". ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const response = await avinodeClient.put(`/rfqs/${numericId}/cancel`, {
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
 * 
 * @see https://developer.avinodegroup.com/reference/readmessage
 * Endpoint: POST /api/tripmsgs/{tripId}
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

  // Extract numeric ID if prefixed
  // Uses robust extraction to handle IDs with additional hyphens (e.g., "atrip-123-456")
  let numericId: string;
  try {
    numericId = extractNumericId(params.trip_id);
  } catch (error) {
    throw new Error(
      `Invalid trip ID format: "${params.trip_id}". ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const response = await avinodeClient.post(`/tripmsgs/${numericId}`, {
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
 * Get a specific message by message ID
 * 
 * Uses GET /tripmsgs/{messageId} endpoint per Avinode API documentation
 * 
 * @see https://developer.avinodegroup.com/reference/readmessage
 * @see https://sandbox.avinode.com/api/tripmsgs/{messageId}
 */
async function getMessage(params: GetMessageParams) {
  if (!params.message_id) {
    throw new Error('message_id is required');
  }

  // Extract numeric ID if prefixed (e.g., asellermsg-12345678)
  let numericId: string;
  try {
    // Handle message ID prefixes (asellermsg-, abuyermsg-, etc.)
    if (params.message_id.includes('-')) {
      const parts = params.message_id.split('-');
      if (parts.length >= 2) {
        numericId = parts.slice(1).join('-'); // Preserve full suffix after first hyphen
      } else {
        numericId = params.message_id;
      }
    } else {
      numericId = params.message_id;
    }
  } catch (error) {
    throw new Error(
      `Invalid message ID format: "${params.message_id}". ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const response = await avinodeClient.get(`/tripmsgs/${numericId}`);

  return {
    message_id: params.message_id,
    message: response.message || response.data?.message || response,
    sender: response.sender || response.data?.sender,
    sent_at: response.sent_at || response.data?.sent_at || response.created_at,
    trip_id: response.trip_id || response.data?.trip_id,
    request_id: response.request_id || response.data?.request_id,
    content: response.content || response.message?.content || response.data?.content,
  };
}

/**
 * Get message history for a trip or request
 * 
 * Supports two endpoint patterns per Avinode API documentation:
 * 1. GET /tripmsgs/{tripId} - Get messages for a trip (when trip_id is provided)
 * 2. GET /tripmsgs/{requestId}/chat - Get messages for a specific request/RFQ (when request_id is provided)
 * 
 * @see https://developer.avinodegroup.com/reference/readmessage
 * @see https://sandbox.avinode.com/api/tripmsgs/{requestId}/chat
 */
async function getTripMessages(params: GetTripMessagesParams & { request_id?: string }) {
  // Require either trip_id or request_id
  if (!params.trip_id && !params.request_id) {
    throw new Error('Either trip_id or request_id is required');
  }

  let endpoint: string;
  let identifier: string;

  // If request_id is provided, use the /chat endpoint per API docs
  if (params.request_id) {
    // Extract numeric ID if prefixed (e.g., arfq-12345678)
    try {
      identifier = extractNumericId(params.request_id);
      // Use /chat endpoint for request-specific messages per Avinode API docs
      endpoint = `/tripmsgs/${identifier}/chat`;
    } catch (error) {
      throw new Error(
        `Invalid request ID format: "${params.request_id}". ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else if (params.trip_id) {
    // Extract numeric ID if prefixed (e.g., atrip-12345678)
    try {
      identifier = extractNumericId(params.trip_id);
      // Use standard endpoint for trip-level messages
      endpoint = `/tripmsgs/${identifier}`;
    } catch (error) {
      throw new Error(
        `Invalid trip ID format: "${params.trip_id}". ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    throw new Error('Either trip_id or request_id must be provided');
  }

  const response = await avinodeClient.get(endpoint, {
    params: {
      limit: params.limit || 50,
      since: params.since,
    },
  });

  return {
    trip_id: params.trip_id,
    request_id: params.request_id,
    messages: response.messages || response.data?.messages || [],
    total_count: response.total_count || response.data?.total_count || response.messages?.length || 0,
    has_more: response.has_more || response.data?.has_more || false,
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
