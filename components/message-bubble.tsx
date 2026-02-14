/**
 * Message Bubble Component
 *
 * Wrapper component for chat messages with user/agent styling, timestamps, and threading support.
 */

'use client';

import React, { memo } from 'react';
import { MessageRenderer } from './message-components/message-renderer';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import type { MessageComponent } from './message-components/types';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Reply,
  RotateCcw,
  Bot,
} from 'lucide-react';

export interface ReplyInfo {
  id: string;
  preview: string;
  author: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  timestamp: Date;
  components: MessageComponent[];
  author?: string;
  avatar?: string;
  replyTo?: ReplyInfo;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  isLoading?: boolean;
  error?: string;
  className?: string;
}

export interface MessageBubbleProps extends Message {
  showTimestamp?: boolean;
  onAction?: (action: string, data: unknown) => void;
  onReplyClick?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

/**
 * Message Bubble Component
 *
 * Displays a chat message with appropriate styling based on role (user/agent/system),
 * timestamps, status indicators, threading support, and loading/error states.
 *
 * @example
 * ```tsx
 * <MessageBubble
 *   id="msg-1"
 *   role="agent"
 *   timestamp={new Date()}
 *   components={[{ type: 'text', content: 'Hello!' }]}
 *   showTimestamp
 *   onReplyClick={(id) => console.log('Reply to:', id)}
 * />
 * ```
 */
export const MessageBubble = memo<MessageBubbleProps>(function MessageBubble({
  id,
  role,
  timestamp,
  components,
  author,
  avatar,
  replyTo,
  status,
  isLoading,
  error,
  className,
  showTimestamp = false,
  onAction,
  onReplyClick,
  onRetry,
}) {
  // Determine if message is from user
  const isUser = role === 'user';
  const isSystem = role === 'system';

  // Get author name
  const authorName = author || (isUser ? 'You' : 'Agent');

  // Format timestamp
  const formattedTime = timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Render status indicator
  const renderStatus = () => {
    if (!isUser) return null;

    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-muted-foreground" data-testid="status-sending" />;
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" data-testid="status-sent" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-primary" data-testid="status-delivered" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-destructive" data-testid="status-failed" />;
      default:
        return null;
    }
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <article
        data-role={role}
        className={cn(
          'flex gap-3 max-w-[85%] animate-pulse',
          isUser && 'ml-auto flex-row-reverse',
          className
        )}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" data-testid="default-avatar" />
        )}
        <div className={cn('flex flex-col gap-2 flex-1', isUser && 'items-end')}>
          <div
            className={cn(
              'rounded-lg p-4 w-full',
              isUser ? 'bg-primary/10' : 'bg-muted'
            )}
            data-testid="loading-skeleton"
          >
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
          </div>
        </div>
      </article>
    );
  }

  // Render error state
  if (error) {
    return (
      <article
        data-role={role}
        className={cn(
          'flex gap-3 max-w-[85%]',
          isUser && 'ml-auto flex-row-reverse',
          className
        )}
        aria-label={`Message from ${authorName}`}
      >
        {!isUser && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            {avatar ? (
              <AvatarImage src={avatar} alt={authorName} />
            ) : (
              <AvatarFallback data-testid="default-avatar">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            )}
          </Avatar>
        )}
        <div className={cn('flex flex-col gap-2 flex-1', isUser && 'items-end')}>
          <div
            className="rounded-lg p-4 border-2 border-destructive bg-destructive/10"
          >
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Failed to send message</span>
            </div>
            <p className="text-sm text-destructive/80">{error}</p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onRetry(id)}
              >
                <RotateCcw className="w-3 h-3 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      data-role={role}
      className={cn(
        'flex gap-3 max-w-[85%] group',
        isUser && 'ml-auto flex-row-reverse',
        isSystem && 'mx-auto',
        className
      )}
      aria-label={`Message from ${authorName}`}
      aria-live={role === 'agent' ? 'polite' : undefined}
    >
      {/* Avatar (agent/system only) */}
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          {avatar ? (
            <AvatarImage src={avatar} alt={authorName} />
          ) : (
            <AvatarFallback data-testid="default-avatar">
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          )}
        </Avatar>
      )}

      <div className={cn('flex flex-col gap-1 flex-1', isUser && 'items-end')}>
        {/* Reply indicator */}
        {replyTo && (
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground bg-muted/50 mb-1',
              isUser && 'flex-row-reverse'
            )}
          >
            <Reply className="w-3 h-3" />
            <div className={cn('flex flex-col', isUser && 'items-end')}>
              <span className="font-medium">{replyTo.author}</span>
              <span className="truncate max-w-[200px]">{replyTo.preview}</span>
            </div>
          </div>
        )}

        {/* Message content */}
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isUser && 'bg-primary text-primary-foreground',
            !isUser && !isSystem && 'bg-muted',
            isSystem && 'bg-muted/50 text-center text-base text-muted-foreground'
          )}
        >
          {/* Render all message components */}
          {components.map((component, index) => (
            <MessageRenderer
              key={`${id}-component-${index}`}
              component={component}
              onAction={onAction}
            />
          ))}
        </div>

        {/* Footer: timestamp + status + reply button */}
        <div
          className={cn(
            'flex items-center gap-2 px-2 text-xs text-muted-foreground',
            isUser && 'flex-row-reverse'
          )}
        >
          {showTimestamp && (
            <time dateTime={timestamp.toISOString()} data-testid="timestamp">
              {formattedTime}
            </time>
          )}

          {renderStatus()}

          {/* Reply button (visible on hover for non-system messages) */}
          {!isSystem && onReplyClick && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onReplyClick(id)}
              aria-label="Reply"
            >
              <Reply className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
});
