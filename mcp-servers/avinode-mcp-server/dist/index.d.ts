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
export {};
//# sourceMappingURL=index.d.ts.map