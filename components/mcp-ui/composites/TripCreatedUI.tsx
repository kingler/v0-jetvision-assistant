'use client';

import { TripSummaryCard, AvinodeDeepLinks } from '@/components/avinode';
import type { UIActionResult } from '@mcp-ui/server';
import { uiActionResultLink, uiActionResultNotification } from '@mcp-ui/server';

export interface TripCreatedUIProps {
  tripId: string;
  deepLink: string;
  departureAirport: { icao: string; name: string; city: string };
  arrivalAirport: { icao: string; name: string; city: string };
  departureDate: string;
  passengers: number;
  tripType?: 'single_leg' | 'round_trip' | 'multi_city';
  returnDate?: string;
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
    <div className="space-y-3">
      <TripSummaryCard
        tripId={tripId}
        departureAirport={departureAirport}
        arrivalAirport={arrivalAirport}
        departureDate={departureDate}
        passengers={passengers}
        status="active"
        tripType={tripType}
        returnDate={returnDate}
        onCopyTripId={() => {
          navigator.clipboard.writeText(tripId);
          onAction(uiActionResultNotification('Trip ID copied'));
        }}
      />
      <AvinodeDeepLinks
        links={{
          searchInAvinode: {
            href: deepLink,
            description: 'Search and send RFQs to operators',
          },
          viewInAvinode: {
            href: deepLink,
            description: 'View trip details in Avinode',
          },
          cancel: {
            href: deepLink,
            description: 'Cancel this trip',
          },
        }}
        onLinkClick={(linkType) => {
          onAction(uiActionResultLink(deepLink));
        }}
      />
    </div>
  );
}
