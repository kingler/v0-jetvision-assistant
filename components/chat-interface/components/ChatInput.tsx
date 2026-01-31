/**
 * ChatInput Component
 *
 * Chat input area with quick actions and send button.
 *
 * Extracted from: components/chat-interface.tsx (lines 2350-2418)
 */

'use client';

import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { QuickActions, type QuickAction } from './QuickActions';

export interface ChatInputProps {
  /** Current input value */
  value: string;
  /** Handler for value changes */
  onChange: (value: string) => void;
  /** Handler for sending message */
  onSend: () => void;
  /** Handler for viewing workflow */
  onViewWorkflow?: () => void;
  /** Whether processing is in progress */
  isProcessing?: boolean;
  /** Whether to show view workflow button */
  showViewWorkflow?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Custom quick actions */
  quickActions?: QuickAction[];
  /** Optional className for customization */
  className?: string;
}

/**
 * Chat input component with quick actions and send button.
 *
 * @example
 * ```tsx
 * <ChatInput
 *   value={inputValue}
 *   onChange={setInputValue}
 *   onSend={handleSendMessage}
 *   onViewWorkflow={handleViewWorkflow}
 *   isProcessing={isProcessing}
 *   showViewWorkflow={currentStep >= 1}
 *   placeholder="Message about this request..."
 * />
 * ```
 */
export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSend,
  onViewWorkflow,
  isProcessing = false,
  showViewWorkflow = false,
  placeholder = 'Message about this request...',
  disabled = false,
  quickActions,
  className = '',
}: ChatInputProps) {
  const isDisabled = disabled || isProcessing;
  const canSend = value.trim().length > 0 && !isDisabled;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && canSend) {
        e.preventDefault();
        onSend();
      }
    },
    [canSend, onSend]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Quick Actions */}
        <QuickActions
          onSelect={onChange}
          onViewWorkflow={onViewWorkflow}
          disabled={isDisabled}
          showViewWorkflow={showViewWorkflow}
          actions={quickActions}
        />

        {/* Input Area */}
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Input
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled}
              className="min-h-[44px] py-3 px-4 pr-12 rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <Button
              onClick={onSend}
              disabled={!canSend}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatInput;
