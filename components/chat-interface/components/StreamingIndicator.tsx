/**
 * StreamingIndicator Component
 *
 * Displays streaming content with typing animation while AI is generating response.
 *
 * @module components/chat-interface/components/StreamingIndicator
 */

'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

export interface StreamingIndicatorProps {
  /** Current streaming content */
  content: string;
  /** Current processing status */
  status?: 'active' | 'pending' | 'completed' | 'error';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays streaming AI response with visual indicator.
 *
 * @param props - Component properties
 * @returns Streaming indicator JSX element
 *
 * @example
 * ```tsx
 * <StreamingIndicator
 *   content="Analyzing your flight request..."
 *   status="active"
 * />
 * ```
 */
export const StreamingIndicator = memo(function StreamingIndicator({
  content,
  status = 'active',
  className = '',
}: StreamingIndicatorProps) {
  const isActive = status === 'active' || status === 'pending';

  return (
    <div className={cn('flex justify-start', className)}>
      <div className="max-w-[85%] flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
          <span className="text-white text-xs font-medium">AI</span>
        </div>

        {/* Message bubble */}
        <div className="flex-1">
          <div className="bg-surface-tertiary rounded-2xl px-4 py-3 shadow-sm">
            {content ? (
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {content}
                {isActive && (
                  <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
                )}
              </p>
            ) : (
              <TypingIndicator />
            )}
          </div>

          {/* Status label */}
          {isActive && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {status === 'pending' ? 'Processing...' : 'Responding...'}
              </span>
              <span className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Animated typing dots indicator
 */
function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 py-1">
      <div className="flex space-x-1">
        <span
          className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}
