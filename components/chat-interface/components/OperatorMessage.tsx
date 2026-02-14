/**
 * OperatorMessage Component
 *
 * Renders an operator message in the chat interface.
 * Displays with amber styling and operator name badge.
 *
 * Extracted from: components/chat-interface.tsx (lines 2059-2098)
 */

'use client';

import React, { memo } from 'react';
import { formatMessageTimestamp } from '@/lib/utils/format';

export interface OperatorMessageProps {
  /** Message content */
  content: string;
  /** Operator display name */
  operatorName?: string;
  /** Message type for badge display */
  messageType?: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';
  /** Quote ID for thread navigation */
  quoteId?: string;
  /** Message timestamp */
  timestamp: Date;
  /** Handler for viewing the operator thread */
  onViewThread?: (quoteId: string) => void;
  /** Optional className for customization */
  className?: string;
}

/**
 * Map message type to display label
 */
function getMessageTypeLabel(type?: OperatorMessageProps['messageType']): string | null {
  switch (type) {
    case 'RESPONSE':
      return 'Quote Response';
    case 'REQUEST':
      return 'Your Request';
    case 'INFO':
      return 'Information';
    case 'CONFIRMATION':
      return 'Confirmed';
    default:
      return null;
  }
}

/**
 * Operator message component with distinctive amber styling.
 *
 * @example
 * ```tsx
 * <OperatorMessage
 *   content="Thank you for your request. We can offer..."
 *   operatorName="NetJets"
 *   messageType="RESPONSE"
 *   quoteId="quote-123"
 *   timestamp={new Date()}
 *   onViewThread={(quoteId) => handleViewThread(quoteId)}
 * />
 * ```
 */
export const OperatorMessage = memo(function OperatorMessage({
  content,
  operatorName = 'Operator',
  messageType,
  quoteId,
  timestamp,
  onViewThread,
  className = '',
}: OperatorMessageProps) {
  const typeLabel = getMessageTypeLabel(messageType);
  const initial = operatorName[0]?.toUpperCase() || 'O';

  const handleViewThread = () => {
    if (quoteId && onViewThread) {
      onViewThread(quoteId);
    }
  };

  return (
    <div className={`flex justify-start ${className}`}>
      <div className="max-w-[85%] bg-warning-bg text-foreground rounded-2xl px-4 py-3 border border-warning-border shadow-sm">
        {/* Operator header with avatar and name */}
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{initial}</span>
          </div>
          <span className="text-xs font-semibold text-warning">
            {operatorName}
          </span>
          {typeLabel && (
            <span className="text-[10px] px-1.5 py-0.5 bg-warning-border text-warning rounded-full">
              {typeLabel}
            </span>
          )}
        </div>

        {/* Message content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

        {/* Footer with timestamp and view thread link */}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTimestamp(timestamp)}
          </span>
          {quoteId && onViewThread && (
            <button
              onClick={handleViewThread}
              className="text-[10px] text-warning hover:text-warning/80 underline transition-colors"
            >
              View Thread
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default OperatorMessage;
