'use client';

import { QuoteComparison } from '@/components/message-components/quote-comparison';
import type { UIActionResult } from '@mcp-ui/server';
import { uiActionResultToolCall } from '@mcp-ui/server';

export interface QuoteComparisonUIProps {
  quotes: Array<{
    id: string;
    operatorName: string;
    aircraftType: string;
    price: number;
    departureTime: string;
    arrivalTime: string;
    flightDuration: string;
    score?: number;
    isRecommended?: boolean;
  }>;
  onAction: (action: UIActionResult) => void;
}

export function QuoteComparisonUI({ quotes, onAction }: QuoteComparisonUIProps) {
  return (
    <QuoteComparison
      quotes={quotes}
      onSelectQuote={(quoteId) => {
        onAction(
          uiActionResultToolCall('create_proposal', { quote_id: quoteId })
        );
      }}
    />
  );
}
