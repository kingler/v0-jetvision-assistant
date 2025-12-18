/**
 * Message List Component
 *
 * Virtualized message list with auto-scroll, date separators, and infinite scroll support.
 */

'use client';

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { format, isSameDay } from 'date-fns';
import { MessageBubble } from './message-bubble';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import type { Message } from './message-bubble';
import type { ReactNode } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';

export interface MessageListProps {
  messages: Message[];
  enableVirtualization?: boolean;
  autoScroll?: boolean;
  showDateSeparators?: boolean;
  groupMessages?: boolean;
  isLoadingOlder?: boolean;
  isLoadingNewer?: boolean;
  emptyState?: ReactNode;
  onLoadOlder?: () => void;
  onLoadNewer?: () => void;
  onAction?: (action: string, data: unknown) => void;
  onReplyClick?: (messageId: string) => void;
}

interface MessageGroup {
  date: Date;
  messages: Message[];
  grouped: boolean; // Whether consecutive messages from same author are grouped
}

/**
 * Message List Component
 *
 * Displays a list of messages with optional virtualization, auto-scroll,
 * date separators, and infinite scroll support.
 *
 * Features:
 * - Auto-virtualization for large message lists (>50 messages)
 * - Auto-scroll to bottom with smart detection
 * - Date separators between days
 * - Message grouping (consecutive messages from same author)
 * - Infinite scroll (load older/newer messages)
 * - Empty state support
 *
 * @example
 * ```tsx
 * <MessageList
 *   messages={messages}
 *   autoScroll
 *   showDateSeparators
 *   onLoadOlder={loadMore}
 *   onReplyClick={handleReply}
 * />
 * ```
 */
export const MessageList = memo<MessageListProps>(function MessageList({
  messages,
  enableVirtualization,
  autoScroll = true,
  showDateSeparators = true,
  groupMessages = true,
  isLoadingOlder = false,
  isLoadingNewer = false,
  emptyState,
  onLoadOlder,
  onLoadNewer,
  onAction,
  onReplyClick,
}) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-enable virtualization for large lists
  const shouldVirtualize = enableVirtualization ?? messages.length > 50;

  // Group messages by date and consecutive author
  const messageGroups = React.useMemo<MessageGroup[]>(() => {
    if (messages.length === 0) return [];

    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;
    let lastMessage: Message | null = null;

    messages.forEach((message) => {
      // Check if we need a new date group
      const needsNewDateGroup = !currentGroup || !isSameDay(message.timestamp, currentGroup.date);

      if (needsNewDateGroup) {
        // Start new date group
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          date: message.timestamp,
          messages: [message],
          grouped: false,
        };
      } else {
        // Add to current group
        currentGroup!.messages.push(message);

        // Check if should be grouped with previous message
        if (
          groupMessages &&
          lastMessage &&
          lastMessage.role === message.role &&
          lastMessage.role !== 'system'
        ) {
          currentGroup!.grouped = true;
        }
      }

      lastMessage = message;
    });

    if (currentGroup) groups.push(currentGroup);

    return groups;
  }, [messages, groupMessages]);

  // Handle scroll detection
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = target;

      // Check if at bottom (with 50px threshold)
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
      setShowScrollButton(!atBottom);

      // Load older messages when scrolled to top
      if (scrollTop === 0 && onLoadOlder && !isLoadingOlder) {
        onLoadOlder();
      }
    },
    [onLoadOlder, isLoadingOlder]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!autoScroll) return;

    const hasNewMessages = messages.length > prevMessagesLengthRef.current;

    if (hasNewMessages && isAtBottom) {
      if (shouldVirtualize) {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          behavior: 'smooth',
        });
      } else if (listRef.current) {
        const lastMessage = listRef.current.querySelector('[data-testid="message-list"] > :last-child');
        lastMessage?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isAtBottom, autoScroll, shouldVirtualize]);

  // Scroll to bottom on mount
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      if (shouldVirtualize) {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          behavior: 'auto',
        });
      } else if (listRef.current) {
        const lastMessage = listRef.current.querySelector('[data-testid="message-list"] > :last-child');
        lastMessage?.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, []);

  // Scroll to bottom button handler
  const scrollToBottom = useCallback(() => {
    if (shouldVirtualize) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
      });
    } else if (listRef.current) {
      const lastMessage = listRef.current.querySelector('[data-testid="message-list"] > :last-child');
      lastMessage?.scrollIntoView({ behavior: 'smooth' });
    }
    setShowScrollButton(false);
  }, [messages.length, shouldVirtualize]);

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        {emptyState || (
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm">Start a conversation to see messages here</p>
          </div>
        )}
      </div>
    );
  }

  // Render single message bubble
  const renderMessageBubble = (message: Message, index: number, isGrouped: boolean) => {
    const showTimestamp = !isGrouped || index === 0;

    return (
      <div key={message.id} data-message-group={isGrouped} className="mb-4">
        <MessageBubble
          {...message}
          showTimestamp={showTimestamp}
          onAction={onAction}
          onReplyClick={onReplyClick}
        />
      </div>
    );
  };

  // Render date separator
  const renderDateSeparator = (date: Date) => {
    if (!showDateSeparators) return null;

    return (
      <div className="flex items-center justify-center my-6">
        <div className="flex-1 border-t border-border" />
        <span className="px-4 text-xs text-muted-foreground font-medium">
          {format(date, 'MMMM d, yyyy')}
        </span>
        <div className="flex-1 border-t border-border" />
      </div>
    );
  };

  // Virtualized list
  if (shouldVirtualize) {
    // Flatten groups for virtualization
    const flatItems: Array<{ type: 'date' | 'message'; data: any; index: number }> = [];

    messageGroups.forEach((group) => {
      flatItems.push({ type: 'date', data: group.date, index: flatItems.length });
      group.messages.forEach((message, idx) => {
        flatItems.push({
          type: 'message',
          data: { message, index: idx, isGrouped: group.grouped },
          index: flatItems.length,
        });
      });
    });

    return (
      <div className="relative h-full" ref={listRef}>
        <div
          className="h-full"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
          data-virtualized="true"
        >
          <Virtuoso
            ref={virtuosoRef}
            data={flatItems}
            itemContent={(index, item) => {
              if (item.type === 'date') {
                return renderDateSeparator(item.data);
              } else {
                const { message, index: msgIndex, isGrouped } = item.data;
                return renderMessageBubble(message, msgIndex, isGrouped);
              }
            }}
            followOutput="smooth"
            components={{
              Header: () =>
                isLoadingOlder ? (
                  <div
                    className="flex items-center justify-center py-4"
                    data-testid="loading-older-messages"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : null,
              Footer: () =>
                isLoadingNewer ? (
                  <div
                    className="flex items-center justify-center py-4"
                    data-testid="loading-newer-messages"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : null,
            }}
          />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            Scroll to bottom
          </Button>
        )}
      </div>
    );
  }

  // Non-virtualized list (for small message counts)
  return (
    <div className="relative h-full" ref={listRef}>
      <div
        className="h-full overflow-y-auto px-4 py-6"
        onScroll={handleScroll}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        data-testid="message-list"
      >
        {/* Loading older indicator */}
        {isLoadingOlder && (
          <div className="flex items-center justify-center py-4" data-testid="loading-older-messages">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Message groups */}
        {messageGroups.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`}>
            {renderDateSeparator(group.date)}

            {group.messages.map((message, index) =>
              renderMessageBubble(message, index, group.grouped)
            )}
          </div>
        ))}

        {/* Loading newer indicator */}
        {isLoadingNewer && (
          <div className="flex items-center justify-center py-4" data-testid="loading-newer-messages">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4 mr-2" />
          Scroll to bottom
        </Button>
      )}
    </div>
  );
});
