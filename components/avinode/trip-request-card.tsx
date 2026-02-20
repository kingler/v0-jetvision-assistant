'use client';

import React from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Plane,
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAirportByIcao } from '@/lib/airports/airport-database';
import type { FlightRequestDetails } from './flight-search-progress';

// =============================================================================
// TYPES
// =============================================================================

export interface TripRequestCardProps {
  /** Flight request details */
  flightRequest: FlightRequestDetails;
  /** Whether the step is completed (shows check icon + "Created" label) */
  isCompleted?: boolean;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format date string to compact format (no weekday): "Mar 25, 2026"
 */
function formatDateShort(dateString: string): string {
  if (!dateString || dateString === 'Invalid Date' || dateString === 'N/A') {
    return 'Date TBD';
  }
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return 'Date TBD';
  } catch {
    return 'Date TBD';
  }
}

/**
 * Resolve city/state for an airport using props first, then database lookup.
 */
function resolveAirportLocation(airport: { icao: string; city?: string; state?: string }) {
  const icao = airport.icao?.toUpperCase();
  const airportData = icao ? getAirportByIcao(icao) : null;
  const city = airport.city || airportData?.city || '';
  const state = airport.state || airportData?.state || '';
  return { city, state };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TripRequestCard({
  flightRequest,
  isCompleted = false,
  className,
}: TripRequestCardProps) {
  return (
    <div
      data-testid="trip-request-card"
      className={cn(
        'text-card-foreground flex flex-col gap-4 rounded-xl py-4 sm:py-6 px-3 sm:px-4 shadow-sm w-full min-w-0 bg-card border border-border',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
        ) : (
          <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
        )}
        <h4 className="font-semibold text-[clamp(0.8125rem,2vw,0.875rem)] text-foreground">
          Step 1: Trip Request {isCompleted ? 'Created' : 'Creating'}
        </h4>
      </div>

      {/* Flight Request Details */}
      <div className="space-y-3">
        {/* Route Visualization */}
        <div className="rounded-md bg-surface-secondary p-3 space-y-2">
          {/* Trip Type Badge */}
          <span
            className={cn(
              'inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
              flightRequest.tripType === 'round_trip'
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-tertiary text-muted-foreground',
            )}
          >
            {flightRequest.tripType === 'round_trip' ? 'Round-Trip' : 'One-Way'}
          </span>

          <div className="flex items-center justify-between gap-2">
            {/* Departure */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-bold text-primary">
                  {flightRequest.departureAirport?.icao?.toUpperCase() || 'N/A'}
                </span>
              </div>
              {(() => {
                const { city, state } = resolveAirportLocation(flightRequest.departureAirport);
                if (city || state) {
                  return (
                    <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                      {city}
                      {state ? `, ${state}` : ''}
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Route Arrow */}
            <div className="flex items-center gap-1.5 px-2 shrink-0">
              <div className="h-px w-4 bg-border-strong" />
              <Plane className="size-6 text-primary rotate-90" />
              {flightRequest.tripType === 'round_trip' ? (
                <ArrowLeftRight className="size-6 text-primary" />
              ) : (
                <ArrowRight className="size-6 text-muted-foreground" />
              )}
              <div className="h-px w-4 bg-border-strong" />
            </div>

            {/* Arrival */}
            <div className="flex-1 text-right min-w-0">
              <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                <span className="text-sm font-bold text-primary">
                  {flightRequest.arrivalAirport?.icao?.toUpperCase() || 'N/A'}
                </span>
                <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              </div>
              {(() => {
                const { city, state } = resolveAirportLocation(flightRequest.arrivalAirport);
                if (city || state) {
                  return (
                    <p className="text-xs text-muted-foreground mt-0.5 text-right whitespace-nowrap">
                      {city}
                      {state ? `, ${state}` : ''}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Flight Details Grid */}
        <div
          className={`grid gap-1.5 text-sm min-w-0 ${
            flightRequest.tripType === 'round_trip' && flightRequest.returnDate
              ? 'grid-cols-1 sm:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          <div className="flex items-center gap-1.5 rounded-md bg-surface-secondary p-1.5 min-w-0">
            <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                {flightRequest.tripType === 'round_trip' ? 'Depart' : 'Date'}
              </p>
              <p className="font-medium text-sm text-foreground whitespace-nowrap">
                {formatDateShort(flightRequest.departureDate)}
              </p>
            </div>
          </div>
          {flightRequest.tripType === 'round_trip' && flightRequest.returnDate && (
            <div className="flex items-center gap-1.5 rounded-md bg-surface-secondary p-1.5 min-w-0">
              <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground whitespace-nowrap">Return</p>
                <p className="font-medium text-sm text-foreground whitespace-nowrap">
                  {formatDateShort(flightRequest.returnDate)}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-md bg-surface-secondary p-1.5 min-w-0">
            <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
            <p className="text-sm text-foreground whitespace-nowrap">
              <span className="text-muted-foreground">Passengers: </span>
              <span className="font-medium">{flightRequest.passengers}</span>
            </p>
          </div>
        </div>

        {/* Optional Details */}
        {(flightRequest.aircraftPreferences || flightRequest.specialRequirements) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {flightRequest.aircraftPreferences && (
              <div className="rounded-md bg-surface-secondary p-2">
                <p className="text-xs text-muted-foreground">Aircraft Preferences</p>
                <p className="font-medium text-xs">{flightRequest.aircraftPreferences}</p>
              </div>
            )}
            {flightRequest.specialRequirements && (
              <div className="rounded-md bg-surface-secondary p-2">
                <p className="text-xs text-muted-foreground">Special Requirements</p>
                <p className="font-medium text-xs">{flightRequest.specialRequirements}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
