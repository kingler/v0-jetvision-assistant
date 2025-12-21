import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Check, Plane, Calendar, Users } from 'lucide-react';
import type { DeepLinkPromptProps } from './types';

/**
 * DeepLinkPrompt Component
 *
 * Displays flight request summary after RFP creation and prompts user
 * to open the Avinode marketplace via deep link.
 *
 * Features:
 * - Auto-opens Avinode marketplace in new tab on mount
 * - Route visualization (departure → arrival)
 * - Flight details (date, passengers, request ID)
 * - Primary CTA to open Avinode marketplace (manual fallback)
 * - Secondary CTA to copy link
 * - Help text with next steps
 * - Mobile responsive design
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <DeepLinkPrompt
 *   departureAirport={{ icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' }}
 *   arrivalAirport={{ icao: 'KPBI', name: 'Palm Beach International', city: 'West Palm Beach, FL' }}
 *   departureDate="2025-12-25"
 *   passengers={6}
 *   requestId="REQ-12345"
 *   deepLink="https://marketplace.avinode.com/trip/12345"
 *   autoOpen={true}
 *   onLinkClick={() => console.log('Link clicked')}
 *   onCopyLink={() => console.log('Link copied')}
 * />
 * ```
 */
export function DeepLinkPrompt({
  departureAirport,
  arrivalAirport,
  departureDate,
  passengers,
  requestId,
  deepLink,
  autoOpen = true,
  onLinkClick,
  onCopyLink,
}: DeepLinkPromptProps) {
  const [copied, setCopied] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoOpenAttemptedRef = useRef(false);

  // Auto-open Avinode marketplace in new tab when component mounts
  useEffect(() => {
    if (autoOpen && deepLink && !autoOpenAttemptedRef.current) {
      autoOpenAttemptedRef.current = true;

      // Small delay to ensure UI renders first
      const openTimer = setTimeout(() => {
        try {
          const newWindow = window.open(deepLink, '_blank', 'noopener,noreferrer');
          if (newWindow) {
            setAutoOpened(true);
            console.log('[DeepLinkPrompt] Auto-opened Avinode marketplace:', deepLink);
            onLinkClick?.();
          } else {
            // Popup might be blocked
            console.warn('[DeepLinkPrompt] Auto-open blocked by browser. User can click the button manually.');
          }
        } catch (error) {
          console.error('[DeepLinkPrompt] Failed to auto-open:', error);
        }
      }, 500);

      return () => clearTimeout(openTimer);
    }
  }, [autoOpen, deepLink, onLinkClick]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Format ISO date string to human-readable format
   * @param dateString - ISO date string (YYYY-MM-DD) or other date formats
   * @returns Formatted date string (e.g., "December 25, 2025") or fallback
   */
  const formatDate = (dateString: string): string => {
    if (!dateString || dateString === 'Invalid Date' || dateString === 'N/A') {
      return 'Date to be confirmed';
    }

    try {
      // Try parsing YYYY-MM-DD format first
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
      }

      // Try parsing as generic date string
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      return 'Date to be confirmed';
    } catch {
      return 'Date to be confirmed';
    }
  };

  /**
   * Handle copy link to clipboard
   */
  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);

      // Clear any existing timeout to prevent race conditions
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Reset copied state after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);

      // Call optional callback
      onCopyLink?.();
    } catch {
      // Clipboard API may fail in some browsers/contexts - fail silently
      // The user can still use the primary CTA link
    }
  };

  /**
   * Handle primary link click
   */
  const handleLinkClick = (): void => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <Card data-testid="avinode-deep-link-prompt" className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Your request has been created
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flight Summary */}
        <div className="space-y-4">
          {/* Route Visualization */}
          <div data-testid="route-visualization" className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
            {/* Departure */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span data-testid="departure-icao" className="text-2xl font-bold text-primary">
                  {departureAirport.icao}
                </span>
              </div>
              {departureAirport.name && (
                <p className="text-sm text-muted-foreground mt-1">
                  {departureAirport.name}
                </p>
              )}
              {departureAirport.city && (
                <p className="text-xs text-muted-foreground">
                  {departureAirport.city}
                </p>
              )}
            </div>

            {/* Flight Path */}
            <div className="shrink-0 flex items-center gap-2">
              <div className="h-px w-8 bg-primary/30 sm:w-16" />
              <Plane className="h-5 w-5 text-primary rotate-90" />
              <div className="h-px w-8 bg-primary/30 sm:w-16" />
            </div>

            {/* Arrival */}
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <span data-testid="arrival-icao" className="text-2xl font-bold text-primary">
                  {arrivalAirport.icao}
                </span>
              </div>
              {arrivalAirport.name && (
                <p className="text-sm text-muted-foreground mt-1">
                  {arrivalAirport.name}
                </p>
              )}
              {arrivalAirport.city && (
                <p className="text-xs text-muted-foreground">
                  {arrivalAirport.city}
                </p>
              )}
            </div>
          </div>

          {/* Flight Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 dark:bg-muted/20">
              <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                  Departure
                </span>
                <p className="text-sm font-medium mt-1">{formatDate(departureDate)}</p>
              </div>
            </div>

            {/* Passengers */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 dark:bg-muted/20">
              <Users className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                  Passengers
                </span>
                <p className="text-sm font-medium mt-1">{passengers}</p>
              </div>
            </div>

            {/* Request ID */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 dark:bg-muted/20">
              <div className="h-5 w-5 mt-0.5 flex items-center justify-center text-muted-foreground shrink-0">
                <span className="text-xs font-bold">#</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                  Request ID
                </span>
                <p data-testid="request-id" className="text-sm font-medium font-mono mt-1 truncate" title={requestId}>
                  {requestId}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Primary CTA - Open in Avinode */}
          <Button
            asChild
            variant="default"
            size="lg"
            className="w-full"
          >
            <a
              data-testid="avinode-deep-link-button"
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-5 w-5" />
              <span>Open in Avinode Marketplace</span>
            </a>
          </Button>

          {/* Secondary CTA - Copy Link */}
          <Button
            data-testid="copy-link-button"
            variant="outline"
            size="default"
            className="w-full"
            onClick={handleCopyLink}
            aria-label="Copy deep link to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Link</span>
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="rounded-lg bg-muted/50 p-4 dark:bg-muted/20">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {autoOpened ? (
              <>
                ✓ Avinode Marketplace has been opened in a new tab.{' '}
                <span className="font-medium">Click the button above if the tab didn&apos;t open.</span>
              </>
            ) : (
              <>
                Click the button above to open your request in Avinode Marketplace.
                You can view quotes, communicate with operators, and manage your trip details.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
