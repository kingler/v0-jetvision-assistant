"use client"

import { QuoteRequestItem, type QuoteRequest } from "./quote-request-item"
import { Clock } from "lucide-react"

export interface QuoteRequestListProps {
  quotes: QuoteRequest[]
  onViewDetails: (quoteId: string) => void
}

/**
 * QuoteRequestList - List of quote requests displayed in the header
 * Shows all pending/received quote requests with their status
 */
export function QuoteRequestList({ quotes, onViewDetails }: QuoteRequestListProps) {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="mt-4 p-4 border border-dashed border-border-strong rounded-lg">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Waiting for quote responses...</span>
        </div>
      </div>
    )
  }

  const receivedCount = quotes.filter(q => q.status === 'received').length
  const pendingCount = quotes.filter(q => q.status === 'pending').length
  const expiredCount = quotes.filter(q => q.status === 'expired').length

  return (
    <div className="mt-4 space-y-3">
      {/* Header with counts */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Quote Requests
        </h3>
        <div className="flex items-center gap-2 text-xs">
          {receivedCount > 0 && (
            <span className="text-success">
              {receivedCount} received
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-muted-foreground">
              {pendingCount} pending
            </span>
          )}
          {expiredCount > 0 && (
            <span className="text-error">
              {expiredCount} expired
            </span>
          )}
        </div>
      </div>

      {/* Quote list */}
      <div className="space-y-2">
        {quotes.map((quote) => (
          <QuoteRequestItem
            key={quote.id}
            quote={quote}
            onViewDetails={() => onViewDetails(quote.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default QuoteRequestList
