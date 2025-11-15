/**
 * Message List Component
 *
 * Virtualized message list with auto-scroll, date separators, and infinite scroll support.
 * @stub - This is a stub file created for TDD. Implementation pending.
 */

'use client';

import type { Message } from './message-bubble';
import type { ReactNode } from 'react';

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

export function MessageList(_props: MessageListProps): JSX.Element {
  throw new Error('MessageList component not yet implemented (TDD stub)');
}
