'use client';

import { RFQFlightCard } from '@/components/avinode';
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          {flights.length} Flight Quote{flights.length !== 1 ? 's' : ''}
        </h4>
      </div>
      <div className="space-y-2">
        {flights.map((flight) => (
          <RFQFlightCard
            key={flight.id}
            flight={flight}
            onGenerateProposal={(flightId, quoteId) => {
              onAction(
                uiActionResultToolCall('create_proposal', {
                  quote_id: quoteId || flight.quoteId,
                  request_id: flightId,
                })
              );
            }}
            onViewChat={(flightId, quoteId) => {
              onAction(
                uiActionResultPrompt(
                  `Show me the messages for quote ${quoteId || flight.quoteId}`
                )
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
