import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clipboard, Plane } from 'lucide-react';

interface AirportInfo {
  icao: string;
  name: string;
  city: string;
}

interface BuyerInfo {
  company: string;
  contact: string;
}

export interface TripDetailsCardProps {
  tripId: string;
  displayTripId?: string;
  departureAirport: AirportInfo;
  arrivalAirport: AirportInfo;
  departureDate: string;
  departureTime?: string;
  timezone?: string;
  passengers: number;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  buyer?: BuyerInfo;
  onCopyTripId?: () => void;
}

export function TripDetailsCard({
  tripId,
  displayTripId,
  departureAirport,
  arrivalAirport,
  departureDate,
  departureTime,
  timezone,
  passengers,
  status,
  buyer,
  onCopyTripId,
}: TripDetailsCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getTripIdDisplay = () => {
    if (displayTripId) {
      return `${displayTripId} (${tripId})`;
    }
    return tripId;
  };

  const getDateTimeDisplay = () => {
    const formattedDate = formatDate(departureDate);
    if (departureTime && timezone) {
      return `${formattedDate} at ${departureTime} ${timezone}`;
    }
    return formattedDate;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            Trip Details
          </CardTitle>
          <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trip ID Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
            <span className="text-muted-foreground shrink-0">Trip ID</span>
            <span className="font-mono font-medium truncate">{getTripIdDisplay()}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onCopyTripId} aria-label="Copy Trip ID" className="shrink-0">
            <Clipboard className="h-4 w-4" />
            Copy
          </Button>
        </div>

        {/* Route Visualization */}
        <div className="rounded-lg border p-3 sm:p-4 bg-muted/30">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Departure */}
            <div className="flex flex-col items-center text-center flex-1 min-w-0">
              <Plane className="h-5 w-5 mb-2 -rotate-45 shrink-0" />
              <div className="font-bold text-base sm:text-lg">{departureAirport.icao}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground break-words">
                {departureAirport.name}, {departureAirport.city}
              </div>
            </div>

            {/* Flight Path */}
            <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-4 shrink-0">
              <div className="h-px bg-border w-4 sm:w-12 md:w-24" />
              <Plane className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="h-px bg-border w-4 sm:w-12 md:w-24" />
            </div>

            {/* Arrival */}
            <div className="flex flex-col items-center text-center flex-1 min-w-0">
              <Plane className="h-5 w-5 mb-2 rotate-45 shrink-0" />
              <div className="font-bold text-base sm:text-lg">{arrivalAirport.icao}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground break-words">
                {arrivalAirport.name}, {arrivalAirport.city}
              </div>
            </div>
          </div>
        </div>

        {/* Departure Date/Time */}
        <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
          <span className="text-muted-foreground shrink-0">📅 Departure</span>
          <span className="font-medium text-right break-words">{getDateTimeDisplay()}</span>
        </div>

        {/* Passengers */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground shrink-0">👥 Passengers</span>
          <span className="font-medium">{passengers}</span>
        </div>

        {/* Buyer (optional) */}
        {buyer && (
          <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
            <span className="text-muted-foreground shrink-0">🏢 Buyer</span>
            <span className="font-medium text-right break-words">
              {buyer.company} ({buyer.contact})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
