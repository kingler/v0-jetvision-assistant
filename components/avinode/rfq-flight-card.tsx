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
  ChevronDown,
  ChevronUp,
  FileText,
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
  /** 
   * Total price - PRIMARY source: sellerPrice.price from Avinode API
   * FALLBACK: pricing.total from pricing object
   * Per Avinode API: GET /quotes/{quoteId} returns sellerPrice { price, currency }
   * 
   * IMPORTANT: Prices are ALWAYS visible before the operator responds to the RFQ (never $0).
   * The initial price shown is the price that the operator must accept and acknowledge.
   * This price is set when the RFQ is created and remains visible throughout the workflow.
   * 
   * @see https://developer.avinodegroup.com/reference/readmessage
   */
  totalPrice: number;
  /** 
   * Currency code (ISO 4217) - PRIMARY source: sellerPrice.currency from Avinode API
   * FALLBACK: pricing.currency from pricing object
   */
  currency: string;
  /** 
   * Price breakdown - maps to pricing object in Avinode API
   * Note: sellerPrice doesn't include breakdown, so this comes from pricing object
   */
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
  /**
   * RFQ Status - indicates the current state of the operator's response
   * - 'sent': RFQ was sent to operator but no response yet
   * - 'unanswered': RFQ sent, awaiting operator response
   * - 'quoted': Operator responded with a quote (status changes from 'unanswered'/'sent' to 'quoted' when operator responds)
   * - 'declined': Operator declined to provide a quote
   * - 'expired': Quote or RFQ has expired
   * 
   * Status automatically updates when:
   * - Operator responds with quote → changes to 'quoted'
   * - Operator declines → changes to 'declined'
   * - Quote expires → changes to 'expired'
   * 
   * Status is retrieved from Avinode API via get_rfq tool which calls GET /rfqs/{id}
   * @see https://sandbox.avinode.com/api/rfqs/{id}
   */
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
  /** Message ID for retrieving specific operator messages (from webhook events) */
  messageId?: string;
  /**
   * Operator message text - PRIMARY source: sellerMessage field from Avinode API
   * Per Avinode API: GET /quotes/{quoteId} returns sellerMessage (string) containing operator's message
   * FALLBACK: notes field or trip messages
   * @see https://developer.avinodegroup.com/reference/readmessage
   */
  sellerMessage?: string;
  /**
   * Leg type for round-trip flights
   * - 'outbound': First leg of a round-trip (departure to destination)
   * - 'return': Second leg of a round-trip (destination back to origin)
   * - undefined: One-way flight or leg type not specified
   */
  legType?: 'outbound' | 'return';
  /**
   * Leg sequence number for multi-leg trips
   * - 1: First leg (outbound)
   * - 2: Second leg (return)
   * - 3+: Additional legs for multi-city
   * - undefined: One-way flight or sequence not specified
   */
  legSequence?: number;
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
  onViewChat?: (flightId: string, quoteId?: string, messageId?: string) => void;
  /** Callback when "Book flight" button is clicked */
  onBookFlight?: (flightId: string, quoteId?: string) => void;
  /** Callback when "Generate flight proposal" button is clicked */
  onGenerateProposal?: (flightId: string, quoteId?: string) => void;
  /** Whether operator messages exist for this flight (triggers display of action buttons) */
  hasMessages?: boolean;
  /** Whether there are new/unread messages from the operator (shows notification dot on Messages button) */
  hasNewMessages?: boolean;
  /** Quote ID for retrieving messages and status */
  quoteId?: string;
  /** Message ID for retrieving specific message */
  messageId?: string;
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
 *          Returns "Price Pending" if amount is 0 or falsy (defense-in-depth)
 */
function formatPrice(amount: number, currency: string): string {
  // FIX: Handle $0.00 case - show "Price Pending" instead of "$0" for quotes without prices
  // This serves as defense-in-depth if a quote without price data reaches the UI
  if (!amount || amount === 0) {
    return 'Price Pending';
  }

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
  // Small badge style - compact padding with rounded corners to prevent overlap
  const baseClasses = 'px-2 py-0.5 text-[11px] font-medium rounded leading-tight';
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
  onBookFlight,
  onGenerateProposal,
  hasMessages = false,
  hasNewMessages = false,
  quoteId,
  messageId,
  aircraftCategory,
  hasMedical,
  hasPackage,
  avinodeDeepLink,
  onViewInAvinode,
}: RFQFlightCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  // Track image loading errors to show placeholder when image fails to load
  const [imageError, setImageError] = useState(false);
  // Track expanded/collapsed state for compact view with "show more" functionality
  const [isExpanded, setIsExpanded] = useState(false);

    // Log flight data when component renders for debugging
    useEffect(() => {
      // Extract price and status fields for debugging
      const priceFields = {
        totalPrice: flight.totalPrice,
        price: (flight as any).price,
        total_price: (flight as any).total_price,
        sellerPrice_price: (flight as any).sellerPrice?.price,
        pricing_total: (flight as any).pricing?.total,
      }
      const statusFields = {
        rfqStatus: flight.rfqStatus,
        status: (flight as any).status,
        rfq_status: (flight as any).rfq_status,
        quote_status: (flight as any).quote_status,
      }
      
      console.log('[RFQFlightCard] 🎴 Component rendered - Flight ID:', flight.id)
      console.log('[RFQFlightCard] 🎴 Operator:', flight.operatorName)
      console.log('[RFQFlightCard] 🎴 Price:', formatPrice(flight.totalPrice, flight.currency || 'USD'))
      console.log('[RFQFlightCard] 🎴 Status:', flight.rfqStatus)
      console.log('[RFQFlightCard] 🎴 Currency:', flight.currency)
      
      // Note: Price is always present from the initial RFQ creation.
      // The initial price shown is what the operator must accept and acknowledge.
      // Status changes to 'quoted' when the operator responds/accepts.
      // Having a price with 'unanswered'/'sent' status is the normal initial state.
    }, [flight.id, flight.totalPrice, flight.rfqStatus, flight.currency]) // Re-run when these change

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
   * Retrieves messages using quote ID and message ID, then inserts into chat input
   */
  const handleViewChat = () => {
    onViewChat?.(flight.id, quoteId, messageId);
  };

  /**
   * Handles the "Book flight" button click
   */
  const handleBookFlight = () => {
    onBookFlight?.(flight.id, quoteId);
  };

  /**
   * Handles the "Generate flight proposal" button click
   */
  const handleGenerateProposal = () => {
    onGenerateProposal?.(flight.id, quoteId);
  };

  /**
   * Determine if action buttons should be shown
   * Show when status is 'quoted' - meaning the operator has responded/accepted
   *
   * When rfqStatus changes to 'quoted':
   * - Operator has confirmed availability and pricing
   * - Operator's response includes a message with details
   * - "Generate Proposal" and "Book Flight" buttons become visible
   */
  const showActionButtons = flight.rfqStatus === 'quoted';

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
  const operatorMessage = flight.sellerMessage?.trim();
  const operatorMessagePreview =
    operatorMessage && operatorMessage.length > 140
      ? `${operatorMessage.slice(0, 140)}…`
      : operatorMessage;

  /**
   * Toggle expanded/collapsed state for compact view
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  /**
   * Determine if we should show compact view
   * Compact view shows: smaller image, aircraft details, price, RFQ status badge, and messages button
   */
  const showCompactView = compact && !isExpanded;
  // Compact image size: 120px width, 120px height (square thumbnail)
  const compactImageSize = 120;
  // Full image size: Reduced to 150px width, 180px height for better layout
  const fullImageWidth = 150;
  const fullImageHeight = 180;

  return (
    <div
      data-testid="rfq-flight-card"
      className={cn(
        'bg-white dark:bg-gray-900 transition-all relative',
        flight.isSelected && selectable && 'ring-2 ring-blue-500 border-transparent',
        className
      )}
      style={{ height: 'fit-content' }}
    >
      {/* Price - Positioned at top right corner in compact view */}
      {showCompactView && (
        <div
          data-testid="price-section-compact"
          className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5"
        >
          {/* Price display - always shows initial price that operator must accept/acknowledge */}
          <p className="text-lg font-semibold text-black dark:text-white">
            {formatPrice(flight.totalPrice || 0, flight.currency || 'USD')}
          </p>
          {/* Badges Row - Leg type and status badges side by side to prevent overlap */}
          <div className="flex items-center gap-1.5">
            {/* Leg Type Badge - For round-trip/multi-leg */}
            {(flight.legType || (flight.legSequence && flight.legSequence >= 3)) && (
              <span
                data-testid="leg-type-badge"
                className={cn(
                  'inline-block px-2 py-0.5 rounded text-[11px] font-medium leading-tight',
                  flight.legSequence && flight.legSequence >= 3
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : flight.legType === 'outbound'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                )}
              >
                {flight.legSequence && flight.legSequence >= 3
                  ? `Leg ${flight.legSequence}`
                  : flight.legType === 'outbound' ? 'Outbound' : 'Return'}
              </span>
            )}
            {/* Status Badge - Inline next to leg type badge */}
            <span
              data-testid="rfq-status-badge"
              className={cn('inline-block px-2 py-0.5 rounded text-[11px] font-medium leading-tight', getStatusBadgeClasses(flight.rfqStatus))}
            >
              {flight.rfqStatus.charAt(0).toUpperCase() + flight.rfqStatus.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* Compact View: Smaller thumbnail, essential info only */}
      {showCompactView ? (
        <div className="flex gap-4 pb-4 pt-2">
          {/* Compact Image: 120x120 thumbnail */}
          <div
            className="bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center shrink-0"
            style={{ width: `${compactImageSize}px`, height: `${compactImageSize}px` }}
          >
            {flight.tailPhotoUrl && !imageError ? (
              <img
                src={flight.tailPhotoUrl}
                alt={flight.aircraftModel}
                className="w-full h-full object-cover"
                style={{ objectFit: 'cover' }}
                onError={handleImageError}
              />
            ) : (
              <div
                data-testid="aircraft-placeholder"
                className="flex items-center justify-center w-full h-full bg-gray-200 dark:bg-gray-700"
              >
                <Plane className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </div>

          {/* Compact Content: Aircraft details, messages */}
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex-1 space-y-3">
              {/* Aircraft Details */}
              <div data-testid="aircraft-section" className="space-y-1">
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                  {category && (
                    <p><span className="font-medium">Category:</span> {category}</p>
                  )}
                  {flight.aircraftModel && (
                    <p><span className="font-medium">Aircraft:</span> {flight.aircraftModel}</p>
                  )}
                  {flight.tailNumber && (
                    <p><span className="font-medium">Tail Number:</span> {flight.tailNumber}</p>
                  )}
                </div>
              </div>
              {operatorMessagePreview && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Operator message:</span>{' '}
                  {operatorMessagePreview}
                </div>
              )}
            </div>

            {/* Bottom Row: Messages Button, Action Buttons (when quoted + messages), and Show More */}
            {/* Add 8px spacing (mt-2) above the grey divider line to separate from status badge */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Messages Button with notification dot for new messages */}
                {onViewChat && (
                  <div className="relative inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewChat}
                      className="flex items-center gap-2 text-gray-900 dark:text-gray-100"
                      aria-label="View chat"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Messages
                    </Button>
                    {/* Notification dot - positioned at top right corner, overlaps button border */}
                    {hasNewMessages && (
                      <span
                        className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-500 border-2 border-white dark:border-gray-900 z-10"
                        aria-label="New messages"
                        title="New messages from operator"
                      />
                    )}
                  </div>
                )}

                {/* Action Buttons: Book flight and Generate proposal (shown when status is 'quoted' and messages exist) */}
                {/* 
                  NOTE: We intentionally use the same outline styling as the Messages button here.
                  This keeps all primary actions visually consistent and relies on the shared Button
                  component styles (border, bg-background, hover:accent, etc.) instead of custom colors.
                */}
                {showActionButtons && (
                  <>
                    {onBookFlight && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBookFlight}
                        className="flex items-center gap-2 text-gray-900 dark:text-gray-100"
                        aria-label="Book flight"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Book flight
                      </Button>
                    )}
                    {onGenerateProposal && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateProposal}
                        className="flex items-center gap-2 text-gray-900 dark:text-gray-100"
                        aria-label="Generate Proposal"
                      >
                        <FileText className="h-4 w-4" />
                        Generate Proposal
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Show More Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                aria-label={isExpanded ? 'Show less' : 'Show more'}
                aria-expanded={isExpanded}
              >
                Show More
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Top Row: 3-Column Layout - Image | Aircraft | Operator/Price/RFQ Status */}
          <div className={cn('flex pb-4 pt-2 gap-4', compact && isExpanded ? 'flex-col sm:flex-row' : 'flex-row')}>
            {/* Column 1: Aircraft Image - Reduced to 150px width, 180px height for better layout */}
            <div
              className={cn(
                'bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center shrink-0 rounded-lg overflow-hidden',
                compact && isExpanded ? 'w-full h-[180px] sm:w-[150px]' : 'w-[150px] h-[180px]'
              )}
            >
              {flight.tailPhotoUrl && !imageError ? (
                <img
                  src={flight.tailPhotoUrl}
                  alt={flight.aircraftModel}
                  className="w-full h-full object-cover"
                  style={{ objectFit: 'cover' }}
                  onError={handleImageError}
                />
              ) : (
                <div
                  data-testid="aircraft-placeholder"
                  className="flex items-center justify-center w-full h-full bg-gray-200 dark:bg-gray-700"
                >
                  <Plane className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>

            {/* Column 2: Aircraft Details - Middle column */}
            <div className="flex-1 py-4 space-y-4 min-w-0">
              {/* Aircraft Section */}
              <div data-testid="aircraft-section" className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aircraft</h5>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {category && (
                    <p><span className="font-medium">Category:</span> {category}</p>
                  )}
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

            {/* Column 3: Price, Operator, RFQ Status - Right column */}
            <div className="w-[220px] shrink-0 py-4 flex flex-col space-y-4" style={{ height: 'fit-content' }}>
              {/* Price Section - Prominent placement at top */}
              <div data-testid="price-section" className="space-y-2">
                {/* Price Label and Amount on same row - always shows initial price */}
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Price</h5>
                  <p className="text-2xl font-semibold text-black dark:text-white">
                    {formatPrice(flight.totalPrice || 0, flight.currency || 'USD')}
                  </p>
                </div>
                {/* Leg Type + Status Badges - side by side on one line */}
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  {(flight.legType || (flight.legSequence && flight.legSequence >= 3)) && (
                    <span
                      data-testid="leg-type-badge"
                      className={cn(
                        'inline-block px-2 py-0.5 rounded text-[11px] font-medium leading-tight',
                        flight.legSequence && flight.legSequence >= 3
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          : flight.legType === 'outbound'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      )}
                    >
                      {flight.legSequence && flight.legSequence >= 3
                        ? `Leg ${flight.legSequence}`
                        : flight.legType === 'outbound' ? 'Outbound' : 'Return'}
                    </span>
                  )}
                  <span
                    data-testid="rfq-status-badge"
                    className={getStatusBadgeClasses(flight.rfqStatus)}
                  >
                    {flight.rfqStatus.charAt(0).toUpperCase() + flight.rfqStatus.slice(1)}
                  </span>
                </div>
                {showPriceBreakdown && flight.priceBreakdown && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                    <p>Base: {formatPrice(flight.priceBreakdown.basePrice, flight.currency)}</p>
                    {flight.priceBreakdown.fuelSurcharge && (
                      <p>Fuel: {formatPrice(flight.priceBreakdown.fuelSurcharge, flight.currency)}</p>
                    )}
                    <p>Taxes: {formatPrice(flight.priceBreakdown.taxes, flight.currency)}</p>
                    <p>Fees: {formatPrice(flight.priceBreakdown.fees, flight.currency)}</p>
                  </div>
                )}
              </div>

              {/* Operator Section */}
              <div data-testid="operator-section" className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Operator</h5>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p className="truncate"><span className="font-medium">Company:</span> {flight.operatorName}</p>
                  {flight.operatorEmail && (
                    <p className="truncate"><span className="font-medium">Email:</span> {flight.operatorEmail}</p>
                  )}
                  {flight.operatorRating && (
                    <p className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="font-medium">Rating:</span> {flight.operatorRating}
                    </p>
                  )}
                </div>
              </div>
              {operatorMessagePreview && (
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="font-medium text-gray-700 dark:text-gray-300">Operator message</p>
                  <p className="leading-relaxed">{operatorMessagePreview}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: 2-Column Layout - Transport | Amenities */}
          <div className={cn('flex gap-4 pb-4', compact && isExpanded ? 'flex-col sm:flex-row' : 'flex-row')}>
            {/* Transport Section */}
            <div data-testid="transport-section" className="flex-1 space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transport</h5>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p><span className="font-medium">Passenger Capacity:</span> {flight.passengerCapacity}</p>
                <p><span className="font-medium">Medical:</span> {medicalAvailable ? 'YES' : 'NO'}</p>
                <p><span className="font-medium">Package:</span> {packageAvailable ? 'YES' : 'NO'}</p>
              </div>
            </div>

            {/* Amenities Section */}
            <div data-testid="amenities-section" className="flex-1 space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Amenities</h5>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p><span className="font-medium">Pets Allowed:</span> {flight.amenities.pets ? 'YES' : 'NO'}</p>
                <p><span className="font-medium">Smoking Allowed:</span> {flight.amenities.smoking ? 'YES' : 'NO'}</p>
                <p><span className="font-medium">Wi-Fi:</span> {flight.amenities.wifi ? 'YES' : 'NO'}</p>
              </div>
            </div>
          </div>

          {/* Bottom Action Area: View Messages, Book Flight, Generate Proposal buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* 
                Status updates automatically when operator responds:
                - 'unanswered'/'sent' → 'quoted' when operator provides quote
                - 'unanswered'/'sent' → 'declined' when operator declines
                Status is retrieved from Avinode API via get_rfq tool (GET /rfqs/{id})
                Messages from operators can be retrieved via get_trip_messages tool (GET /tripmsgs/{requestId}/chat)
              */}
              {onViewChat && (
                <div className="relative inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewChat}
                    className="flex items-center gap-2 text-gray-900 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100"
                    aria-label="View chat"
                  >
                    <MessageSquare className="h-4 w-4" />
                    View Messages
                  </Button>
                  {/* Notification dot - positioned at top right corner, overlaps button border */}
                  {hasNewMessages && (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-500 border-2 border-white dark:border-gray-900 z-10"
                      aria-label="New messages"
                      title="New messages from operator"
                    />
                  )}
                </div>
              )}
              {/* Action Buttons: Book flight and Generate proposal (shown when status is 'quoted' and messages exist) */}
              {/* Positioned after Messages button to the right in the same flex container */}
              {showActionButtons && (
                <>
                  {onBookFlight && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBookFlight}
                      className="flex items-center gap-2 text-gray-900 dark:text-gray-100"
                      aria-label="Book flight"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Book Flight
                    </Button>
                  )}
                  {onGenerateProposal && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateProposal}
                      className="flex items-center gap-2 text-gray-900 dark:text-gray-100"
                      aria-label="Generate flight proposal"
                    >
                      <FileText className="h-4 w-4" />
                      Generate Proposal
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Show Less Button (only in compact mode when expanded) */}
              {/* Single Show Less button - removed duplicate rendering logic */}
              {compact && isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpanded}
                  className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  aria-label="Show less"
                  aria-expanded={isExpanded}
                >
                  Show Less
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RFQFlightCard;
