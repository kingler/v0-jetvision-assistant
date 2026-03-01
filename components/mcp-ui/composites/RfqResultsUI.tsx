'use client';

import { RFQFlightsList } from '@/components/avinode/rfq-flights-list';
import type { RFQFlight } from '@/lib/chat/types';
import type { UIActionResult } from '@mcp-ui/server';
import { uiActionResultToolCall, uiActionResultPrompt } from '@mcp-ui/server';

export interface RfqResultsUIProps {
  flights: RFQFlight[];
  onAction: (action: UIActionResult) => void;
}

export function RfqResultsUI({ flights, onAction }: RfqResultsUIProps) {
  if (!flights || flights.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No flight quotes received yet.
      </p>
    );
  }

  return (
    <RFQFlightsList
      flights={flights}
      sortable
      compact
      showBookButton
      showPriceBreakdown
      groupByLeg={flights.some(f => f.legType != null)}
      onBookFlight={(flightId, quoteId) => {
        onAction(
          uiActionResultPrompt(
            `Please generate a contract for quote ${quoteId || flightId}. The customer details should be reused from the proposal that was already sent.`
          )
        );
      }}
      onGenerateProposal={(flightId, quoteId) => {
        onAction(
          uiActionResultToolCall('create_proposal', {
            quote_id: quoteId,
            request_id: flightId,
          })
        );
      }}
      onViewChat={(flightId, quoteId) => {
        onAction(
          uiActionResultPrompt(
            `Show me the messages for quote ${quoteId}`
          )
        );
      }}
    />
  );
}
