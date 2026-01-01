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

import React, { useState, useEffect } from 'react';
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
  MessageSquare,
  ExternalLink,
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
  /** Aircraft tail number (registration) - maps to aircraft.registration in API */
  tailNumber?: string;
  /** Year aircraft was manufactured - maps to aircraft.year_built in API */
  yearOfManufacture?: number;
  /** Maximum passenger capacity - maps to aircraft.capacity in API */
  passengerCapacity: number;
  /** Aircraft photo URL - retrieved via tailphotos=true query param */
  tailPhotoUrl?: string;
  operatorName: string;
  operatorRating?: number;
  operatorEmail?: string;
  /** Total price - maps to pricing.total in Avinode API */
  totalPrice: number;
  /** Currency code (ISO 4217) - maps to pricing.currency in API */
  currency: string;
  /** Price breakdown - maps to pricing.breakdown in API */
  priceBreakdown?: {
    /** Base charter price - maps to pricing.base_price */
    basePrice: number;
    /** Fuel surcharge - maps to pricing.fuel_surcharge */
    fuelSurcharge?: number;
    /** Tax amount - maps to pricing.taxes */
    taxes: number;
    /** Additional fees - maps to pricing.fees */
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
  /** Aircraft category (e.g., "Heavy jet", "Light jet") - maps to aircraftCategory.name in API */
  aircraftCategory?: string;
  /** Whether medical equipment is available */
  hasMedical?: boolean;
  /** Whether package/cargo transport is available */
  hasPackage?: boolean;
  /** Deep link to view this flight in Avinode marketplace - maps to actions.viewInAvinode.href */
  avinodeDeepLink?: string;
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
  /** Callback when "View Chat" button is clicked */
  onViewChat?: (flightId: string) => void;
  /** Aircraft category (e.g., "Heavy jet", "Light jet") */
  aircraftCategory?: string;
  /** Whether medical equipment is available */
  hasMedical?: boolean;
  /** Whether package/cargo transport is available */
  hasPackage?: boolean;
  /** Deep link to view this flight in Avinode marketplace */
  avinodeDeepLink?: string;
  /** Callback when "View in Avinode" button is clicked */
  onViewInAvinode?: (flightId: string, deepLink?: string) => void;
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

/**
 * Formats a price amount with proper currency symbol and formatting.
 * Uses Intl.NumberFormat for locale-aware currency formatting.
 *
 * @param amount - The numeric price amount
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP')
 * @returns Formatted price string with currency symbol (e.g., "$50,000" or "€45,000.50")
 */
function formatPrice(amount: number, currency: string): string {
  try {
    // Use Intl.NumberFormat for proper currency formatting with correct symbol placement
    // minimumFractionDigits: 0 allows whole numbers without decimals
    // maximumFractionDigits: 2 allows up to 2 decimal places when needed
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  } catch (error) {
    // Fallback if currency code is invalid or Intl formatting fails
    // Returns formatted number with currency code appended (no hardcoded $ symbol)
    return `${amount.toLocaleString('en-US')} ${currency}`;
  }
}

function getStatusBadgeClasses(status: RFQFlight['rfqStatus']): string {
  // Use rounded-md instead of rounded-full to match wireframe badge style
  const baseClasses = 'px-3 py-1.5 text-xs font-medium rounded-md';
  switch (status) {
    case 'sent':
      return cn(baseClasses, 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400');
    case 'unanswered':
      // Gray badge for "Unanswered" per wireframe
      return cn(baseClasses, 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300');
    case 'quoted':
      return cn(baseClasses, 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400');
    case 'declined':
      return cn(baseClasses, 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400');
    case 'expired':
      return cn(baseClasses, 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400');
    default:
      return cn(baseClasses, 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300');
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

/**
 * Maps aircraft type string to category (e.g., "Heavy jet", "Light jet")
 * @param aircraftType - The aircraft type/model string
 * @returns Category string in title case
 */
function mapAircraftTypeToCategory(aircraftType: string): string {
  const type = aircraftType.toLowerCase();

  // Turbo prop / Propeller aircraft
  if (type.includes('turbo prop') || type.includes('turboprop') || type.includes('pc-12') || type.includes('king air') || type.includes('caravan')) {
    return 'Turbo prop';
  }

  // Light jets
  if (type.includes('phenom') || type.includes('citation cj') || type.includes('learjet')) {
    return 'Light jet';
  }
  
  // Midsize jets
  if (type.includes('challenger') || type.includes('citation x') || type.includes('falcon') || type.includes('hawker')) {
    return 'Midsize jet';
  }
  
  // Heavy jets
  if (type.includes('gulfstream') || type.includes('global 7500') || type.includes('global express')) {
    return 'Heavy jet';
  }
  
  // Ultra long range
  if (type.includes('ultra') || type.includes('global 7500')) {
    return 'Ultra long range';
  }

  // Default based on common patterns
  if (type.includes('heavy') || type.includes('large')) {
    return 'Heavy jet';
  }
  if (type.includes('light') || type.includes('small')) {
    return 'Light jet';
  }

  return 'Midsize jet'; // Default fallback
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
  onViewChat,
  aircraftCategory,
  hasMedical,
  hasPackage,
  avinodeDeepLink,
  onViewInAvinode,
}: RFQFlightCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  // Track image loading errors to show placeholder when image fails to load
  const [imageError, setImageError] = useState(false);

  /**
   * Reset image error state when the aircraft image URL changes.
   * This ensures that if a new flight is loaded with a valid image URL,
   * we attempt to load it even if the previous flight's image failed.
   */
  useEffect(() => {
    setImageError(false);
  }, [flight.tailPhotoUrl]);

  const handleSelectionChange = (checked: boolean) => {
    onSelect?.(flight.id, checked);
  };

  const handleReviewAndBook = () => {
    if (flight.rfqStatus === 'quoted') {
      onReviewAndBook?.(flight.id);
    }
  };

  /**
   * Handles the "View Chat" button click to open operator conversation
   */
  const handleViewChat = () => {
    onViewChat?.(flight.id);
  };

  /**
   * Handles the "View in Avinode" button click
   * Opens the flight details in Avinode marketplace
   * Uses prop deepLink if provided, otherwise falls back to flight.avinodeDeepLink
   */
  const handleViewInAvinode = () => {
    const deepLink = avinodeDeepLink || flight.avinodeDeepLink;
    if (deepLink) {
      window.open(deepLink, '_blank', 'noopener,noreferrer');
    }
    onViewInAvinode?.(flight.id, deepLink);
  };

  /**
   * Get the deep link for this flight (from prop or flight object)
   */
  const flightDeepLink = avinodeDeepLink || flight.avinodeDeepLink;

  /**
   * Get aircraft category - use prop if provided, otherwise map from aircraft type
   */
  const category = aircraftCategory || mapAircraftTypeToCategory(flight.aircraftType);

  /**
   * Determine medical availability - use prop if provided, otherwise from amenities
   */
  const medicalAvailable = hasMedical !== undefined ? hasMedical : flight.amenities.medical;

  /**
   * Determine package availability - use prop if provided, default to false
   */
  const packageAvailable = hasPackage !== undefined ? hasPackage : false;

  /**
   * Handles image load errors by setting the error state,
   * which triggers the placeholder to be displayed instead.
   * This prevents broken image icons from being displayed to users.
   */
  const handleImageError = () => {
    setImageError(true);
  };

  const isBookingEnabled = flight.rfqStatus === 'quoted';

  return (
    <div
      data-testid="rfq-flight-card"
      className={cn(
        'bg-white dark:bg-gray-900 transition-all',
        flight.isSelected && selectable && 'ring-2 ring-blue-500 border-transparent',
        className
      )}
      style={{ height: 'fit-content' }}
    >
      {/* 3-Column Layout: Image (225px) | Aircraft/Transport/RFQ Status (middle) | Price/Amenities/Operator (right) */}
      <div className={cn('flex pb-4', compact ? 'flex-col sm:flex-row' : 'flex-row')} style={{ minHeight: '282px' }}>
        {/* Column 1: Aircraft Image - 225px width, column layout, 280px height */}
        <div className={cn(
          'bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center shrink-0',
          compact ? 'w-full h-[280px] sm:w-[225px]' : 'w-[225px] h-[280px]'
        )} style={{ height: '280px', gap: '0px' }}>
          {flight.tailPhotoUrl && !imageError ? (
            <img
              src={flight.tailPhotoUrl}
              alt={flight.aircraftModel}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          ) : (
            <div data-testid="aircraft-placeholder" className="flex items-center justify-center w-full h-full bg-gray-200 dark:bg-gray-700" style={{ height: 'fit-content' }}>
              <Plane className="h-16 w-16 text-gray-400 dark:text-gray-500" style={{ height: '100%' }} />
            </div>
          )}
        </div>

        {/* Column 2: Aircraft, Transport, RFQ Status - Middle column - Added left padding for spacing */}
        <div className="flex-1 py-4 pl-5 space-y-5" style={{ height: 'fit-content' }}>
          {/* Aircraft Section */}
          <div data-testid="aircraft-section" className="space-y-2">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aircraft</h5>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p><span className="font-medium">Category:</span> {category}</p>
              {flight.aircraftModel && (
                <p><span className="font-medium">Aircraft:</span> {flight.aircraftModel}</p>
              )}
              {flight.tailNumber && (
                <p><span className="font-medium">Tail Number:</span> {flight.tailNumber}</p>
              )}
              {flight.yearOfManufacture && (
                <p><span className="font-medium">Year of Make:</span> {flight.yearOfManufacture}</p>
              )}
            </div>
          </div>

          {/* Transport Section */}
          <div data-testid="transport-section" className="space-y-2">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transport</h5>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p><span className="font-medium">Passenger Capacity:</span> {flight.passengerCapacity}</p>
              <p><span className="font-medium">Medical:</span> {medicalAvailable ? 'YES' : 'NO'}</p>
              <p><span className="font-medium">Package:</span> {packageAvailable ? 'YES' : 'NO'}</p>
            </div>
          </div>

          {/* RFQ Status Section */}
          <div data-testid="rfq-status-section" className="space-y-2">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">RFQ Status</h5>
            <span 
              data-testid="status-badge" 
              className={cn(
                'inline-block px-3 py-1.5 rounded-md text-xs font-medium',
                getStatusBadgeClasses(flight.rfqStatus)
              )}
            >
              {flight.rfqStatus.charAt(0).toUpperCase() + flight.rfqStatus.slice(1)}
            </span>
          </div>

          {/* Selection Checkbox (if selectable) */}
          {selectable && !showBookButton && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Checkbox
                checked={flight.isSelected}
                onCheckedChange={handleSelectionChange}
                aria-label={`Select flight from ${flight.operatorName}`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Select for proposal</span>
            </div>
          )}
        </div>

        {/* Column 3: Price, Amenities, Operator - Right column - Removed vertical separator */}
        <div className="w-[200px] shrink-0 py-4 pl-5 flex flex-col space-y-5" style={{ height: 'fit-content' }}>
          {/* Price Section */}
          <div data-testid="price-section" className="flex flex-col gap-2">
            <div style={{ display: 'flex', flexFlow: 'row' }}>
              <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100" style={{ width: '100%' }}>Price</h5>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100" style={{ width: 'fit-content' }}>
                {formatPrice(flight.totalPrice, flight.currency)}
              </p>
            </div>
            {showPriceBreakdown && flight.priceBreakdown && (
              <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                <p>Base: {formatPrice(flight.priceBreakdown.basePrice, flight.currency)}</p>
                {flight.priceBreakdown.fuelSurcharge && (
                  <p>Fuel: {formatPrice(flight.priceBreakdown.fuelSurcharge, flight.currency)}</p>
                )}
                <p>Taxes: {formatPrice(flight.priceBreakdown.taxes, flight.currency)}</p>
                <p>Fees: {formatPrice(flight.priceBreakdown.fees, flight.currency)}</p>
              </div>
            )}
          </div>

          {/* Amenities Section */}
          <div data-testid="amenities-section" className="space-y-2">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Amenities</h5>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p><span className="font-medium">Pets Allowed:</span> {flight.amenities.pets ? 'YES' : 'NO'}</p>
              <p><span className="font-medium">Smoking Allowed:</span> {flight.amenities.smoking ? 'YES' : 'NO'}</p>
              <p><span className="font-medium">Wi-Fi:</span> {flight.amenities.wifi ? 'YES' : 'NO'}</p>
            </div>
          </div>

          {/* Operator Section - Added bottom padding to prevent overlap with separator */}
          <div data-testid="operator-section" className="space-y-2 pb-4">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Operator</h5>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p><span className="font-medium">Company:</span> {flight.operatorName}</p>
              {flight.operatorEmail && (
                <p><span className="font-medium">Email:</span> {flight.operatorEmail}</p>
              )}
              {flight.operatorRating && (
                <p className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="font-medium">Rating:</span> {flight.operatorRating}
                </p>
              )}
              {onViewChat && (
                <div className="pt-2 flex flex-row justify-between items-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Messages:</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewChat}
                    className="flex items-center gap-2"
                    aria-label="View chat"
                  >
                    <MessageSquare className="h-4 w-4" />
                    View
                  </Button>
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
