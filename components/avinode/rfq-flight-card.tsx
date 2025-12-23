'use client';

/**
 * RFQFlightCard Component
 *
 * Displays detailed flight information from an Avinode RFQ response.
 * Used in Step 3 of the RFP workflow to show available flights to users.
 *
 * Features:
 * - Route visualization (ICAO codes with airport names)
 * - Aircraft details with image
 * - Operator information and rating
 * - Pricing with optional breakdown
 * - Amenities indicators
 * - Prominent status badge (sent, unanswered, quoted, declined, expired)
 * - "Review and Book" button for quoted flights (triggers Step 4)
 * - Selection checkbox for legacy proposal workflow
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Plane,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  Wifi,
  Dog,
  Cigarette,
  UtensilsCrossed,
  Bath,
  HeartPulse,
  Star,
  Calendar,
  ShoppingCart,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

// =============================================================================
// TYPES
// =============================================================================

export interface RFQFlight {
  id: string;
  quoteId: string;
  departureAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  arrivalAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  departureDate: string;
  departureTime?: string;
  flightDuration: string;
  aircraftType: string;
  aircraftModel: string;
  tailNumber?: string;
  yearOfManufacture?: number;
  passengerCapacity: number;
  aircraftImageUrl?: string;
  operatorName: string;
  operatorRating?: number;
  operatorEmail?: string;
  price: number;
  currency: string;
  priceBreakdown?: {
    base: number;
    taxes: number;
    fees: number;
  };
  validUntil?: string;
  amenities: {
    wifi: boolean;
    pets: boolean;
    smoking: boolean;
    galley: boolean;
    lavatory: boolean;
    medical: boolean;
  };
  rfqStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired';
  lastUpdated: string;
  responseTimeMinutes?: number;
  isSelected?: boolean;
}

export interface RFQFlightCardProps {
  flight: RFQFlight;
  selectable?: boolean;
  onSelect?: (flightId: string, selected: boolean) => void;
  showPriceBreakdown?: boolean;
  compact?: boolean;
  className?: string;
  /** Show "Review and Book" button instead of checkbox */
  showBookButton?: boolean;
  /** Callback when "Review and Book" button is clicked (triggers Step 4) */
  onReviewAndBook?: (flightId: string) => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateString: string): string {
  try {
    // Handle YYYY-MM-DD format without timezone issues
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
    // Fallback for other date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatPrice(amount: number, currency: string): string {
  return `$${amount.toLocaleString('en-US')} ${currency}`;
}

function getStatusBadgeClasses(status: RFQFlight['rfqStatus']): string {
  const baseClasses = 'px-2 py-0.5 text-xs font-medium rounded-full';
  switch (status) {
    case 'sent':
      return cn(baseClasses, 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400');
    case 'unanswered':
      return cn(baseClasses, 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400');
    case 'quoted':
      return cn(baseClasses, 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400');
    case 'declined':
      return cn(baseClasses, 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400');
    case 'expired':
      return cn(baseClasses, 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400');
    default:
      return cn(baseClasses, 'bg-gray-100 text-gray-700');
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoString);
  } catch {
    return 'Unknown';
  }
}

function getButtonText(status: RFQFlight['rfqStatus']): string {
  switch (status) {
    case 'quoted':
      return 'Review and Book';
    case 'unanswered':
    case 'sent':
      return 'Awaiting Quote';
    case 'declined':
      return 'Quote Unavailable';
    case 'expired':
      return 'Quote Expired';
    default:
      return 'Unavailable';
  }
}

// =============================================================================
// AMENITY ICON COMPONENT
// =============================================================================

interface AmenityIconProps {
  type: keyof RFQFlight['amenities'];
  enabled: boolean;
}

function AmenityIcon({ type, enabled }: AmenityIconProps) {
  const icons = {
    wifi: Wifi,
    pets: Dog,
    smoking: Cigarette,
    galley: UtensilsCrossed,
    lavatory: Bath,
    medical: HeartPulse,
  };

  const labels = {
    wifi: 'WiFi',
    pets: 'Pets allowed',
    smoking: 'Smoking allowed',
    galley: 'Galley',
    lavatory: 'Lavatory',
    medical: 'Medical equipment',
  };

  const Icon = icons[type];

  return (
    <span
      data-testid={`amenity-${type}`}
      aria-label={labels[type]}
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded',
        enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'
      )}
      title={`${labels[type]}: ${enabled ? 'Yes' : 'No'}`}
    >
      <Icon className="w-4 h-4" />
    </span>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RFQFlightCard({
  flight,
  selectable = false,
  onSelect,
  showPriceBreakdown = false,
  compact = false,
  className,
  showBookButton = false,
  onReviewAndBook,
}: RFQFlightCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleSelectionChange = (checked: boolean) => {
    onSelect?.(flight.id, checked);
  };

  const handleReviewAndBook = () => {
    if (flight.rfqStatus === 'quoted') {
      onReviewAndBook?.(flight.id);
    }
  };

  const isBookingEnabled = flight.rfqStatus === 'quoted';

  return (
    <div
      data-testid="rfq-flight-card"
      className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 transition-all',
        flight.isSelected && selectable && 'ring-2 ring-blue-500 border-transparent',
        compact ? 'h-auto' : '',
        className
      )}
    >
      <div className={cn('flex', compact ? 'flex-col sm:flex-row' : '')}>
        {/* Aircraft Image Section */}
        <div className={cn(
          'bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0',
          compact ? 'w-full h-32 sm:w-24 sm:h-auto' : 'w-36 h-48'
        )}>
          {flight.aircraftImageUrl ? (
            <img
              src={flight.aircraftImageUrl}
              alt={flight.aircraftModel}
              className="w-full h-full object-cover"
            />
          ) : (
            <div data-testid="aircraft-placeholder" className="flex items-center justify-center w-full h-full">
              <Plane className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          {/* Header: Route + Status + Selection */}
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Route */}
            <div data-testid="route-section" className="flex items-center gap-2">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-lg font-bold text-primary">{flight.departureAirport.icao}</span>
                </div>
                {flight.departureAirport.name && (
                  <p className="text-xs text-muted-foreground">{flight.departureAirport.name}</p>
                )}
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />

              <div className="text-center">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-primary">{flight.arrivalAirport.icao}</span>
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                </div>
                {flight.arrivalAirport.name && (
                  <p className="text-xs text-muted-foreground">{flight.arrivalAirport.name}</p>
                )}
              </div>
            </div>

            {/* Status + Selection */}
            <div className="flex items-center gap-2">
              <span data-testid="status-badge" className={getStatusBadgeClasses(flight.rfqStatus)}>
                {flight.rfqStatus.charAt(0).toUpperCase() + flight.rfqStatus.slice(1)}
              </span>
              {selectable && !showBookButton && (
                <Checkbox
                  checked={flight.isSelected}
                  onCheckedChange={handleSelectionChange}
                  aria-label={`Select flight from ${flight.operatorName}`}
                />
              )}
            </div>
          </div>

          {/* Date & Duration */}
          <div className="flex items-center gap-4 mb-3 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(flight.departureDate)}</span>
              {flight.departureTime && (
                <span className="text-foreground font-medium ml-1">{flight.departureTime}</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-foreground font-medium">{flight.flightDuration}</span>
            </div>
          </div>

          {/* Aircraft & Operator Info */}
          <div className={cn('grid gap-3 mb-3', compact ? 'grid-cols-1' : 'grid-cols-2')}>
            {/* Aircraft */}
            <div data-testid="aircraft-section" className="space-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {flight.aircraftModel}
              </p>
              <p className="text-xs text-muted-foreground">
                {flight.aircraftType}
                {flight.tailNumber && <span className="ml-2">Tail: {flight.tailNumber}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {flight.yearOfManufacture && <span>Year: {flight.yearOfManufacture}</span>}
                <span className="ml-2 inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {flight.passengerCapacity} passengers
                </span>
              </p>
            </div>

            {/* Operator */}
            <div data-testid="operator-section" className="space-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {flight.operatorName}
              </p>
              {flight.operatorRating && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>{flight.operatorRating}</span>
                </p>
              )}
              {flight.responseTimeMinutes && (
                <p className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {flight.responseTimeMinutes} min response
                </p>
              )}
            </div>
          </div>

          {/* Amenities */}
          <div className="flex items-center gap-1 mb-3">
            {Object.entries(flight.amenities).map(([key, value]) => (
              <AmenityIcon
                key={key}
                type={key as keyof RFQFlight['amenities']}
                enabled={value}
              />
            ))}
          </div>

          {/* Price Section */}
          <div
            data-testid="price-section"
            className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800"
            onMouseEnter={() => setShowBreakdown(true)}
            onMouseLeave={() => setShowBreakdown(false)}
          >
            <div>
              <p className="text-xl font-bold text-primary">
                {formatPrice(flight.price, flight.currency)}
              </p>
              {showPriceBreakdown && showBreakdown && flight.priceBreakdown && (
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <p>Base: ${flight.priceBreakdown.base.toLocaleString()}</p>
                  <p>Taxes: ${flight.priceBreakdown.taxes.toLocaleString()}</p>
                  <p>Fees: ${flight.priceBreakdown.fees.toLocaleString()}</p>
                </div>
              )}
              {flight.validUntil && (
                <p className="text-xs text-muted-foreground mt-1">
                  Valid until {formatDate(flight.validUntil)}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              {showBookButton ? (
                <Button
                  onClick={handleReviewAndBook}
                  disabled={!isBookingEnabled}
                  aria-label={`Review and book flight from ${flight.operatorName}`}
                  className={cn(
                    'flex items-center gap-2',
                    isBookingEnabled
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  )}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {getButtonText(flight.rfqStatus)}
                </Button>
              ) : (
                <div className="text-right text-xs text-muted-foreground">
                  <p>Updated {formatRelativeTime(flight.lastUpdated)}</p>
                </div>
              )}
              {showBookButton && (
                <div className="text-right text-xs text-muted-foreground">
                  <p>Updated {formatRelativeTime(flight.lastUpdated)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RFQFlightCard;
