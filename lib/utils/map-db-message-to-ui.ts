/**
 * Map DB Message to UI Chat Message
 *
 * Converts persisted message rows (from loadMessages / API) into ChatSession
 * message shape. Restores proposal-sent confirmation UI when contentType is
 * 'proposal_shared' and richContent contains proposalSent data.
 *
 * @see lib/conversation/message-persistence.ts
 * @see app/api/messages/save/route.ts
 * @see components/chat-sidebar.tsx (ChatSession messages type)
 */

import type { ChatSession } from '@/components/chat-sidebar';
import type { ProposalSentConfirmationProps } from '@/components/proposal/proposal-sent-confirmation';

export type ChatMessageUI = ChatSession['messages'][number];

/**
 * DB-like message shape returned by loadMessages, /api/requests, or /api/chat-sessions/messages
 */
export interface DbMessageLike {
  id: string;
  content: string;
  createdAt?: string;
  timestamp?: string;
  senderType?: string;
  type?: 'user' | 'agent';
  contentType?: string;
  richContent?: Record<string, unknown> | null;
}

/**
 * Proposal-sent payload stored in richContent when contentType === 'proposal_shared'
 */
const RICH_CONTENT_PROPOSAL_KEY = 'proposalSent';

/**
 * Maps a persisted message to UI chat message format.
 * When contentType is 'proposal_shared' and richContent.proposalSent exists,
 * sets showProposalSentConfirmation and proposalSentData for inline rendering.
 *
 * @param msg - DB-like message (from API or loadMessages)
 * @returns ChatSession message for rendering
 */
export function mapDbMessageToChatMessage(msg: DbMessageLike): ChatMessageUI {
  const ts = msg.createdAt ?? msg.timestamp ?? '';
  const type: 'user' | 'agent' =
    msg.type ?? (msg.senderType === 'iso_agent' ? 'user' : 'agent');

  const base: ChatMessageUI = {
    id: msg.id,
    type,
    content: msg.content,
    timestamp: ts ? new Date(ts) : new Date(),
  };

  // Debug logging for proposal messages
  if (msg.contentType === 'proposal_shared' || (msg.richContent && RICH_CONTENT_PROPOSAL_KEY in msg.richContent)) {
    console.log('[mapDbMessageToChatMessage] Proposal message detected:', {
      id: msg.id,
      contentType: msg.contentType,
      hasRichContent: !!msg.richContent,
      richContentKeys: msg.richContent ? Object.keys(msg.richContent) : [],
      hasProposalSentKey: msg.richContent ? RICH_CONTENT_PROPOSAL_KEY in msg.richContent : false,
    });
  }

  if (
    msg.contentType === 'proposal_shared' &&
    msg.richContent &&
    typeof msg.richContent === 'object' &&
    RICH_CONTENT_PROPOSAL_KEY in msg.richContent
  ) {
    const proposalSent = msg.richContent[RICH_CONTENT_PROPOSAL_KEY];
    if (proposalSent && typeof proposalSent === 'object') {
      return {
        ...base,
        showProposalSentConfirmation: true,
        proposalSentData: proposalSent as ProposalSentConfirmationProps,
      };
    }
  }

  return base;
}
