/**
 * UserMessage Component
 *
 * Renders a user message bubble in the chat interface.
 * Displays as a primary-colored bubble aligned to the right.
 *
 * Extracted from: components/chat-interface.tsx (lines 2052-2058)
 */

'use client';

import React, { memo } from 'react';
import { formatMessageTimestamp } from '@/lib/utils/format';

export interface UserMessageProps {
  /** Message content to display */
  content: string;
  /** Optional timestamp */
  timestamp?: Date;
  /** Optional className for customization */
  className?: string;
}

/**
 * User message bubble component.
 *
 * @example
 * ```tsx
 * <UserMessage content="I need a flight from KTEB to KLAX" />
 * ```
 */
export const UserMessage = memo(function UserMessage({
  content,
  timestamp,
  className = '',
}: UserMessageProps) {
  return (
    <div className={`flex justify-end ${className}`}>
      <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <div className="mt-1 text-right">
            <span className="text-[10px] text-primary-foreground/60">
              {formatMessageTimestamp(timestamp)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default UserMessage;
