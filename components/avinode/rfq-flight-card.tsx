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
import { resolveAircraftImageUrlWeb } from '@/lib/aircraft/image-resolver';
import { AircraftImageGallery } from './aircraft-image-gallery';

// =============================================================================
// TYPES — re-exported from canonical source (lib/chat/types)
// =============================================================================

export type { RFQFlight } from '@/lib/chat/types';
import type { RFQFlight } from '@/lib/chat/types';

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
  /** Whether the Book Flight button should be disabled */
  bookFlightDisabled?: boolean;
  /** Tooltip reason when Book Flight is disabled */
  bookFlightDisabledReason?: string;
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
  const baseClasses = 'px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded leading-tight';
  switch (status) {
    case 'sent':
      return cn(baseClasses, 'bg-info-bg text-info');
    case 'unanswered':
      // Gray badge for "Unanswered" per wireframe
      return cn(baseClasses, 'bg-surface-tertiary text-foreground');
    case 'quoted':
      return cn(baseClasses, 'bg-success-bg text-success');
    case 'declined':
      return cn(baseClasses, 'bg-error-bg text-destructive');
    case 'expired':
      return cn(baseClasses, 'bg-surface-tertiary text-muted-foreground');
    default:
      return cn(baseClasses, 'bg-surface-tertiary text-foreground');
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
        enabled ? 'text-success' : 'text-text-placeholder'
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
  bookFlightDisabled,
  bookFlightDisabledReason,
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

  // Resolve category-based stock image for fallback when no tail photo is available
  const stockImageUrl = resolveAircraftImageUrlWeb({
    tailPhotoUrl: flight.tailPhotoUrl,
    aircraftType: flight.aircraftType,
    aircraftModel: flight.aircraftModel,
  });
  // Use tail photo if available, otherwise use stock category image
  const displayImageUrl = (flight.tailPhotoUrl && !imageError)
    ? flight.tailPhotoUrl
    : stockImageUrl;

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
        'transition-all relative',
        flight.isSelected && selectable && 'ring-2 ring-ring border-transparent',
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
          <p className="text-base sm:text-lg font-semibold text-foreground">
            {formatPrice(flight.totalPrice || 0, flight.currency || 'USD')}
          </p>
          {/* Badges Row - Leg type and status badges side by side to prevent overlap */}
          <div className="flex items-center gap-1.5">
            {/* Leg Type Badge - For round-trip/multi-leg */}
            {(flight.legType || (flight.legSequence && flight.legSequence >= 3)) && (
              <span
                data-testid="leg-type-badge"
                className={cn(
                  'inline-block px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium leading-tight',
                  flight.legSequence && flight.legSequence >= 3
                    ? 'bg-status-searching/15 text-status-searching'
                    : flight.legType === 'outbound'
                      ? 'bg-info-bg text-info'
                      : 'bg-success-bg text-success'
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
              className={cn('inline-block px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium leading-tight', getStatusBadgeClasses(flight.rfqStatus))}
            >
              {flight.rfqStatus.charAt(0).toUpperCase() + flight.rfqStatus.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* Compact View: Smaller thumbnail, essential info only */}
      {showCompactView ? (
        <div className="flex gap-3 sm:gap-4 pb-4 pt-2">
          {/* Compact Image: 80x80 on small screens, 120x120 thumbnail on larger */}
          <div
            className="bg-muted shrink-0 w-20 h-20 sm:w-[120px] sm:h-[120px] rounded overflow-hidden"
          >
            <AircraftImageGallery
              aircraftModel={flight.aircraftModel || flight.aircraftType || ''}
              aircraftCategory={category}
              yearOfManufacture={flight.yearOfManufacture}
              fallbackImageUrl={displayImageUrl}
              compact={true}
              alt={flight.aircraftModel || flight.aircraftType || 'Aircraft'}
              onImageError={handleImageError}
            />
          </div>

          {/* Compact Content: Aircraft details, messages */}
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex-1 space-y-3">
              {/* Aircraft Details - responsive text scales down on small screens */}
              <div data-testid="aircraft-section" className="space-y-1">
                <div className="text-xs sm:text-sm text-foreground space-y-0.5">
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
                <div className="text-[11px] sm:text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Operator message:</span>{' '}
                  {operatorMessagePreview}
                </div>
              )}
            </div>

            {/* Bottom Row: Messages Button, Action Buttons (when quoted + messages), and Show More */}
            {/* Add 8px spacing (mt-2) above the grey divider line to separate from status badge */}
            {/* flex-nowrap + responsive sizing keeps all buttons on one line on small screens */}
            <div className="flex flex-nowrap items-center justify-between gap-1 sm:gap-2 pt-2 mt-2 border-t border-border min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-nowrap min-w-0 flex-1 overflow-hidden">
                {/* Messages Button with notification dot for new messages */}
                {onViewChat && (
                  <div className="relative inline-block shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewChat}
                      className="flex items-center gap-1 sm:gap-1.5 text-foreground text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                      aria-label="View chat"
                    >
                      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      Messages
                    </Button>
                    {/* Notification dot - positioned at top right corner, overlaps button border */}
                    {hasNewMessages && (
                      <span
                        className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-info border-2 border-background z-10"
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
                  component styles (border, bg-background, light cyan hover bg + darker cyan border, etc.).
                */}
                {showActionButtons && (
                  <>
                    {onBookFlight && (
                      <div title={bookFlightDisabled ? (bookFlightDisabledReason || 'Book flight is not available') : undefined} className="shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBookFlight}
                          disabled={bookFlightDisabled}
                          className="flex items-center gap-1 sm:gap-1.5 text-foreground text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                          aria-label="Book flight"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span className="sm:hidden">Book</span><span className="hidden sm:inline">Book flight</span>
                        </Button>
                      </div>
                    )}
                    {onGenerateProposal && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateProposal}
                        className="flex items-center gap-1 sm:gap-1.5 text-foreground text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8 shrink-0"
                        aria-label="Generate Proposal"
                      >
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="sm:hidden">Proposal</span><span className="hidden sm:inline">Generate Proposal</span>
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Show More Button - shrink-0 keeps it visible, responsive sizing for small screens */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="flex items-center gap-1 text-xs sm:text-sm text-foreground px-2 sm:px-3 h-7 sm:h-8 shrink-0"
                aria-label={isExpanded ? 'Show less' : 'Show more'}
                aria-expanded={isExpanded}
              >
                <span className="sm:hidden">More</span><span className="hidden sm:inline">Show More</span>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Top Row: 3-Column Layout - Image (33.3%) | Aircraft+Operator (33.3%) | Price+Status (33.3%) */}
          <div
            className={cn(
              'pb-4 pt-2 gap-4',
              compact && isExpanded
                ? 'grid grid-cols-1 sm:grid-cols-3 min-w-0'
                : 'flex flex-col sm:flex-row'
            )}
          >
            {/* Column 1: Aircraft Image Gallery - 33.3% width, constrained to grid cell */}
            <div
              className={cn(
                'rounded-lg overflow-hidden min-w-0',
                compact && isExpanded ? 'w-full max-h-[180px]' : 'w-full sm:w-[150px] shrink-0'
              )}
            >
              <AircraftImageGallery
                aircraftModel={flight.aircraftModel || flight.aircraftType || ''}
                aircraftCategory={category}
                yearOfManufacture={flight.yearOfManufacture}
                fallbackImageUrl={displayImageUrl}
                compact={false}
                alt={flight.aircraftModel || flight.aircraftType || 'Aircraft'}
                onImageError={handleImageError}
              />
            </div>

            {/* Column 2: Aircraft + Operator - Middle column (33.3%) */}
            <div
              className={cn(
                'py-4 space-y-4 min-w-0 overflow-hidden',
                compact && isExpanded ? 'flex flex-col' : 'flex-1'
              )}
            >
              {/* Aircraft Section */}
              <div data-testid="aircraft-section" className="space-y-2">
                <h5 className="text-xs sm:text-sm font-semibold text-foreground">Aircraft</h5>
                <div className="space-y-1 text-xs sm:text-sm text-foreground">
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

              {/* Operator Section - Moved to middle column for even distribution */}
              <div data-testid="operator-section" className="space-y-2 pt-2 border-t border-border">
                <h5 className="text-xs sm:text-sm font-semibold text-foreground">Operator</h5>
                <div className="space-y-1 text-xs sm:text-sm text-foreground">
                  <p className="truncate"><span className="font-medium">Company:</span> {flight.operatorName}</p>
                  {flight.operatorEmail && (
                    <p className="truncate"><span className="font-medium">Email:</span> {flight.operatorEmail}</p>
                  )}
                  {flight.operatorRating && (
                    <p className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-warning fill-warning shrink-0" />
                      <span className="font-medium">Rating:</span> {flight.operatorRating}
                    </p>
                  )}
                </div>
              </div>
              {operatorMessagePreview && (
                <div className="space-y-1 text-[11px] sm:text-xs text-muted-foreground pt-2 border-t border-border">
                  <p className="font-medium text-foreground">Operator message</p>
                  <p className="leading-relaxed line-clamp-3">{operatorMessagePreview}</p>
                </div>
              )}

              {/* Selection Checkbox (if selectable) */}
              {selectable && !showBookButton && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Checkbox
                    checked={flight.isSelected}
                    onCheckedChange={handleSelectionChange}
                    aria-label={`Select flight from ${flight.operatorName}`}
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground">Select for proposal</span>
                </div>
              )}
            </div>

            {/* Column 3: Price + RFQ Status - Right column (33.3%) */}
            <div
              className={cn(
                'py-4 flex flex-col space-y-4 min-w-0',
                compact && isExpanded ? 'w-full' : 'w-full sm:w-[220px] shrink-0'
              )}
              style={{ height: 'fit-content' }}
            >
              {/* Price Section - Prominent placement at top (label removed in expanded view) */}
              <div data-testid="price-section" className="space-y-2">
                {/* Price amount only - right-aligned; always shows initial price that operator must accept/acknowledge */}
                <p className="text-xl sm:text-2xl font-semibold text-foreground text-right">
                  {formatPrice(flight.totalPrice || 0, flight.currency || 'USD')}
                </p>
                {/* Leg Type + Status Badges - side by side on one line */}
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  {(flight.legType || (flight.legSequence && flight.legSequence >= 3)) && (
                    <span
                      data-testid="leg-type-badge"
                      className={cn(
                        'inline-block px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium leading-tight',
                        flight.legSequence && flight.legSequence >= 3
                          ? 'bg-status-searching/15 text-status-searching'
                          : flight.legType === 'outbound'
                            ? 'bg-info-bg text-info'
                            : 'bg-success-bg text-success'
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
                  <div className="mt-2 text-[11px] sm:text-xs text-muted-foreground space-y-0.5">
                    <p>Base: {formatPrice(flight.priceBreakdown.basePrice, flight.currency)}</p>
                    {flight.priceBreakdown.fuelSurcharge && (
                      <p>Fuel: {formatPrice(flight.priceBreakdown.fuelSurcharge, flight.currency)}</p>
                    )}
                    <p>Taxes: {formatPrice(flight.priceBreakdown.taxes, flight.currency)}</p>
                    <p>Fees: {formatPrice(flight.priceBreakdown.fees, flight.currency)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: 2-Column Layout - Transport | Amenities */}
          <div className={cn('flex gap-4 pb-4', compact && isExpanded ? 'flex-col sm:flex-row' : 'flex-row')}>
            {/* Transport Section */}
            <div data-testid="transport-section" className="flex-1 space-y-2 pt-2 border-t border-border">
              <h5 className="text-xs sm:text-sm font-semibold text-foreground">Transport</h5>
              <div className="space-y-1 text-xs sm:text-sm text-foreground">
                <p><span className="font-medium">Passenger Capacity:</span> {flight.passengerCapacity}</p>
                <p><span className="font-medium">Medical:</span> {medicalAvailable ? 'YES' : 'NO'}</p>
                <p><span className="font-medium">Package:</span> {packageAvailable ? 'YES' : 'NO'}</p>
              </div>
            </div>

            {/* Amenities Section */}
            <div data-testid="amenities-section" className="flex-1 space-y-2 pt-2 border-t border-border">
              <h5 className="text-xs sm:text-sm font-semibold text-foreground">Amenities</h5>
              <div className="space-y-1 text-xs sm:text-sm text-foreground">
                <p><span className="font-medium">Pets Allowed:</span> {flight.amenities.pets ? 'YES' : 'NO'}</p>
                <p><span className="font-medium">Smoking Allowed:</span> {flight.amenities.smoking ? 'YES' : 'NO'}</p>
                <p><span className="font-medium">Wi-Fi:</span> {flight.amenities.wifi ? 'YES' : 'NO'}</p>
              </div>
            </div>
          </div>

          {/* Bottom Action Area: View Messages, Book Flight, Generate Proposal buttons */}
          {/* flex-nowrap + responsive sizing keeps all buttons on one line on small screens */}
          <div className="flex flex-nowrap items-center justify-between gap-1 sm:gap-2 pt-2 border-t border-border pb-4 min-w-0">
            <div className="flex flex-nowrap items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
              {/* 
                Status updates automatically when operator responds:
                - 'unanswered'/'sent' → 'quoted' when operator provides quote
                - 'unanswered'/'sent' → 'declined' when operator declines
                Status is retrieved from Avinode API via get_rfq tool (GET /rfqs/{id})
                Messages from operators can be retrieved via get_trip_messages tool (GET /tripmsgs/{requestId}/chat)
              */}
              {onViewChat && (
                <div className="relative inline-block shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewChat}
                    className="flex items-center gap-1 sm:gap-1.5 text-foreground text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                    aria-label="View chat"
                  >
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="sm:hidden">Messages</span><span className="hidden sm:inline">View Messages</span>
                  </Button>
                  {/* Notification dot - positioned at top right corner, overlaps button border */}
                  {hasNewMessages && (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-info border-2 border-background z-10"
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
                    <div title={bookFlightDisabled ? (bookFlightDisabledReason || 'Book flight is not available') : undefined} className="shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBookFlight}
                        disabled={bookFlightDisabled}
                        className="flex items-center gap-1 sm:gap-1.5 text-foreground text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
                        aria-label="Book flight"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="sm:hidden">Book</span><span className="hidden sm:inline">Book Flight</span>
                      </Button>
                    </div>
                  )}
                  {onGenerateProposal && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateProposal}
                      className="flex items-center gap-1 sm:gap-1.5 text-foreground text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8 shrink-0"
                      aria-label="Generate flight proposal"
                    >
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="sm:hidden">Proposal</span><span className="hidden sm:inline">Generate Proposal</span>
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Show Less Button (only in compact mode when expanded) */}
              {/* Single Show Less button - removed duplicate rendering logic */}
              {compact && isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpanded}
                  className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground px-2 sm:px-3 h-7 sm:h-8"
                  aria-label="Show less"
                  aria-expanded={isExpanded}
                >
                  <span className="sm:hidden">Less</span><span className="hidden sm:inline">Show Less</span>
                  <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
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
