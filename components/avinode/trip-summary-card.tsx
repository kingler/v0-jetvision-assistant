import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Plane } from 'lucide-react';

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
  onCopyTripId,
}: TripSummaryCardProps) {
  const isRoundTrip = tripType === 'round_trip';

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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Trip Details
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isRoundTrip ? 'default' : 'secondary'}>
              {isRoundTrip ? 'Round-Trip' : 'One-Way'}
            </Badge>
            <Badge variant={getStatusVariant(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trip ID */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Trip ID
            </span>
            <p className="font-mono text-sm font-medium">{tripId}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyTripId}
            aria-label="Copy trip ID"
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>

        {/* Outbound Route Visualization */}
        <div className="rounded-lg border p-4 space-y-3">
          {isRoundTrip && (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Outbound
            </span>
          )}
          <div className="flex items-center justify-between">
            {/* Departure */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-lg font-bold">{departureAirport.icao}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {departureAirport.name}, {departureAirport.city}
              </p>
            </div>

            {/* Flight Path */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-1">
                <div className="h-px w-12 bg-border" />
                <Plane className="h-4 w-4 text-muted-foreground" />
                <div className="h-px w-12 bg-border" />
              </div>
            </div>

            {/* Arrival */}
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-lg font-bold">{arrivalAirport.icao}</span>
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                {arrivalAirport.name}, {arrivalAirport.city}
              </p>
            </div>
          </div>
        </div>

        {/* Return Route Visualization (round-trip only) */}
        {isRoundTrip && (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Return
            </span>
            <div className="flex items-center justify-between">
              {/* Return Departure (arrival airport of outbound) */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-lg font-bold">{arrivalAirport.icao}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {arrivalAirport.name}, {arrivalAirport.city}
                </p>
              </div>

              {/* Flight Path */}
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-1">
                  <div className="h-px w-12 bg-border" />
                  <Plane className="h-4 w-4 text-muted-foreground rotate-180" />
                  <div className="h-px w-12 bg-border" />
                </div>
              </div>

              {/* Return Arrival (departure airport of outbound) */}
              <div className="flex-1 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-lg font-bold">{departureAirport.icao}</span>
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">
                  {departureAirport.name}, {departureAirport.city}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Flight Details */}
        <div className={`grid ${isRoundTrip && returnDate ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {isRoundTrip ? 'Outbound' : 'Departure'}
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
