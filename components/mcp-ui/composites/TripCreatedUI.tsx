'use client';

/**
 * TripCreatedUI — Compact trip summary composite.
 *
 * Delegates to FlightSearchProgress with displayMode='compact'.
 * Kept as a named export for backward compatibility and
 * to provide a simpler API surface for the MCP UI layer.
 */

import { FlightSearchProgress } from '@/components/avinode';
import type { UIActionResult } from '@mcp-ui/server';
import { uiActionResultLink, uiActionResultNotification } from '@mcp-ui/server';

export interface TripSegmentUI {
  departureAirport: { icao: string; name: string; city: string };
  arrivalAirport: { icao: string; name: string; city: string };
  departureDate: string;
  passengers: number;
}

export interface TripCreatedUIProps {
  tripId: string;
  deepLink: string;
  departureAirport: { icao: string; name: string; city: string };
  arrivalAirport: { icao: string; name: string; city: string };
  departureDate: string;
  passengers: number;
  tripType?: 'single_leg' | 'round_trip' | 'multi_city';
  returnDate?: string;
  segments?: TripSegmentUI[];
  onAction: (action: UIActionResult) => void;
}

export function TripCreatedUI({
  tripId,
  deepLink,
  departureAirport,
  arrivalAirport,
  departureDate,
  passengers,
  tripType,
  returnDate,
  onAction,
}: TripCreatedUIProps) {
  return (
    <FlightSearchProgress
      currentStep={2}
      isTripCreated={true}
      displayMode="compact"
      flightRequest={{
        departureAirport,
        arrivalAirport,
        departureDate,
        passengers,
        tripType: tripType === 'round_trip' ? 'round_trip' : 'one_way',
        returnDate,
      }}
      deepLink={deepLink}
      tripId={tripId}
      onDeepLinkClick={() => onAction(uiActionResultLink(deepLink))}
      onCopyDeepLink={() => {
        navigator.clipboard.writeText(deepLink);
        onAction(uiActionResultNotification('Deep link copied'));
      }}
    />
  );
}
