'use client';

/**
 * Avinode Chat Thread Component
 * Displays messages between ISO Agents and Aircraft Operators
 * Supports rich message content, real-time updates, and accessibility
 */

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle, Check, CheckCheck, Plane, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types/chat';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface AvinodeChatThreadProps {
  /** Avinode Trip ID */
  tripId: string;

  /** Array of messages to display */
  messages: Message[];

  /** Loading state */
  isLoading?: boolean;

  /** Error message */
  error?: string | null;

  /** Callback when retry button is clicked */
  onRetry?: () => void;

  /** Callback when new message arrives (for real-time updates) */
  onNewMessage?: (message: Message) => void;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format timestamp to user-friendly format
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Same day - show time
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Yesterday
  if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  }

  // Within last week - show day and time
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Older - show date and time
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get initials from sender name
 */
const getInitials = (name: string | null): string => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Check if messages should be grouped (same sender, within 5 minutes)
 */
const shouldGroupMessages = (current: Message, previous: Message | null): boolean => {
  if (!previous) return false;
  if (current.sender_type !== previous.sender_type) return false;
  if (current.sender_iso_agent_id !== previous.sender_iso_agent_id) return false;
  if (current.sender_operator_id !== previous.sender_operator_id) return false;

  const currentTime = new Date(current.created_at).getTime();
  const previousTime = new Date(previous.created_at).getTime();
  const diffMinutes = (currentTime - previousTime) / 60000;

  return diffMinutes < 5;
};

// ============================================================================
// Message Status Indicator Component
// ============================================================================

const MessageStatusIndicator: React.FC<{ status: Message['status'] }> = ({ status }) => {
  switch (status) {
    case 'sent':
      return (
        <Check
          data-testid="status-sent"
          className="w-3 h-3 text-gray-400"
          aria-label="Sent"
        />
      );
    case 'delivered':
      return (
        <CheckCheck
          data-testid="status-delivered"
          className="w-3 h-3 text-blue-500"
          aria-label="Delivered"
        />
      );
    case 'read':
      return (
        <CheckCheck
          data-testid="status-read"
          className="w-3 h-3 text-green-500"
          aria-label="Read"
        />
      );
    case 'failed':
      return (
        <AlertCircle
          data-testid="status-failed"
          className="w-3 h-3 text-red-500"
          aria-label="Failed"
        />
      );
    default:
      return null;
  }
};

// ============================================================================
// Rich Content Components
// ============================================================================

const QuoteSharedContent: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-blue-900 dark:text-blue-100">
            {data.aircraft_type}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            {data.operator_name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
            ${data.price.toLocaleString()}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            {data.currency}
          </div>
        </div>
      </div>

      {data.highlights && data.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.highlights.map((highlight: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {highlight}
            </Badge>
          ))}
        </div>
      )}

      {data.ranking && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="default" className="bg-green-500 text-white">
            #{data.ranking}
          </Badge>
          {data.score && (
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Score: {data.score}/100
            </span>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        Valid until: {new Date(data.valid_until).toLocaleDateString()}
      </div>
    </div>
  );
};

const RichMessageContent: React.FC<{ message: Message }> = ({ message }) => {
  if (!message.rich_content) return null;

  switch (message.rich_content.type) {
    case 'quote_shared':
    case 'quote_accepted':
      return <QuoteSharedContent data={message.rich_content.data} />;
    case 'quote_updated':
      return (
        <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="text-sm font-semibold text-orange-900 dark:text-orange-100">
            Quote Updated
          </div>
          <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">
            {message.rich_content.data.change_reason || 'Quote details have been updated'}
          </div>
        </div>
      );
    default:
      return null;
  }
};

// ============================================================================
// Message Bubble Component
// ============================================================================

interface MessageBubbleProps {
  message: Message;
  isGrouped: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isGrouped }) => {
  const isOperator = message.sender_type === 'operator';
  const isUser = message.sender_type === 'iso_agent';
  const isSystem = message.sender_type === 'system';

  return (
    <li
      data-testid={`message-${message.id}`}
      className={cn(
        'flex gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isGrouped && 'mt-1',
        !isGrouped && 'mt-4'
      )}
    >
      {/* Avatar */}
      {!isGrouped && !isSystem && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback
            className={cn(
              isOperator && 'bg-blue-500 text-white',
              isUser && 'bg-green-500 text-white'
            )}
          >
            {isOperator && <Plane className="w-4 h-4" />}
            {isUser && <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
      )}
      {isGrouped && !isSystem && <div className="w-8 h-8 shrink-0" />}

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[75%]',
          isUser && 'items-end',
          isOperator && 'items-start',
          isSystem && 'items-center w-full max-w-full'
        )}
      >
        {/* Sender Name */}
        {!isGrouped && !isSystem && message.sender_name && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {message.sender_name}
            </span>
            {isOperator && (
              <Badge variant="outline" className="text-xs">
                Operator
              </Badge>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            'px-4 py-2 rounded-lg',
            isOperator &&
              'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 operator',
            isUser &&
              'bg-blue-600 text-white iso_agent',
            isSystem && 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-800'
          )}
        >
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Rich Content */}
          <RichMessageContent message={message} />

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="text-xs p-2 bg-white/20 rounded flex items-center gap-2"
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>{attachment.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp & Status */}
        <div
          className={cn(
            'flex items-center gap-1 px-1',
            isUser && 'flex-row-reverse'
          )}
        >
          <span
            data-testid={`timestamp-${message.id}`}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {formatTimestamp(message.created_at)}
          </span>
          {isUser && <MessageStatusIndicator status={message.status} />}
        </div>
      </div>
    </li>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AvinodeChatThread: React.FC<AvinodeChatThreadProps> = ({
  tripId,
  messages,
  isLoading = false,
  error = null,
  onRetry,
  onNewMessage,
  className,
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on mount and when new messages arrive
  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Notify parent of new messages
  useEffect(() => {
    if (messages.length > 0 && onNewMessage) {
      const latestMessage = messages[messages.length - 1];
      onNewMessage(latestMessage);
    }
  }, [messages, onNewMessage]);

  return (
    <div
      data-testid="avinode-chat-thread"
      className={cn('flex flex-col h-full', className)}
      role="region"
      aria-label="Avinode Chat Thread"
    >
      <Card className="flex flex-col h-full">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Operator Conversation
            </CardTitle>
            <Badge variant="outline">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </Badge>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea
            ref={scrollAreaRef}
            data-testid="scroll-area"
            className="h-full"
          >
            <div className="p-4">
              {/* Loading State */}
              {isLoading && (
                <div
                  data-testid="loading-spinner"
                  className="flex items-center justify-center py-8"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Loading messages...
                  </span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                  {onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetry}
                      aria-label="Retry loading messages"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Plane className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    No messages yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Messages with operators will appear here
                  </p>
                </div>
              )}

              {/* Message List */}
              {!isLoading && !error && messages.length > 0 && (
                <ul role="list" className="space-y-0">
                  {messages.map((message, index) => {
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const isGrouped = shouldGroupMessages(message, previousMessage);
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isGrouped={isGrouped}
                      />
                    );
                  })}
                </ul>
              )}

              {/* Auto-scroll anchor */}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
