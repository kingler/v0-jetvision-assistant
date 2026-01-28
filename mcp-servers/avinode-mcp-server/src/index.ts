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
  TripSegment,
  TripType,
  CreateEmptyLegWatchParams,
  UpdateEmptyLegWatchParams,
  MarkEmptyLegMatchParams,
  EmptyLegWatchResponse,
  EmptyLegMatch,
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
      'Create a trip container in Avinode and return a deep link for manual operator selection. Supports single-leg, round-trip, and multi-city trips. Use legacy flat params for simple trips or segments[] array for multi-city.',
    inputSchema: {
      type: 'object',
      properties: {
        // Legacy params (backward compatible)
        departure_airport: {
          type: 'string',
          description: 'Departure airport ICAO code (e.g., KTEB, KJFK) - required for legacy mode',
        },
        arrival_airport: {
          type: 'string',
          description: 'Arrival airport ICAO code - required for legacy mode',
        },
        departure_date: {
          type: 'string',
          description: 'Departure date in YYYY-MM-DD format - required for legacy mode',
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
          description: 'Number of passengers - required for legacy mode',
        },
        return_passengers: {
          type: 'number',
          description: 'Number of passengers on return leg (defaults to outbound passengers if not specified)',
        },
        // Multi-segment params (new)
        segments: {
          type: 'array',
          description: 'Array of flight segments for multi-city trips. When provided, legacy params are ignored.',
          items: {
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
              departure_date: {
                type: 'string',
                description: 'Departure date in YYYY-MM-DD format',
              },
              departure_time: {
                type: 'string',
                description: 'Optional departure time in HH:MM format',
              },
              passengers: {
                type: 'number',
                description: 'Number of passengers for this segment',
              },
            },
            required: ['departure_airport', 'arrival_airport', 'departure_date', 'passengers'],
          },
        },
        // Common params
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
      // No required fields at top level - validation done in handler
      // Either segments[] OR (departure_airport + arrival_airport + departure_date + passengers) required
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
    description: 'Send a chat message to operators. Uses POST /tripmsgs/{requestId}/chat endpoint per Avinode API. Messages can be up to 5KB and support \\n for line breaks.',
    inputSchema: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'The RFQ/request identifier (e.g., arfq-12345678). Required for sending chat messages per Avinode API.',
        },
        trip_id: {
          type: 'string',
          description: 'The trip identifier (e.g., atrip-12345678). Used as fallback if request_id not provided.',
        },
        message: {
          type: 'string',
          description: 'The message content to send (max 5KB, use \\n for line breaks)',
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
      required: ['message'],
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
  // ============================================================================
  // Empty Leg Watch Tools (ONEK-147, ONEK-148)
  // ============================================================================
  {
    name: 'create_empty_leg_watch',
    description: 'Create a watch to monitor empty leg flights on a specific route. Get notified when discounted flights become available.',
    inputSchema: {
      type: 'object',
      properties: {
        departure_airport: {
          type: 'string',
          description: 'Departure airport ICAO code (e.g., KJFK)',
        },
        arrival_airport: {
          type: 'string',
          description: 'Arrival airport ICAO code (e.g., KMIA)',
        },
        date_range_start: {
          type: 'string',
          description: 'Start date of watch period in YYYY-MM-DD format',
        },
        date_range_end: {
          type: 'string',
          description: 'End date of watch period in YYYY-MM-DD format (max 90 days from start)',
        },
        passengers: {
          type: 'number',
          description: 'Number of passengers',
        },
        max_price: {
          type: 'number',
          description: 'Optional maximum price threshold in USD',
        },
        aircraft_categories: {
          type: 'array',
          description: 'Optional filter by aircraft category',
          items: {
            type: 'string',
            enum: ['light', 'midsize', 'heavy', 'ultra-long-range'],
          },
        },
        notification_email: {
          type: 'string',
          description: 'Optional email for notifications',
        },
      },
      required: ['departure_airport', 'arrival_airport', 'date_range_start', 'date_range_end', 'passengers'],
    },
  },
  {
    name: 'get_empty_leg_watches',
    description: 'List all empty leg watches for the current user',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by watch status',
          enum: ['active', 'paused', 'expired', 'cancelled'],
        },
      },
    },
  },
  {
    name: 'update_empty_leg_watch',
    description: 'Update an existing empty leg watch (pause, resume, update settings)',
    inputSchema: {
      type: 'object',
      properties: {
        watch_id: {
          type: 'string',
          description: 'The watch identifier',
        },
        status: {
          type: 'string',
          description: 'New status for the watch',
          enum: ['active', 'paused'],
        },
        max_price: {
          type: 'number',
          description: 'Updated maximum price threshold',
        },
        notification_email: {
          type: 'string',
          description: 'Updated notification email',
        },
      },
      required: ['watch_id'],
    },
  },
  {
    name: 'delete_empty_leg_watch',
    description: 'Cancel and delete an empty leg watch',
    inputSchema: {
      type: 'object',
      properties: {
        watch_id: {
          type: 'string',
          description: 'The watch identifier to delete',
        },
      },
      required: ['watch_id'],
    },
  },
  {
    name: 'get_watch_matches',
    description: 'Get all empty leg flights matching a watch criteria',
    inputSchema: {
      type: 'object',
      properties: {
        watch_id: {
          type: 'string',
          description: 'The watch identifier',
        },
        unviewed_only: {
          type: 'boolean',
          description: 'Only return unviewed matches',
        },
        interested_only: {
          type: 'boolean',
          description: 'Only return matches marked as interested',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of matches to return (default: 50)',
        },
      },
      required: ['watch_id'],
    },
  },
  {
    name: 'mark_match',
    description: 'Mark an empty leg match as viewed or interested',
    inputSchema: {
      type: 'object',
      properties: {
        match_id: {
          type: 'string',
          description: 'The match identifier',
        },
        viewed: {
          type: 'boolean',
          description: 'Mark as viewed',
        },
        interested: {
          type: 'boolean',
          description: 'Mark as interested',
        },
      },
      required: ['match_id'],
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

      // Empty Leg Watch Tools (ONEK-147, ONEK-148)
      case 'create_empty_leg_watch': {
        const params = args as unknown as CreateEmptyLegWatchParams;
        result = await createEmptyLegWatch(params);
        break;
      }

      case 'get_empty_leg_watches': {
        const params = args as unknown as { status?: string };
        result = await getEmptyLegWatches(params);
        break;
      }

      case 'update_empty_leg_watch': {
        const params = args as unknown as UpdateEmptyLegWatchParams;
        result = await updateEmptyLegWatch(params);
        break;
      }

      case 'delete_empty_leg_watch': {
        const params = args as unknown as { watch_id: string };
        result = await deleteEmptyLegWatch(params);
        break;
      }

      case 'get_watch_matches': {
        const params = args as unknown as {
          watch_id: string;
          unviewed_only?: boolean;
          interested_only?: boolean;
          limit?: number;
        };
        result = await getWatchMatches(params);
        break;
      }

      case 'mark_match': {
        const params = args as unknown as MarkEmptyLegMatchParams;
        result = await markMatch(params);
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
 * Endpoint: POST /api/rfqs (not /rfqs)
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
/**
 * Normalize CreateTripParams to TripSegment array
 * Handles both legacy flat params and new segments[] array
 */
function normalizeToSegments(params: CreateTripParams): TripSegment[] {
  // If segments array is provided, use it directly
  if (params.segments && params.segments.length > 0) {
    return params.segments;
  }

  // Convert legacy flat params to segments array
  if (!params.departure_airport || !params.arrival_airport) {
    throw new Error('Either segments[] array OR (departure_airport + arrival_airport) are required');
  }
  if (!params.departure_date) {
    throw new Error('departure_date is required');
  }
  if (!params.passengers || params.passengers < 1) {
    throw new Error('passengers must be at least 1');
  }

  const segments: TripSegment[] = [
    {
      departure_airport: params.departure_airport,
      arrival_airport: params.arrival_airport,
      departure_date: params.departure_date,
      departure_time: params.departure_time,
      passengers: params.passengers,
    },
  ];

  // Add return segment if provided (round-trip)
  if (params.return_date) {
    segments.push({
      departure_airport: params.arrival_airport,
      arrival_airport: params.departure_airport,
      departure_date: params.return_date,
      departure_time: params.return_time,
      // Use return_passengers if specified, otherwise use outbound passengers
      passengers: params.return_passengers ?? params.passengers,
    });
  }

  return segments;
}

/**
 * Determine trip type based on segment count
 */
function determineTripType(segmentCount: number): TripType {
  if (segmentCount === 1) return 'single_leg';
  if (segmentCount === 2) return 'round_trip';
  return 'multi_city';
}

/**
 * Validate trip segments
 */
function validateSegments(segments: TripSegment[]): void {
  if (!segments || segments.length === 0) {
    throw new Error('At least one segment is required');
  }

  if (segments.length > 20) {
    throw new Error('Maximum 20 segments allowed');
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segNum = i + 1;

    if (!seg.departure_airport) {
      throw new Error(`Segment ${segNum}: departure_airport is required`);
    }
    if (!seg.arrival_airport) {
      throw new Error(`Segment ${segNum}: arrival_airport is required`);
    }
    if (seg.departure_airport === seg.arrival_airport) {
      throw new Error(`Segment ${segNum}: departure and arrival airports must be different`);
    }
    if (!seg.departure_date) {
      throw new Error(`Segment ${segNum}: departure_date is required`);
    }
    if (!seg.passengers || seg.passengers < 1) {
      throw new Error(`Segment ${segNum}: passengers must be at least 1`);
    }
    if (seg.passengers > 100) {
      throw new Error(`Segment ${segNum}: passengers cannot exceed 100`);
    }

    // Validate airport code format (3-4 alphanumeric characters)
    const airportRegex = /^[A-Z0-9]{3,4}$/;
    if (!airportRegex.test(seg.departure_airport.toUpperCase())) {
      throw new Error(`Segment ${segNum}: invalid departure_airport format (expected ICAO/IATA code)`);
    }
    if (!airportRegex.test(seg.arrival_airport.toUpperCase())) {
      throw new Error(`Segment ${segNum}: invalid arrival_airport format (expected ICAO/IATA code)`);
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(seg.departure_date)) {
      throw new Error(`Segment ${segNum}: invalid departure_date format (expected YYYY-MM-DD)`);
    }

    // Validate time format if provided (HH:MM)
    if (seg.departure_time) {
      const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(seg.departure_time)) {
        throw new Error(`Segment ${segNum}: invalid departure_time format (expected HH:MM)`);
      }
    }
  }
}

async function createTrip(params: CreateTripParams) {
  // Normalize params to segments array
  const tripSegments = normalizeToSegments(params);

  // Validate all segments
  validateSegments(tripSegments);

  // Determine trip type
  const tripType = determineTripType(tripSegments.length);

  console.error('[createTrip] Processing trip:', {
    tripType,
    segmentCount: tripSegments.length,
    segments: tripSegments.map((s, i) => ({
      order: i,
      route: `${s.departure_airport} → ${s.arrival_airport}`,
      date: s.departure_date,
      passengers: s.passengers,
    })),
  });

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
  }> = tripSegments.map((seg) => ({
    startAirport: { icao: seg.departure_airport.toUpperCase() },
    endAirport: { icao: seg.arrival_airport.toUpperCase() },
    dateTime: {
      date: seg.departure_date,
      time: seg.departure_time || '10:00',
    },
    paxCount: String(seg.passengers),
    paxSegment: true,
  }));

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
      segments: Array.isArray(requestBody.segments) ? requestBody.segments.length : 0,
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

    // Build legacy route format for backward compatibility (single-leg and round-trip)
    const legacyRoute = tripType !== 'multi_city' ? {
      departure: {
        airport: tripSegments[0].departure_airport,
        date: tripSegments[0].departure_date,
        time: tripSegments[0].departure_time,
      },
      arrival: {
        airport: tripSegments[0].arrival_airport,
      },
      return: tripSegments.length > 1 ? {
        date: tripSegments[1].departure_date,
        time: tripSegments[1].departure_time,
      } : undefined,
    } : undefined;

    // Return in the format expected by the UI (enhanced for multi-segment)
    const result = {
      trip_id: tripId,
      deep_link: deepLink || undefined,
      search_link: actions.searchInAvinode?.href || deepLink || undefined,
      view_link: actions.viewInAvinode?.href || undefined,
      cancel_link: actions.cancel?.href || undefined,
      status: 'created',
      created_at: new Date().toISOString(),
      // New fields for multi-segment support
      trip_type: tripType,
      segment_count: tripSegments.length,
      // Legacy route format (for backward compatibility)
      route: legacyRoute,
      // New segments array (always included for all trip types)
      segments: tripSegments,
      // Passengers from first segment (for backward compatibility)
      passengers: tripSegments[0].passengers,
    };

    console.error('[createTrip] Successfully created trip:', {
      trip_id: result.trip_id,
      trip_type: result.trip_type,
      segment_count: result.segment_count,
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
        // Log whether segments or legacy params were used
        mode: params.segments?.length ? 'segments' : 'legacy',
        segment_count: params.segments?.length,
        departure_airport: params.departure_airport,
        arrival_airport: params.arrival_airport,
        departure_date: params.departure_date,
        passengers: params.passengers,
        return_date: params.return_date,
        return_passengers: params.return_passengers,
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
  // Avinode API response structure can have quotes in multiple locations:
  // - rfqData.quotes[] - Direct quotes array
  // - rfqData.requests[] - Request objects with quotes
  // - rfqData.responses[] - Response objects with quotes
  // - rfqData.sellerLift[] - Seller lift array (PRIMARY location for quotes with prices)
  // - rfqData.lifts[] - Alternative lift array name
  const quotesFromQuotes = Array.isArray(rfqData.quotes) ? rfqData.quotes : [];
  const quotesFromRequests = Array.isArray(rfqData.requests) ? rfqData.requests : [];
  const quotesFromResponses = Array.isArray(rfqData.responses) ? rfqData.responses : [];
  
  // PRIMARY: Extract quotes from sellerLift array (this is where Avinode API returns quotes with prices)
  // sellerLift[] contains lift objects, each lift may have:
  // - lift.quote_id - The quote ID
  // - lift.price - The quote price
  // - lift.currency - The currency
  // - lift.status - Quote status (quoted, declined, etc.)
  // - lift.sellerCompany - Operator information
  // - lift.links.quotes[] - Links to quote details
  const sellerLifts = Array.isArray(rfqData.sellerLift) ? rfqData.sellerLift :
                      (Array.isArray(rfqData.lifts) ? rfqData.lifts : []);

  // FIX: Attach sellerCompany from RFQ level to each lift (sellerCompany is at RFQ level, not lift level)
  // This ensures operator name is available for all lifts (including unanswered ones)
  const sellerCompanyFromRFQ = rfqData.sellerCompany;

  // Extract quotes from sellerLift array
  // IMPORTANT: Based on API testing, sellerLift[] contains lift objects with:
  // - lift.id - Lift identifier (asellerlift-*)
  // - lift.links.quotes[] - Array of quote link objects with { id, href, type }
  // - lift.aircraftType, lift.aircraftTail - Aircraft information
  // - lift.sourcingStatus, lift.sourcingDisplayStatus - Status information
  // NOTE: Prices are NOT in sellerLift directly - they must be fetched from the quote endpoint
  // using the quote ID from lift.links.quotes[].id
  // IMPORTANT: After fetching quote details, the lift object is merged with quote details
  // So lift.sellerPrice, lift.sellerMessage, etc. are already available from the merged quote details
  const quotesFromSellerLift = sellerLifts.flatMap((lift: any) => {
    // Check if lift has quote links (PRIMARY structure from API)
    if (lift.links?.quotes && Array.isArray(lift.links.quotes)) {
      // Each quote link contains { id, href, type }
      // CRITICAL: After fetching quote details, the lift object is merged with quote details
      // So we should use the lift object directly (which has sellerPrice, sellerMessage merged in)
      // instead of creating a new object with price: 0
      return lift.links.quotes.map((quoteLink: any) => {
        // Use the merged lift object as the base (includes sellerPrice, sellerMessage from fetched quote details)
        // Only override specific fields that come from the quote link
        return {
          ...lift, // Spread the entire lift object (includes merged quote details: sellerPrice, sellerMessage, etc.)
          // FIX: Attach sellerCompany from RFQ level (operator info is at RFQ level, not lift level)
          sellerCompany: lift.sellerCompany || sellerCompanyFromRFQ,
          // Quote ID from link (override if needed)
          quote_id: quoteLink.id,
          id: quoteLink.id,
          // Ensure aircraft data is accessible (may already be in lift from merge)
          aircraft: lift.aircraft || {
            type: lift.aircraftType,
            tailNumber: lift.aircraftTail,
            category: lift.aircraftCategory,
          },
          // Status from lift - check both camelCase and snake_case variants
          // Note: Actual status determination happens later in transform function
          status: (lift.sourcingDisplayStatus || lift.sourcing_display_status) === 'Accepted' ? 'quoted' :
                  (lift.sourcingDisplayStatus || lift.sourcing_display_status) === 'Declined' ? 'declined' :
                  lift.status || 'pending',
          sourcingStatus: lift.sourcingStatus ?? lift.sourcing_status,
          sourcingDisplayStatus: lift.sourcingDisplayStatus || lift.sourcing_display_status,
          // Also include snake_case variant for compatibility
          sourcing_display_status: lift.sourcing_display_status || lift.sourcingDisplayStatus,
          sourcing_status: lift.sourcing_status ?? lift.sourcingStatus,
          // Store lift ID for reference
          lift_id: lift.id,
          // CRITICAL: sellerPrice and sellerMessage are already in lift from merged quote details
          // Don't override with price: 0 - use the merged data
          // price and currency will come from lift.sellerPrice (merged from quote details)
        };
      });
    }
    // Fallback: Only return lift as a quote if it has ACTUAL price data
    // FIX: Removed `lift.id` from condition - lift.id always exists for sellerLift items
    // but doesn't indicate the lift has quote/price data (just that it's a valid lift)
    // This prevents lifts without prices from being displayed as "$0.00" quotes
    const hasActualPriceData =
      lift.quote_id || // Has a quote ID (indicates quote was submitted)
      lift.price !== undefined || // Has direct price field
      lift.sellerPrice?.price > 0 || // Has sellerPrice (from Avinode quote)
      lift.pricing?.total > 0 || // Has pricing breakdown
      lift.totalPrice?.amount > 0 || // Has totalPrice object
      lift.estimatedPrice?.amount > 0; // Has estimated marketplace price

    if (hasActualPriceData) {
      console.log('[transformToRFQFlights] Including lift as quote (has price data):', {
        lift_id: lift.id,
        quote_id: lift.quote_id,
        hasSellerPrice: !!lift.sellerPrice?.price,
        hasPricing: !!lift.pricing?.total,
        hasEstimatedPrice: !!lift.estimatedPrice?.amount,
      });
      return [lift];
    }

    // Lift exists but has no price data - this is an RFQ recipient that hasn't quoted yet
    // FIX: Include ALL lifts (even without prices) so unanswered RFQs appear in the UI
    // Users expect to see all RFQs regardless of status, with "Price Pending" for unanswered ones
    console.log('[transformToRFQFlights] Including lift WITHOUT price data (unanswered):', {
      lift_id: lift.id,
      sourcingDisplayStatus: lift.sourcingDisplayStatus || lift.sourcing_display_status,
      hasLinks: !!lift.links,
      hasQuoteLinks: !!(lift.links?.quotes),
      sellerCompany: sellerCompanyFromRFQ?.displayName,
    });
    // Return the lift with explicit unanswered markers
    return [{
      ...lift,
      // FIX: Attach sellerCompany from RFQ level (operator info is at RFQ level, not lift level)
      sellerCompany: lift.sellerCompany || sellerCompanyFromRFQ,
      // Create a stable ID for unanswered lifts
      id: lift.id || `unanswered-${Date.now()}`,
      quote_id: lift.id, // Use lift ID as quote ID for unanswered
      // Mark as unanswered RFQ (no price yet)
      _isUnansweredRFQ: true,
      // Ensure status is unanswered
      sourcingDisplayStatus: lift.sourcingDisplayStatus || lift.sourcing_display_status || 'Unanswered',
      // Ensure price fields are 0 (will show "Price Pending" in UI)
      totalPrice: 0,
      sellerPrice: undefined,
    }];
  });
  
  // Log sellerLift extraction for debugging
  if (quotesFromSellerLift.length > 0) {
    const sampleQuote = quotesFromSellerLift[0];
    console.log('[transformToRFQFlights] Extracted', quotesFromSellerLift.length, 'quotes from sellerLift');
    console.log('[transformToRFQFlights] Sample sellerLift quote:', {
      quote_id: sampleQuote.quote_id,
      id: sampleQuote.id,
      // CRITICAL: Check if sellerPrice is present (from merged quote details)
      has_sellerPrice: !!sampleQuote.sellerPrice,
      sellerPrice: sampleQuote.sellerPrice,
      sellerPrice_price: sampleQuote.sellerPrice?.price,
      sellerPrice_currency: sampleQuote.sellerPrice?.currency,
      // Legacy price fields (should be 0 if sellerPrice is used)
      price: sampleQuote.price,
      currency: sampleQuote.currency,
      status: sampleQuote.status,
      operator: sampleQuote.sellerCompany?.displayName,
      has_sellerMessage: !!sampleQuote.sellerMessage,
      // Log all keys to see what's available
      keys: Object.keys(sampleQuote),
    });
    
    // CRITICAL: Verify that sellerPrice is accessible
    if (sampleQuote.sellerPrice?.price) {
      console.log('[transformToRFQFlights] ✅ sellerPrice found in quote object:', sampleQuote.sellerPrice.price, sampleQuote.sellerPrice.currency);
    } else {
      console.warn('[transformToRFQFlights] ⚠️ sellerPrice NOT found in quote object - price extraction will fail');
    }
  }
  
  // Use a Set to deduplicate by quote ID if the same quote appears in multiple arrays
  const allQuotesMap = new Map<string, any>();
  
  // Add quotes from all sources, using quote ID as key to prevent duplicates
  // PRIORITY: sellerLift quotes first (most reliable source with prices), then others
  [...quotesFromSellerLift, ...quotesFromQuotes, ...quotesFromRequests, ...quotesFromResponses].forEach((quote: any) => {
    const quoteId = quote.quote_id || quote.quote?.id || quote.id;
    if (quoteId && !allQuotesMap.has(quoteId)) {
      allQuotesMap.set(quoteId, quote);
    } else if (!quoteId) {
      // If no ID, add with index-based key to preserve it
      allQuotesMap.set(`no-id-${allQuotesMap.size}`, quote);
    }
  });
  
  // Convert map back to array
  const quotes = Array.from(allQuotesMap.values());
  
  // Log quote sources for debugging
  if (quotes.length > 0) {
    console.log('[transformToRFQFlights] Quote sources:', {
      sellerLift: quotesFromSellerLift.length,
      quotes: quotesFromQuotes.length,
      requests: quotesFromRequests.length,
      responses: quotesFromResponses.length,
      total: quotes.length,
    });
  }

  // Get route data from RFQ level (fallback for quote-level route data)
  // IMPORTANT: Avinode API returns route data in multiple possible locations:
  // 1. rfqData.segments[0].startAirport/endAirport (PRIMARY - from trip segments)
  // 2. rfqData.route?.departure?.airport (legacy structure)
  // 3. rfqData.departureAirport/arrivalAirport (direct fields)
  const segment = Array.isArray(rfqData.segments) && rfqData.segments.length > 0 ? rfqData.segments[0] : null;

  // PRIMARY: Extract from segments (preferred structure from Avinode API)
  const rfqDepartureAirport = segment?.startAirportDetails || segment?.startAirport ||
                              rfqData.route?.departure?.airport ||
                              rfqData.departureAirport;
  const rfqArrivalAirport = segment?.endAirportDetails || segment?.endAirport ||
                            rfqData.route?.arrival?.airport ||
                            rfqData.arrivalAirport;
  const rfqDepartureDate = segment?.dateTime?.date || segment?.departureDateTime?.dateTimeLocal ||
                           rfqData.route?.departure?.date ||
                           rfqData.departureDate;
  const rfqPassengers = segment?.paxCount ? parseInt(segment.paxCount, 10) : rfqData.passengers;

  // Log route extraction for debugging
  console.log('[transformToRFQFlights] Route data extraction:', {
    hasSegments: !!segment,
    segmentCount: rfqData.segments?.length || 0,
    departure: rfqDepartureAirport?.icao || rfqDepartureAirport?.searchValue || 'MISSING',
    arrival: rfqArrivalAirport?.icao || rfqArrivalAirport?.searchValue || 'MISSING',
    departureDate: rfqDepartureDate || 'MISSING',
    passengers: rfqPassengers || 'MISSING',
  });

  return quotes.map((quote: any, index: number): RFQFlight | null => {
    // Derive RFQ status from quote response
    // When operator responds with a quote, status should be 'quoted'
    // When operator declines, status should be 'declined'
    // Otherwise, status is 'unanswered' or 'sent' (if RFQ was sent but no response yet)
    // 
    // CRITICAL: Status can come from multiple sources:
    // 1. quote.status (direct status field)
    // 2. quote.sourcingDisplayStatus / quote.sourcing_display_status (from sellerLift - "Accepted" = quoted, "Declined" = declined)
    // 3. quote.sourcingStatus / quote.sourcing_status (numeric: 2 = Accepted/quoted)
    // 4. quote.quote?.status (nested quote object)
    // 5. rfqData.status (RFQ-level status)
    let rfqStatus: RFQFlight['rfqStatus'];
    
    // Normalize field names - check both camelCase and snake_case variants (API may use either)
    const sourcingDisplayStatus = quote.sourcingDisplayStatus || quote.sourcing_display_status;
    const sourcingStatus = quote.sourcingStatus ?? quote.sourcing_status;
    const sourcingDisplayNormalized = String(sourcingDisplayStatus || '').toLowerCase();
    
    // PRIMARY: Check sourcingDisplayStatus from sellerLift (most reliable for Avinode API)
    // IMPORTANT: Avinode marketplace can show "Unanswered" even when price > 0 exists
    // - "Accepted" means operator has provided a quote (quoted status)
    // - "Unanswered" means RFQ sent but awaiting response (even if price exists in UI)
    // - "Declined" means operator declined the request
    // Normalize to lowercase for case-insensitive comparison
    if (sourcingDisplayNormalized === 'accepted') {
      rfqStatus = 'quoted';
    } else if (sourcingDisplayNormalized === 'unanswered' || sourcingDisplayNormalized === 'pending' || sourcingDisplayNormalized === 'open') {
      // In Avinode, "Unanswered" can have prices - this is a valid state
      // However, if price > 0 AND we have quote data, treat as quoted (per user requirement)
      rfqStatus = 'unanswered';
    } else if (sourcingDisplayNormalized === 'declined') {
      rfqStatus = 'declined';
    } else if (sourcingDisplayNormalized === 'expired') {
      rfqStatus = 'expired';
    }
    // SECONDARY: Check sourcingStatus (numeric: 2 = Accepted/quoted, 3 = Declined)
    else if (sourcingStatus === 2) {
      rfqStatus = 'quoted';
    } else if (sourcingStatus === 3) {
      rfqStatus = 'declined';
    }
    // TERTIARY: Check quote.status (direct status field) - normalize to lowercase for comparison
    else {
      const statusRaw = quote.status || quote.quote?.status || quote.rfqStatus || quote.rfq_status || quote.quote_status;
      const statusNormalized = String(statusRaw || '').toLowerCase();
      
      if (statusNormalized === 'quoted' || statusNormalized === 'received' || statusNormalized === 'accepted') {
        rfqStatus = 'quoted';
      } else if (statusNormalized === 'declined' || statusNormalized === 'rejected') {
        rfqStatus = 'declined';
      } else if (statusNormalized === 'expired') {
        rfqStatus = 'expired';
      } else if (statusNormalized === 'sent' || rfqData.status === 'sent') {
        // RFQ was sent but no response yet
        rfqStatus = 'sent';
      } else if (statusNormalized === 'pending' || statusNormalized === 'open') {
        rfqStatus = 'unanswered';
      } else {
        // Default to unanswered if no clear status
        rfqStatus = 'unanswered';
      }
    }
    
           // Log status determination for debugging (include both camelCase and snake_case variants)
           console.log('[transformToRFQFlights] 📊 Status determination for quote', quote.quote?.id || quote.id || quote.quote_id, ':', {
             finalStatus: rfqStatus,
             sourcingDisplayStatus_camelCase: quote.sourcingDisplayStatus,
             sourcingDisplayStatus_snakeCase: quote.sourcing_display_status,
             sourcingDisplayStatus_normalized: sourcingDisplayNormalized,
             sourcingStatus_camelCase: quote.sourcingStatus,
             sourcingStatus_snakeCase: quote.sourcing_status,
             sourcingStatus_value: sourcingStatus,
             quote_status: quote.status,
             quote_quote_status: quote.quote?.status,
             rfqData_status: rfqData.status,
             statusIsUnanswered: rfqStatus === 'unanswered',
             statusIsQuoted: rfqStatus === 'quoted',
           })
    
    // Extract pricing data FIRST (before status determination)
    // This ensures we always try to extract price, even if status determination fails
    // IMPORTANT: Based on API testing, prices are in sellerPrice object when fetching quote details
    // When you fetch /quotes/{id}, the response contains:
    // - sellerPrice.price (PRIMARY - the actual quote price)
    // - sellerPrice.currency (PRIMARY - the currency code)
    // - sellerPriceWithoutCommission.price (alternative - price without commission)
    // The fetched quote details are merged into the lift object, so we check:
    // - quote.sellerPrice.price (PRIMARY - from fetched quote details)
    // - quote.sellerPrice.currency (PRIMARY - from fetched quote details)
    // - quote.sellerPriceWithoutCommission.price (fallback - price without commission)
    // - quote.totalPrice.amount (fallback - if available in some responses)
    // - quote.price (fallback - direct price if available)
    // CRITICAL: After merging quote details into sellerLift, sellerPrice is at the top level
    // Check sellerPrice first (from merged quote details), then fallbacks
    // IMPORTANT: ALWAYS try to extract price (don't gate on hasQuote) - if price exists, it's a quote
    // FIX: Added estimatedPrice fallback for "Unanswered" RFQs (initial RFQ submission price)
    let totalPrice =
      quote.sellerPrice?.price || // PRIMARY: From fetched quote details (merged at top level)
      quote.sellerPriceWithoutCommission?.price || // Fallback: Price without commission
      quote.totalPrice?.amount || // Fallback: Structured price object (if available)
      quote.quote?.sellerPrice?.price || // Fallback: Nested quote.sellerPrice
      quote.quote?.totalPrice?.amount || // Fallback: Nested quote object
      quote.estimatedPrice?.amount || // FIX: Initial RFQ submission price (for Unanswered status)
      (quote as any).estimated_price?.amount || // FIX: Snake_case variant
      quote.price || // Fallback: Direct price from sellerLift (if available)
      quote.pricing?.total || // Fallback: Pricing breakdown total
      0;

    let currency =
      quote.sellerPrice?.currency || // PRIMARY: From fetched quote details (merged at top level)
      quote.sellerPriceWithoutCommission?.currency || // Fallback: Currency without commission
      quote.totalPrice?.currency || // Fallback: Structured price object (if available)
      quote.quote?.sellerPrice?.currency || // Fallback: Nested quote.sellerPrice
      quote.quote?.totalPrice?.currency || // Fallback: Nested quote object
      quote.estimatedPrice?.currency || // FIX: Initial RFQ submission currency (for Unanswered status)
      (quote as any).estimated_price?.currency || // FIX: Snake_case variant
      quote.currency || // Fallback: Direct currency from sellerLift (if available)
      quote.pricing?.currency || // Fallback: Pricing breakdown currency
      'USD';
    
    // CRITICAL: Check if we have a price from merged quote details
    // If sellerPrice exists, it means we fetched quote details and have a price
    // This should override the status determination - if there's a price, it's a quote
    const hasSellerPrice = !!(quote.sellerPrice?.price || quote.sellerPriceWithoutCommission?.price || totalPrice > 0);
    
    // USER REQUIREMENT: If totalPrice > 0, status should be 'quoted'
    // This is the business logic - even if Avinode shows "Unanswered", if there's a price, show "Quoted"
    // This handles the case where Avinode marketplace UI shows "Unanswered" but the quote has been submitted
    // Note: Avinode can have "Unanswered" status with prices > 0 in their UI, but we want to show "Quoted" in ours
    if (totalPrice > 0 && totalPrice !== 0) {
      // Price exists - treat as quoted (per user requirement: "If totalPrice > 0, the status will be 'quoted'")
      if (rfqStatus !== 'declined' && rfqStatus !== 'expired') {
        // Only override if not explicitly declined/expired
        if (rfqStatus === 'unanswered' || rfqStatus === 'sent' || !rfqStatus) {
          console.log('[transformToRFQFlights] ✅ Price > 0 exists (' + totalPrice + ' ' + currency + ') - updating status to quoted (was:', rfqStatus, ', sourcingDisplayStatus:', sourcingDisplayStatus, ')');
          rfqStatus = 'quoted';
        }
      }
    }
    
    const hasQuote = rfqStatus === 'quoted' || hasSellerPrice;

    // Extract aircraft data
    // FIX: Check sellerLift fields first (aircraftType, aircraftSuperType, aircraftTail, maxPax)
    // then fallback to quote.aircraft.* fields for compatibility
    const aircraftType = quote.aircraftType || quote.aircraftSuperType || quote.aircraft?.type || 'Unknown';
    const aircraftModel = quote.aircraftType || quote.aircraftSuperType || quote.aircraft?.model || quote.aircraft?.type || 'Unknown';
    const tailNumber = quote.aircraftTail || quote.aircraft?.tailNumber || quote.aircraft?.registration;
    const yearOfManufacture = quote.aircraft?.yearOfManufacture || quote.aircraft?.year_built;
    const passengerCapacity = quote.maxPax || quote.aircraft?.capacity || rfqData.passengers || 0;
    const aircraftCategoryFromLift = quote.aircraftCategory; // From sellerLift (e.g., "Heavy jet", "Ultra long range")
    
           // Log price extraction for debugging
           if (hasQuote && totalPrice > 0) {
             console.log('[transformToRFQFlights] ✅ Extracted price for quote', quote.quote?.id || quote.id || quote.quote_id, ':', currency, totalPrice, {
               from_sellerPrice: !!quote.sellerPrice?.price,
               from_quote_sellerPrice: !!quote.quote?.sellerPrice?.price,
               from_totalPrice: !!quote.totalPrice?.amount,
               from_price: !!quote.price,
               sellerPrice_value: quote.sellerPrice,
               quote_keys: Object.keys(quote),
             });
           } else if (hasQuote && totalPrice === 0) {
             console.error('[transformToRFQFlights] ❌ Quote has no price extracted - THIS IS THE PROBLEM:', {
               quote_id: quote.quote?.id || quote.id || quote.quote_id,
               has_sellerPrice: !!quote.sellerPrice,
               sellerPrice_value: quote.sellerPrice,
               sellerPrice_type: typeof quote.sellerPrice,
               has_quote: !!quote.quote,
               quote_keys: quote.quote ? Object.keys(quote.quote) : [],
               quote_keys_all: Object.keys(quote),
               // Log the actual quote object structure to debug
               quote_sample: JSON.stringify(quote).substring(0, 500),
             });
           }
           
           // CRITICAL: Always log price extraction result (even if 0) to debug
           console.log('[transformToRFQFlights] 💰 Price extraction result:', {
             quoteId: quote.quote?.id || quote.id || quote.quote_id,
             totalPrice,
             currency,
             hasQuote,
             priceIsZero: totalPrice === 0,
             sellerPrice: quote.sellerPrice,
             sellerPricePrice: quote.sellerPrice?.price,
             sellerPriceCurrency: quote.sellerPrice?.currency,
           })
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
    const passengers = quote.passengers || rfqPassengers;

    // Extract ICAO codes - handle multiple possible structures from Avinode API:
    // 1. airport.icao (standard structure)
    // 2. airport.searchValue (from segments)
    // 3. airport directly as string (rare)
    const getIcao = (airport: any): string | undefined => {
      if (!airport) return undefined;
      if (typeof airport === 'string') return airport;
      return airport.icao || airport.searchValue || airport.code;
    };

    const departureIcao = getIcao(departureAirport);
    const arrivalIcao = getIcao(arrivalAirport);

    // Validate that we have airport data
    if (!departureIcao || !arrivalIcao) {
      console.error('[transformToRFQFlights] Missing airport data', {
        quoteId: quote.quote?.id || quote.id,
        hasQuoteDeparture: !!quote.route?.departure?.airport,
        hasRfqDeparture: !!rfqDepartureAirport,
        hasQuoteArrival: !!quote.route?.arrival?.airport,
        hasRfqArrival: !!rfqArrivalAirport,
        departureAirport,
        arrivalAirport,
        departureIcao,
        arrivalIcao,
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
    // NOTE: sellerMessage is a string field (operator message text), not an object with an ID
    // For actual message objects, check message.id or links.tripmsgs[]
    const messageId = quote.message?.id || 
                     quote.messageId || 
                     quote.latestMessage?.id ||
                     quote.messages?.[0]?.id ||
                     (quote.sellerMessage && typeof quote.sellerMessage === 'object' ? quote.sellerMessage.id : undefined);
    
    // Extract seller message text (PRIMARY source for operator messages from quote API)
    // sellerMessage is a string field in the quote response containing the operator's message
    // This is the message that operators include when submitting quotes
    // Example: "This price is subject to availability, slots, traffic rights and schedule..."
    const sellerMessageText = typeof quote.sellerMessage === 'string' 
      ? quote.sellerMessage 
      : (quote.sellerMessage?.content || quote.sellerMessage?.text || undefined);
    
    // Log seller message extraction for debugging
    if (sellerMessageText) {
      console.log('[transformToRFQFlights] Found seller message for quote', quote.quote?.id || quote.id, ':', sellerMessageText.substring(0, 100));
    }

    // CRITICAL: Log final RFQFlight object before returning
    // Extract quoteId consistently - check all possible field names (must match line 1122 logic)
    // Use the same extraction logic as the deduplication step to ensure consistency
    const extractedQuoteId = quote.quote_id || quote.quote?.id || quote.id || `quote-${index + 1}`
    const finalRFQFlight = {
      id: `flight-${extractedQuoteId}`,
      quoteId: extractedQuoteId, // Use consistent quoteId extraction
      // Include messageId if available (for retrieving specific messages)
      messageId: messageId,
      // Include seller message text if available (from quote.sellerMessage field)
      // This is the PRIMARY source for operator messages when fetching quote details
      sellerMessage: sellerMessageText,
      departureAirport: {
        icao: departureIcao,
        name: departureAirport?.name || quote.route?.departure?.name,
        city: departureAirport?.city || quote.route?.departure?.city,
      },
      arrivalAirport: {
        icao: arrivalIcao,
        name: arrivalAirport?.name || quote.route?.arrival?.name,
        city: arrivalAirport?.city || quote.route?.arrival?.city,
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
      operatorName: quote.sellerCompany?.displayName || // From sellerLift (PRIMARY)
                    quote.seller?.companyName || 
                    quote.operator?.name || 
                    quote.operator_name || 
                    quote.seller?.name ||
                    'Unknown Operator',
      operatorRating: quote.seller?.rating || quote.operator?.rating,
      operatorEmail: quote.seller?.email || quote.operator?.email,
      // CRITICAL: Set totalPrice and currency from extracted values
      // These should come from quote.sellerPrice (merged from fetched quote details)
      totalPrice: totalPrice || 0, // Ensure it's never undefined
      currency: currency || 'USD', // Ensure it's never undefined
      priceBreakdown,
      validUntil: hasQuote ? quote.validUntil : undefined,
      amenities,
      rfqStatus,
      lastUpdated: quote.updated_at || quote.received_at || new Date().toISOString(),
      responseTimeMinutes: quote.response_time_minutes,
      isSelected: false,
      avinodeDeepLink: rfqData.deep_link,
    }
    
    // CRITICAL: Log final RFQFlight object to verify price and status
    console.log('[transformToRFQFlights] 🎯 FINAL RFQFlight object:', {
      id: finalRFQFlight.id,
      quoteId: finalRFQFlight.quoteId,
      totalPrice: finalRFQFlight.totalPrice,
      currency: finalRFQFlight.currency,
      rfqStatus: finalRFQFlight.rfqStatus,
      operatorName: finalRFQFlight.operatorName,
      priceIsZero: finalRFQFlight.totalPrice === 0,
      statusIsUnanswered: finalRFQFlight.rfqStatus === 'unanswered',
      statusIsQuoted: finalRFQFlight.rfqStatus === 'quoted',
    })
    
    return finalRFQFlight
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
      // NOTE: sellerLift is handled in transformToRFQFlights, not here
      const quotes = rfq.quotes || 
                    rfq.requests || 
                    rfq.responses || 
                    (rfq.lifts && Array.isArray(rfq.lifts) ? rfq.lifts.flatMap((lift: any) => lift.quotes || []) : []) ||
                    [];
      
      // Check for sellerLift array (PRIMARY location for quotes with prices in Avinode API)
      const hasSellerLift = !!(rfq.sellerLift && Array.isArray(rfq.sellerLift) && rfq.sellerLift.length > 0);
      const sellerLiftCount = hasSellerLift ? rfq.sellerLift.length : 0;
      
      console.log('[getRFQ] Processing RFQ:', {
        rfq_id: rfq.rfq_id || rfq.id,
        trip_id: rfq.trip_id,
        status: rfq.status,
        has_quotes: !!(rfq.quotes && rfq.quotes.length > 0),
        has_sellerLift: hasSellerLift, // PRIMARY: Check sellerLift array
        sellerLift_count: sellerLiftCount,
        has_lifts: !!(rfq.lifts && Array.isArray(rfq.lifts) && rfq.lifts.length > 0),
        has_requests: !!(rfq.requests && rfq.requests.length > 0),
        has_responses: !!(rfq.responses && rfq.responses.length > 0),
        quotes_count: quotes.length,
        rfq_keys: Object.keys(rfq),
      });
      
      // IMPORTANT: Extract quote IDs from sellerLift[].links.quotes[] and fetch quote details for prices
      // Based on API testing, sellerLift contains lift objects with links.quotes[] array
      // Each quote link has { id, href, type } - we need to fetch the quote details to get prices
      if (hasSellerLift) {
        const quoteIds: string[] = [];
        for (const lift of rfq.sellerLift) {
          if (lift.links?.quotes && Array.isArray(lift.links.quotes)) {
            for (const quoteLink of lift.links.quotes) {
              if (quoteLink.id) {
                quoteIds.push(quoteLink.id);
              }
            }
          }
        }
        
        if (quoteIds.length > 0) {
          console.log('[getRFQ] Found', quoteIds.length, 'quote IDs in sellerLift, fetching quote details for prices...');
          
          // Fetch quote details to get prices
          // This ensures we have complete price information when transforming to RFQFlight
          // Pattern from test script: GET /quotes/{quoteId} returns quote details with sellerPrice
          const quoteDetails = await Promise.all(
            quoteIds.map(async (quoteId: string) => {
              try {
                const quoteResponse = await avinodeClient.get(`/quotes/${quoteId}`, {
                  params: {
                    taildetails: true,
                    typedetails: true,
                    tailphotos: true,
                    typephotos: true,
                    quotebreakdown: true,
                    latestquote: true,
                  },
                });
                
                // Extract quote data from response (handle multiple nested data structures)
                // Avinode API response can be at different nesting levels depending on endpoint version:
                // - quoteResponse (if avinodeClient.get already unwrapped)
                // - quoteResponse.data (single level wrap)
                // - quoteResponse.data.data (double level wrap - seen in some API versions)
                let quoteData = quoteResponse as any;

                // Check for nested .data and unwrap if sellerPrice is deeper
                if (quoteData?.data && !quoteData?.sellerPrice) {
                  // Check if .data has sellerPrice (single wrap)
                  if (quoteData.data.sellerPrice) {
                    quoteData = quoteData.data;
                  }
                  // Check if .data.data has sellerPrice (double wrap)
                  else if (quoteData.data?.data?.sellerPrice) {
                    quoteData = quoteData.data.data;
                  }
                  // Otherwise just use .data
                  else if (typeof quoteData.data === 'object') {
                    quoteData = quoteData.data;
                  }
                }

                // DEBUG: Log the extraction process
                console.log('[getRFQ] Quote data extraction for', quoteId, ':', {
                  responseType: typeof quoteResponse,
                  responseKeys: quoteResponse ? Object.keys(quoteResponse as any).slice(0, 10) : [],
                  hasDataProperty: !!(quoteResponse as any)?.data,
                  hasSellerPriceAtRoot: !!(quoteResponse as any)?.sellerPrice,
                  hasSellerPriceInData: !!(quoteResponse as any)?.data?.sellerPrice,
                  hasSellerPriceInDataData: !!(quoteResponse as any)?.data?.data?.sellerPrice,
                  finalQuoteDataKeys: quoteData ? Object.keys(quoteData).slice(0, 10) : [],
                  finalSellerPrice: quoteData?.sellerPrice,
                  finalId: quoteData?.id,
                });

                return quoteData;
              } catch (error: any) {
                console.warn('[getRFQ] Failed to fetch quote details for', quoteId, ':', error?.message || 'Unknown error');
                return null;
              }
            })
          );
          
          // Merge quote details into sellerLift objects
          const validQuoteDetails = quoteDetails.filter(Boolean);
          if (validQuoteDetails.length > 0) {
            console.log('[getRFQ] Successfully fetched', validQuoteDetails.length, 'quote details with prices');
            // Attach quote details to sellerLift for transformToRFQFlights to use
            for (let i = 0; i < rfq.sellerLift.length; i++) {
              const lift = rfq.sellerLift[i];
              if (lift.links?.quotes && Array.isArray(lift.links.quotes)) {
                for (let j = 0; j < lift.links.quotes.length; j++) {
                  const quoteLink = lift.links.quotes[j];
                  // Match quote detail by ID - check multiple possible ID fields
                  const quoteDetail = validQuoteDetails.find((qd: any) => {
                    const qdId = qd.id || qd.quote_id || qd.quoteId;
                    const linkId = quoteLink.id || quoteLink.quote_id;
                    return qdId === linkId;
                  });
                  if (quoteDetail) {
                    console.log('[getRFQ] Matching quote detail to lift:', {
                      quoteLinkId: quoteLink.id,
                      quoteDetailId: quoteDetail.id || quoteDetail.quote_id,
                      hasSellerPrice: !!quoteDetail.sellerPrice,
                      sellerPricePrice: quoteDetail.sellerPrice?.price,
                      sellerPriceCurrency: quoteDetail.sellerPrice?.currency,
                    });
                    // Merge quote details into lift object for transformToRFQFlights
                    // IMPORTANT: sellerMessage contains the operator's message text
                    // This is the PRIMARY source for operator messages when quotes are fetched
                    // CRITICAL: Preserve the lift structure while merging quote details
                    // The transformToRFQFlights function expects sellerLift items to have:
                    // - links.quotes[] (for quote ID)
                    // - sellerPrice (from quoteDetail)
                    // - sellerMessage (from quoteDetail)
                    // - All other quote fields merged at top level
                    rfq.sellerLift[i] = {
                      ...lift,
                      ...quoteDetail, // Merge all quote detail fields (including sellerPrice, sellerMessage)
                      quote: quoteDetail, // Also store in quote field for compatibility
                      // Ensure sellerPrice is accessible at top level (PRIMARY source for price extraction)
                      sellerPrice: quoteDetail.sellerPrice || lift.sellerPrice,
                      // Ensure sellerMessage is accessible at top level (PRIMARY source for message extraction)
                      sellerMessage: quoteDetail.sellerMessage || lift.sellerMessage,
                      // Preserve links structure (needed for quote ID extraction)
                      links: lift.links || quoteDetail.links,
                    };
                    
                    // Log price and message extraction for debugging
                    if (quoteDetail.sellerPrice?.price) {
                      console.log('[getRFQ] ✅ Merged quote details for', quoteLink.id, '- Price:', quoteDetail.sellerPrice.price, quoteDetail.sellerPrice.currency);
                    } else {
                      console.warn('[getRFQ] ⚠️ Quote detail for', quoteLink.id, 'has no sellerPrice:', {
                        hasSellerPrice: !!quoteDetail.sellerPrice,
                        sellerPrice: quoteDetail.sellerPrice,
                        hasPricing: !!quoteDetail.pricing,
                        pricing: quoteDetail.pricing,
                        keys: Object.keys(quoteDetail),
                      });
                    }
                    if (quoteDetail.sellerMessage) {
                      console.log('[getRFQ] Found seller message for quote', quoteLink.id, ':', quoteDetail.sellerMessage.substring(0, 100));
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      // Log sellerLift structure if present (for debugging price extraction)
      if (hasSellerLift && rfq.sellerLift.length > 0) {
        const sampleLift = rfq.sellerLift[0];
        console.log('[getRFQ] sellerLift sample after fetching quote details:', {
          lift_id: sampleLift.id,
          quote_id: sampleLift.quote_id || sampleLift.id,
          // CRITICAL: Check if sellerPrice is present (from merged quote details)
          has_sellerPrice: !!sampleLift.sellerPrice,
          sellerPrice: sampleLift.sellerPrice,
          sellerPrice_price: sampleLift.sellerPrice?.price,
          sellerPrice_currency: sampleLift.sellerPrice?.currency,
          // Legacy price fields (may be 0 if sellerPrice is used)
          price: sampleLift.price,
          totalPrice: sampleLift.totalPrice,
          currency: sampleLift.currency,
          status: sampleLift.status,
          operator: sampleLift.sellerCompany?.displayName || sampleLift.seller?.displayName,
          has_links: !!sampleLift.links,
          has_quote_detail: !!sampleLift.quote,
          has_sellerMessage: !!sampleLift.sellerMessage,
          // Log all keys to see what's available
          keys: Object.keys(sampleLift),
        });
        
        // CRITICAL: Verify that sellerPrice is accessible at top level after merge
        if (sampleLift.sellerPrice?.price) {
          console.log('[getRFQ] ✅ Price successfully merged into sellerLift:', sampleLift.sellerPrice.price, sampleLift.sellerPrice.currency);
        } else {
          console.warn('[getRFQ] ⚠️ Price NOT found in sellerLift after merge - check quote detail fetching');
        }
      }
      
      // Transform this RFQ's quotes to RFQFlight format
      const flights = transformToRFQFlights(rfq, rfq.trip_id || params.rfq_id);
      
      // Count quotes from sellerLift (PRIMARY source for quotes with prices)
      const sellerLiftQuoteCount = hasSellerLift
        ? rfq.sellerLift.reduce((count: number, lift: any) => {
            if (lift.links?.quotes && Array.isArray(lift.links.quotes)) {
              return count + lift.links.quotes.length;
            }
            // Also count if lift itself is a quote (after merging quote details)
            if (lift.quote_id || lift.id || lift.sellerPrice) {
              return count + 1;
            }
            return count;
          }, 0)
        : 0;
      
      const totalQuotesExpected = Math.max(quotes.length, sellerLiftQuoteCount);
      
      console.log('[getRFQ] RFQ', rfq.rfq_id || rfq.id, ':', {
        legacy_quotes_count: quotes.length,
        sellerLift_quote_count: sellerLiftQuoteCount,
        total_quotes_expected: totalQuotesExpected,
        flights_transformed: flights.length,
        has_sellerLift: hasSellerLift,
      });
      
      // If no flights were created but RFQ exists with quotes, log a detailed warning
      if (flights.length === 0 && totalQuotesExpected > 0) {
        console.error('[getRFQ] ⚠️ CRITICAL: RFQ exists with quotes but no flights were created!', {
          rfq_id: rfq.rfq_id || rfq.id,
          status: rfq.status,
          route: rfq.route,
          legacy_quotes_count: quotes.length,
          sellerLift_quote_count: sellerLiftQuoteCount,
          sellerLift_sample: hasSellerLift && rfq.sellerLift.length > 0
            ? {
                lift_id: rfq.sellerLift[0].id,
                has_links: !!rfq.sellerLift[0].links,
                has_quotes_links: !!(rfq.sellerLift[0].links?.quotes),
                quotes_links_count: rfq.sellerLift[0].links?.quotes?.length || 0,
                has_sellerPrice: !!rfq.sellerLift[0].sellerPrice,
                sourcingDisplayStatus: rfq.sellerLift[0].sourcingDisplayStatus,
                keys: Object.keys(rfq.sellerLift[0]),
              }
            : null,
        });
      } else if (flights.length === 0 && totalQuotesExpected === 0) {
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

    // Check if RFQs exist but no flights were created (transformation issue)
    if (rfqDetails.length > 0 && allFlights.length === 0) {
      console.error('[getRFQ] ⚠️ CRITICAL ISSUE: RFQs exist but no flights were transformed!', {
        trip_id: params.rfq_id,
        rfqs_count: rfqDetails.length,
        flights_count: allFlights.length,
        rfq_statuses: rfqDetails.map(r => r.status),
        rfq_ids: rfqDetails.map(r => r.rfq_id),
        message: 'This indicates a problem in transformToRFQFlights - quotes exist but were not extracted correctly',
      });
      
      // Return RFQ details even if no flights were created, so UI can show RFQs exist
      // This allows the UI to show RFQs even if transformation failed
      return {
        trip_id: params.rfq_id,
        rfqs: rfqDetails,
        total_rfqs: rfqDetails.length,
        quotes: [],
        total_quotes: 0,
        flights: [],
        flights_received: 0,
        status: 'pending',
        message: `Found ${rfqDetails.length} RFQ${rfqDetails.length !== 1 ? 's' : ''} for this Trip ID, but quote extraction encountered an issue. Please check the server logs for details.`,
        _debug: {
          rfqs_found: rfqDetails.length,
          flights_created: 0,
          transformation_issue: true,
        },
      };
    }

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

  // CRITICAL: Avinode API returns sellerPrice { price, currency } as the PRIMARY pricing structure
  // Per test script: GET /quotes/{quoteId} returns sellerPrice.price and sellerPrice.currency
  // We preserve both sellerPrice and pricing for compatibility, but sellerPrice is PRIMARY
  const sellerPrice = quote?.sellerPrice;
  const pricing = quote?.pricing;
  
  return {
    quote_id: quote?.id || quote?.quote_id || params.quote_id,
    rfq_id: quote?.rfq_id,
    trip_id: quote?.trip_id,
    status: quote?.status,
    operator: quote?.sellerCompany || quote?.operator,
    aircraft: quote?.lift,
    segments: quote?.segments,
    // PRIMARY: sellerPrice is the authoritative source (API returns sellerPrice.price, sellerPrice.currency)
    sellerPrice: sellerPrice,
    // FALLBACK: pricing object (may contain total, base_price, etc.)
    pricing: pricing,
    // For backward compatibility, also include as 'pricing' field (sellerPrice takes priority)
    // This allows code to check pricing.price (from sellerPrice) or pricing.total (from pricing object)
    // But sellerPrice is the PRIMARY source per Avinode API documentation
    availability: quote?.availability,
    valid_until: quote?.valid_until,
    created_at: quote?.createdOn || quote?.created_at,
    notes: quote?.sellerMessage || quote?.notes,
    sellerMessage: quote?.sellerMessage, // PRIMARY: operator message text
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
 * Send a chat message to operators
 *
 * Per Avinode API documentation:
 * - Use POST /tripmsgs/{requestId}/chat for sending chat messages
 * - Messages can be up to 5KB of raw text
 * - Use \n for line breaks
 *
 * @see https://developer.avinodegroup.com/reference/chat
 * @see https://developer.avinodegroup.com/docs/download-respond-rfq
 */
async function sendTripMessage(params: SendTripMessageParams & { request_id?: string }) {
  if (!params.message) {
    throw new Error('message is required');
  }
  if (!params.request_id && !params.trip_id) {
    throw new Error('Either request_id or trip_id is required');
  }
  if (params.recipient_type === 'specific_operator' && !params.operator_id) {
    throw new Error('operator_id is required when recipient_type is specific_operator');
  }

  let endpoint: string;
  let identifier: string;

  // Prefer request_id for chat endpoint per Avinode API docs
  if (params.request_id) {
    try {
      identifier = extractNumericId(params.request_id);
      // Use /chat endpoint per Avinode API: POST /tripmsgs/{requestId}/chat
      endpoint = `/tripmsgs/${identifier}/chat`;
    } catch (error) {
      throw new Error(
        `Invalid request ID format: "${params.request_id}". ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else if (params.trip_id) {
    // Fallback to trip_id if no request_id
    try {
      identifier = extractNumericId(params.trip_id);
      endpoint = `/tripmsgs/${identifier}/chat`;
    } catch (error) {
      throw new Error(
        `Invalid trip ID format: "${params.trip_id}". ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    throw new Error('Either request_id or trip_id must be provided');
  }

  const response = await avinodeClient.post(endpoint, {
    message: params.message,
    recipient_type: params.recipient_type || 'all_operators',
    operator_id: params.operator_id,
  });

  return {
    message_id: response.message_id || response.data?.message_id,
    request_id: params.request_id,
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

// ============================================================================
// Empty Leg Watch Functions (ONEK-147, ONEK-148)
// ============================================================================

/**
 * Create an empty leg watch
 * Monitors a route for discounted empty leg flights
 */
async function createEmptyLegWatch(
  params: CreateEmptyLegWatchParams
): Promise<EmptyLegWatchResponse> {
  // Validate required parameters
  if (!params.departure_airport || !params.arrival_airport) {
    throw new Error('departure_airport and arrival_airport are required');
  }
  if (!params.date_range_start || !params.date_range_end) {
    throw new Error('date_range_start and date_range_end are required');
  }
  if (!params.passengers || params.passengers < 1) {
    throw new Error('passengers must be at least 1');
  }

  // Validate airport format
  const airportRegex = /^[A-Z0-9]{3,4}$/;
  if (!airportRegex.test(params.departure_airport.toUpperCase())) {
    throw new Error('Invalid departure_airport format (expected ICAO/IATA code)');
  }
  if (!airportRegex.test(params.arrival_airport.toUpperCase())) {
    throw new Error('Invalid arrival_airport format (expected ICAO/IATA code)');
  }

  // Validate date range
  const startDate = new Date(params.date_range_start);
  const endDate = new Date(params.date_range_end);
  if (endDate < startDate) {
    throw new Error('date_range_end must be after date_range_start');
  }
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 90) {
    throw new Error('Date range cannot exceed 90 days');
  }

  console.error('[createEmptyLegWatch] Creating watch:', {
    route: `${params.departure_airport} → ${params.arrival_airport}`,
    dateRange: `${params.date_range_start} to ${params.date_range_end}`,
    passengers: params.passengers,
    maxPrice: params.max_price,
  });

  try {
    // Call Avinode API to create watch
    const response = await avinodeClient.post('/emptylegs/watches', {
      departureAirport: { icao: params.departure_airport.toUpperCase() },
      arrivalAirport: { icao: params.arrival_airport.toUpperCase() },
      dateRange: {
        start: params.date_range_start,
        end: params.date_range_end,
      },
      passengers: params.passengers,
      maxPrice: params.max_price,
      aircraftCategories: params.aircraft_categories,
    });

    const watchId = response.id || response.watchId || response.watch_id;

    return {
      watch_id: watchId,
      status: 'active',
      departure_airport: params.departure_airport.toUpperCase(),
      arrival_airport: params.arrival_airport.toUpperCase(),
      date_range: {
        start: params.date_range_start,
        end: params.date_range_end,
      },
      passengers: params.passengers,
      max_price: params.max_price,
      aircraft_categories: params.aircraft_categories,
      created_at: new Date().toISOString(),
      expires_at: params.date_range_end,
      matches_count: 0,
    };
  } catch (error) {
    console.error('[createEmptyLegWatch] Error:', error);
    throw new Error(
      `Failed to create empty leg watch: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get all empty leg watches for the current user
 */
async function getEmptyLegWatches(params: { status?: string }): Promise<{
  watches: EmptyLegWatchResponse[];
  total_count: number;
}> {
  console.error('[getEmptyLegWatches] Fetching watches:', { status: params.status });

  try {
    const queryParams: Record<string, string> = {};
    if (params.status) {
      queryParams.status = params.status;
    }

    const response = await avinodeClient.get('/emptylegs/watches', {
      params: queryParams,
    });

    const watches = (response.watches || response.data || []).map((w: Record<string, unknown>) => ({
      watch_id: w.id || w.watchId,
      status: w.status || 'active',
      departure_airport: (w.departureAirport as Record<string, string>)?.icao || w.departure_airport,
      arrival_airport: (w.arrivalAirport as Record<string, string>)?.icao || w.arrival_airport,
      date_range: w.dateRange || w.date_range,
      passengers: w.passengers,
      max_price: w.maxPrice || w.max_price,
      aircraft_categories: w.aircraftCategories || w.aircraft_categories,
      created_at: w.createdAt || w.created_at,
      expires_at: w.expiresAt || w.expires_at,
      matches_count: w.matchesCount || w.matches_count || 0,
    }));

    return {
      watches,
      total_count: watches.length,
    };
  } catch (error) {
    console.error('[getEmptyLegWatches] Error:', error);
    throw new Error(
      `Failed to get empty leg watches: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update an empty leg watch
 */
async function updateEmptyLegWatch(
  params: UpdateEmptyLegWatchParams
): Promise<EmptyLegWatchResponse> {
  if (!params.watch_id) {
    throw new Error('watch_id is required');
  }

  console.error('[updateEmptyLegWatch] Updating watch:', {
    watchId: params.watch_id,
    status: params.status,
    maxPrice: params.max_price,
  });

  try {
    const updateData: Record<string, unknown> = {};
    if (params.status) updateData.status = params.status;
    if (params.max_price !== undefined) updateData.maxPrice = params.max_price;
    if (params.notification_email) updateData.notificationEmail = params.notification_email;

    const response = await avinodeClient.patch(`/emptylegs/watches/${params.watch_id}`, updateData);

    return {
      watch_id: response.id || params.watch_id,
      status: response.status || params.status || 'active',
      departure_airport: (response.departureAirport as Record<string, string>)?.icao,
      arrival_airport: (response.arrivalAirport as Record<string, string>)?.icao,
      date_range: response.dateRange,
      passengers: response.passengers,
      max_price: response.maxPrice || params.max_price,
      aircraft_categories: response.aircraftCategories,
      created_at: response.createdAt,
      expires_at: response.expiresAt,
      matches_count: response.matchesCount || 0,
    };
  } catch (error) {
    console.error('[updateEmptyLegWatch] Error:', error);
    throw new Error(
      `Failed to update empty leg watch: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete an empty leg watch
 */
async function deleteEmptyLegWatch(params: { watch_id: string }): Promise<{
  watch_id: string;
  status: 'cancelled';
  cancelled_at: string;
}> {
  if (!params.watch_id) {
    throw new Error('watch_id is required');
  }

  console.error('[deleteEmptyLegWatch] Deleting watch:', params.watch_id);

  try {
    await avinodeClient.delete(`/emptylegs/watches/${params.watch_id}`);

    return {
      watch_id: params.watch_id,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[deleteEmptyLegWatch] Error:', error);
    throw new Error(
      `Failed to delete empty leg watch: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get matches for an empty leg watch
 */
async function getWatchMatches(params: {
  watch_id: string;
  unviewed_only?: boolean;
  interested_only?: boolean;
  limit?: number;
}): Promise<{
  watch_id: string;
  matches: EmptyLegMatch[];
  total_count: number;
  unviewed_count: number;
}> {
  if (!params.watch_id) {
    throw new Error('watch_id is required');
  }

  console.error('[getWatchMatches] Fetching matches:', {
    watchId: params.watch_id,
    unviewedOnly: params.unviewed_only,
    interestedOnly: params.interested_only,
  });

  try {
    const queryParams: Record<string, unknown> = {
      limit: params.limit || 50,
    };
    if (params.unviewed_only) queryParams.unviewed = true;
    if (params.interested_only) queryParams.interested = true;

    const response = await avinodeClient.get(
      `/emptylegs/watches/${params.watch_id}/matches`,
      { params: queryParams }
    );

    const matches = (response.matches || response.data || []).map((m: Record<string, unknown>) => ({
      match_id: m.id || m.matchId,
      watch_id: params.watch_id,
      empty_leg_id: m.emptyLegId || m.empty_leg_id,
      departure: {
        airport: (m.departure as Record<string, unknown>)?.airport || m.departure_airport,
        name: (m.departure as Record<string, unknown>)?.name,
        city: (m.departure as Record<string, unknown>)?.city,
        date: (m.departure as Record<string, unknown>)?.date || m.departure_date,
        time: (m.departure as Record<string, unknown>)?.time || m.departure_time,
      },
      arrival: {
        airport: (m.arrival as Record<string, unknown>)?.airport || m.arrival_airport,
        name: (m.arrival as Record<string, unknown>)?.name,
        city: (m.arrival as Record<string, unknown>)?.city,
      },
      price: m.price,
      currency: m.currency || 'USD',
      discount_percentage: m.discountPercentage || m.discount_percentage,
      regular_price: m.regularPrice || m.regular_price,
      aircraft: {
        type: (m.aircraft as Record<string, unknown>)?.type,
        model: (m.aircraft as Record<string, unknown>)?.model,
        category: (m.aircraft as Record<string, unknown>)?.category,
        capacity: (m.aircraft as Record<string, unknown>)?.capacity,
        registration: (m.aircraft as Record<string, unknown>)?.registration,
      },
      operator: {
        id: (m.operator as Record<string, unknown>)?.id,
        name: (m.operator as Record<string, unknown>)?.name,
        rating: (m.operator as Record<string, unknown>)?.rating,
      },
      viewed: m.viewed || false,
      interested: m.interested || false,
      matched_at: m.matchedAt || m.matched_at,
      valid_until: m.validUntil || m.valid_until,
      deep_link: m.deepLink || m.deep_link,
    }));

    const unviewedCount = matches.filter((m: EmptyLegMatch) => !m.viewed).length;

    return {
      watch_id: params.watch_id,
      matches,
      total_count: matches.length,
      unviewed_count: unviewedCount,
    };
  } catch (error) {
    console.error('[getWatchMatches] Error:', error);
    throw new Error(
      `Failed to get watch matches: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Mark a match as viewed or interested
 */
async function markMatch(params: MarkEmptyLegMatchParams): Promise<{
  match_id: string;
  viewed: boolean;
  interested: boolean;
  updated_at: string;
}> {
  if (!params.match_id) {
    throw new Error('match_id is required');
  }

  console.error('[markMatch] Marking match:', {
    matchId: params.match_id,
    viewed: params.viewed,
    interested: params.interested,
  });

  try {
    const updateData: Record<string, unknown> = {};
    if (params.viewed !== undefined) updateData.viewed = params.viewed;
    if (params.interested !== undefined) updateData.interested = params.interested;

    const response = await avinodeClient.patch(
      `/emptylegs/matches/${params.match_id}`,
      updateData
    );

    return {
      match_id: params.match_id,
      viewed: response.viewed ?? params.viewed ?? false,
      interested: response.interested ?? params.interested ?? false,
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[markMatch] Error:', error);
    throw new Error(
      `Failed to mark match: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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
