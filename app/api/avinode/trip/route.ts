/**
 * GET /api/avinode/trip?tripId=xxx
 *
 * Direct REST endpoint for fetching Avinode trip details.
 * Replaces the SSE-parsing approach that routed through /api/chat.
 *
 * Returns trip details (airports, date, passengers, deep link) and
 * RFQ flights with quote data in a single JSON response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server';

export const dynamic = 'force-dynamic';

let mcpServer: AvinodeMCPServer | null = null;

function getMCPServer(): AvinodeMCPServer {
  if (!mcpServer) {
    mcpServer = new AvinodeMCPServer();
  }
  return mcpServer;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tripId = request.nextUrl.searchParams.get('tripId');
    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId parameter' }, { status: 400 });
    }

    // Validate tripId format (atrip-XXXXXXXX or UUID)
    const tripIdPattern = /^(atrip-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
    if (!tripIdPattern.test(tripId)) {
      return NextResponse.json({ error: 'Invalid tripId format' }, { status: 400 });
    }

    const server = getMCPServer();

    // Call get_rfq MCP tool directly (no SSE, no chat API)
    // NOTE: The tool param is `rfq_id` — it accepts both RFQ IDs and Trip IDs
    const rfqResult = await server.callTool('get_rfq', { rfq_id: tripId });

    if (!rfqResult) {
      return NextResponse.json(
        { error: 'Failed to fetch trip details' },
        { status: 502 }
      );
    }

    // callTool returns raw data from the Avinode client (not an MCP envelope).
    // Normalize to a record we can extract fields from.
    let resultData: Record<string, unknown> | null = null;

    if (typeof rfqResult === 'object' && rfqResult !== null && !Array.isArray(rfqResult)) {
      resultData = rfqResult as Record<string, unknown>;
    } else if (typeof rfqResult === 'string') {
      try {
        resultData = JSON.parse(rfqResult);
      } catch {
        resultData = null;
      }
    }

    if (!resultData) {
      return NextResponse.json(
        { error: 'Invalid response from Avinode' },
        { status: 502 }
      );
    }

    // Extract trip-level details
    let departureAirport: string | null = null;
    let arrivalAirport: string | null = null;
    let departureDate: string | null = null;
    let passengers: number | null = null;
    let deepLink: string | null = null;

    const trip = resultData.trip as Record<string, unknown> | undefined;
    if (trip) {
      const legs = trip.legs as Array<Record<string, unknown>> | undefined;
      if (legs && legs.length > 0) {
        const firstLeg = legs[0];
        departureAirport = (firstLeg.departureAirportId as string) || null;
        arrivalAirport = (firstLeg.arrivalAirportId as string) || null;
        departureDate = (firstLeg.departureDate as string) || (firstLeg.date as string) || null;
        passengers = (firstLeg.passengerCount as number) || (trip.passengerCount as number) || null;
      }
      deepLink = (trip.deepLink as string) || (resultData.deepLink as string) || null;
    }

    // Fallback to direct result fields
    if (!departureAirport) departureAirport = (resultData.departureAirport as string) || null;
    if (!arrivalAirport) arrivalAirport = (resultData.arrivalAirport as string) || null;
    if (!departureDate) departureDate = (resultData.departureDate as string) || null;
    if (!passengers) passengers = (resultData.passengers as number) || null;
    if (!deepLink) deepLink = (resultData.deepLink as string) || null;

    // Extract flights
    const flights = (resultData.flights as unknown[]) || [];

    // Extract RFQs (legacy format) and transform to flights
    const rfqs = (resultData.rfqs as Array<Record<string, unknown>>) || [];
    for (const rfq of rfqs) {
      if (!departureAirport && rfq.departure_airport) {
        departureAirport = rfq.departure_airport as string;
      }
      if (!arrivalAirport && rfq.arrival_airport) {
        arrivalAirport = rfq.arrival_airport as string;
      }
      if (!departureDate && rfq.departure_date) {
        departureDate = rfq.departure_date as string;
      }
      if (!passengers && rfq.passengers) {
        passengers = rfq.passengers as number;
      }
    }

    return NextResponse.json({
      tripId,
      departureAirport,
      arrivalAirport,
      departureDate,
      passengers,
      deepLink,
      flights,
      rfqs,
    });
  } catch (error) {
    console.error('[GET /api/avinode/trip] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
