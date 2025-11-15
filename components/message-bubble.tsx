/**
 * Message Bubble Component
 *
 * Wrapper component for chat messages with user/agent styling, timestamps, and threading support.
 * @stub - This is a stub file created for TDD. Implementation pending.
 */

'use client';

import type { MessageComponent } from './message-components/types';

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

export function MessageBubble(_props: MessageBubbleProps): JSX.Element {
  throw new Error('MessageBubble component not yet implemented (TDD stub)');
}
