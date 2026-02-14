/**
 * ErrorDisplay Component
 *
 * Displays error messages in the chat interface with dismiss option.
 *
 * @module components/chat-interface/components/ErrorDisplay
 */

'use client';

import React, { memo } from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorDisplayProps {
  /** Error message to display */
  error: string;
  /** Handler to dismiss the error */
  onDismiss?: () => void;
  /** Handler to retry the failed action */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays an error message with options to dismiss or retry.
 *
 * @param props - Component properties
 * @returns Error display JSX element
 *
 * @example
 * ```tsx
 * <ErrorDisplay
 *   error="Failed to send message. Please try again."
 *   onDismiss={() => setError(null)}
 *   onRetry={() => sendMessage()}
 * />
 * ```
 */
export const ErrorDisplay = memo(function ErrorDisplay({
  error,
  onDismiss,
  onRetry,
  className = '',
}: ErrorDisplayProps) {
  return (
    <div className={cn('flex justify-center', className)}>
      <div className="max-w-md w-full">
        <div className="bg-error-bg border border-error-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            {/* Error icon */}
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>

            {/* Error content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-destructive">
                Something went wrong
              </h3>
              <p className="mt-1 text-sm text-destructive/80">
                {error}
              </p>

              {/* Action buttons */}
              {(onRetry || onDismiss) && (
                <div className="mt-3 flex items-center gap-2">
                  {onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetry}
                      className="h-7 px-2 text-xs border-error-border text-destructive hover:bg-error-bg"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDismiss}
                      className="h-7 px-2 text-xs text-destructive hover:bg-error-bg"
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Dismiss X button */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-md text-destructive/70 hover:text-destructive hover:bg-error-bg transition-colors"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
