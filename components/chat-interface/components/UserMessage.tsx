/**
 * UserMessage Component
 *
 * Renders a user message bubble in the chat interface.
 * Displays as a blue bubble aligned to the right.
 *
 * Extracted from: components/chat-interface.tsx (lines 2052-2058)
 */

'use client';

import React, { memo } from 'react';

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
      <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <div className="mt-1 text-right">
            <span className="text-[10px] text-blue-200">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default UserMessage;
