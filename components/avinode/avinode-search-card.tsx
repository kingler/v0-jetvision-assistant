'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateAndFixAvinodeUrl } from '@/lib/utils/avinode-url';

// =============================================================================
// TYPES
// =============================================================================

export interface AvinodeSearchCardProps {
  /** Deep link URL to Avinode Marketplace */
  deepLink: string;
  /** Departure airport ICAO code (shown in instructions) */
  departureIcao?: string;
  /** Arrival airport ICAO code (shown in instructions) */
  arrivalIcao?: string;
  /** Whether the step is completed (shows check icon) */
  isCompleted?: boolean;
  /** Callback when deep link is clicked */
  onDeepLinkClick?: () => void;
  /** Callback when deep link is copied */
  onCopyDeepLink?: () => void;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AvinodeSearchCard({
  deepLink,
  departureIcao,
  arrivalIcao,
  isCompleted = false,
  onDeepLinkClick,
  onCopyDeepLink,
  className,
}: AvinodeSearchCardProps) {
  const [copied, setCopied] = useState(false);

  const validatedDeepLink = useMemo(() => {
    if (!deepLink) return null;
    return validateAndFixAvinodeUrl(deepLink);
  }, [deepLink]);

  const handleCopyLink = useCallback(async () => {
    if (!validatedDeepLink) return;
    try {
      await navigator.clipboard.writeText(validatedDeepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyDeepLink?.();
    } catch {
      // Clipboard API may fail - fail silently
    }
  }, [validatedDeepLink, onCopyDeepLink]);

  const handleDeepLinkClick = useCallback(() => {
    if (validatedDeepLink) {
      window.open(validatedDeepLink, '_blank', 'noopener,noreferrer');
      onDeepLinkClick?.();
    }
  }, [validatedDeepLink, onDeepLinkClick]);

  return (
    <div
      data-testid="avinode-search-card"
      className={cn(
        'text-card-foreground flex flex-col gap-4 rounded-xl py-6 px-4 shadow-sm w-full bg-card border border-border',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ExternalLink className="h-5 w-5 text-primary" />
        )}
        <h4 className="font-semibold text-sm text-foreground">
          Step 2: {isCompleted ? 'Flight & RFQ Selected' : 'Select Flight & RFQ'}
        </h4>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 rounded-md bg-surface-secondary text-sm">
        <p className="font-medium mb-2 text-foreground">How to search and select flights:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Click the button below to open Avinode Marketplace</li>
          {departureIcao && arrivalIcao && (
            <li>
              Enter the airport codes:{' '}
              <span className="font-semibold text-foreground">{departureIcao.toUpperCase()}</span>{' '}
              (departure) and{' '}
              <span className="font-semibold text-foreground">{arrivalIcao.toUpperCase()}</span>{' '}
              (arrival)
            </li>
          )}
          <li>Browse available aircraft and operators</li>
          <li>Select your preferred options and submit your RFQ</li>
        </ol>
      </div>

      {/* Deep Link Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleDeepLinkClick}
          disabled={!deepLink}
          className="sm:w-auto"
          style={{
            backgroundClip: 'unset',
            WebkitBackgroundClip: 'unset',
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in Avinode Marketplace
        </Button>
        <Button
          variant="outline"
          onClick={handleCopyLink}
          disabled={!deepLink}
          className="sm:w-auto text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
