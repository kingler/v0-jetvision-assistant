import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Plane } from 'lucide-react';

export interface TripSegmentUI {
  departureAirport: { icao: string; name: string; city: string };
  arrivalAirport: { icao: string; name: string; city: string };
  departureDate: string;
  passengers: number;
}

export interface TripSummaryCardProps {
  tripId: string;
  departureAirport: {
    icao: string;
    name: string;
    city: string;
  };
  arrivalAirport: {
    icao: string;
    name: string;
    city: string;
  };
  departureDate: string;
  passengers: number;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  /** Trip type: one-way, round-trip, or multi-city */
  tripType?: 'single_leg' | 'round_trip' | 'multi_city';
  /** Return date for round-trip flights (YYYY-MM-DD) */
  returnDate?: string;
  /** All trip segments for multi-city display */
  segments?: TripSegmentUI[];
  onCopyTripId?: () => void;
}

export function TripSummaryCard({
  tripId,
  departureAirport,
  arrivalAirport,
  departureDate,
  passengers,
  status,
  tripType,
  returnDate,
  segments,
  onCopyTripId,
}: TripSummaryCardProps) {
  const isRoundTrip = tripType === 'round_trip';
  const isMultiCity = tripType === 'multi_city';

  const formatAirportLabel = (airport: { name: string; city: string }) => {
    if (airport.city && airport.name && airport.city !== airport.name) {
      return `${airport.name}, ${airport.city}`;
    }
    return airport.city || airport.name;
  };

  const formatDate = (dateString: string) => {
    // Parse as UTC to avoid timezone issues with ISO date strings
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Trip Details
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isRoundTrip || isMultiCity ? 'default' : 'secondary'}>
              {isMultiCity ? 'Multi-City' : isRoundTrip ? 'Round-Trip' : 'One-Way'}
            </Badge>
            <Badge variant={getStatusVariant(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trip ID */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Trip ID
            </span>
            <p className="font-mono text-sm font-medium truncate">{tripId}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyTripId}
            aria-label="Copy trip ID"
            className="shrink-0"
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>

        {/* Multi-City Route Visualization */}
        {isMultiCity && segments && segments.length > 1 ? (
          <div className="space-y-2">
            {segments.map((seg, idx) => (
              <div key={idx} className="rounded-lg border p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Leg {idx + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(seg.departureDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-left">
                    <span className="text-lg font-bold">{seg.departureAirport.icao}</span>
                    <p className="text-sm text-muted-foreground">
                      {formatAirportLabel(seg.departureAirport)}
                    </p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-1">
                      <div className="h-px w-4 sm:w-12 bg-border" />
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <div className="h-px w-4 sm:w-12 bg-border" />
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-lg font-bold">{seg.arrivalAirport.icao}</span>
                    <p className="text-sm text-muted-foreground">
                      {formatAirportLabel(seg.arrivalAirport)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Outbound Route Visualization */}
            <div className="rounded-lg border p-3 sm:p-4 space-y-3">
              {isRoundTrip && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Outbound
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex-1 text-left">
                  <span className="text-lg font-bold">{departureAirport.icao}</span>
                  <p className="text-sm text-muted-foreground">
                    {formatAirportLabel(departureAirport)}
                  </p>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    <div className="h-px w-4 sm:w-12 bg-border" />
                    <Plane className="h-4 w-4 text-muted-foreground" />
                    <div className="h-px w-4 sm:w-12 bg-border" />
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <span className="text-lg font-bold">{arrivalAirport.icao}</span>
                  <p className="text-sm text-muted-foreground">
                    {formatAirportLabel(arrivalAirport)}
                  </p>
                </div>
              </div>
            </div>

            {/* Return Route Visualization (round-trip only) */}
            {isRoundTrip && (
              <div className="rounded-lg border border-dashed p-3 sm:p-4 space-y-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Return
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-left">
                    <span className="text-lg font-bold">{arrivalAirport.icao}</span>
                    <p className="text-sm text-muted-foreground">
                      {formatAirportLabel(arrivalAirport)}
                    </p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-1">
                      <div className="h-px w-4 sm:w-12 bg-border" />
                      <Plane className="h-4 w-4 text-muted-foreground rotate-180" />
                      <div className="h-px w-4 sm:w-12 bg-border" />
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-lg font-bold">{departureAirport.icao}</span>
                    <p className="text-sm text-muted-foreground">
                      {formatAirportLabel(departureAirport)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Flight Details */}
        <div className={`grid ${(isRoundTrip && returnDate) || isMultiCity ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'} gap-3 sm:gap-4`}>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {isRoundTrip ? 'Outbound' : isMultiCity ? 'First Leg' : 'Departure'}
            </span>
            <p className="text-sm font-medium">{formatDate(departureDate)}</p>
          </div>
          {isRoundTrip && returnDate && (
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Return
              </span>
              <p className="text-sm font-medium">{formatDate(returnDate)}</p>
            </div>
          )}
          {isMultiCity && segments && segments.length > 1 && (
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Last Leg
              </span>
              <p className="text-sm font-medium">
                {formatDate(segments[segments.length - 1].departureDate)}
              </p>
            </div>
          )}
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Passengers
            </span>
            <p className="text-sm font-medium">{passengers}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
