/**
 * Map DB Message to UI Chat Message
 *
 * Converts persisted message rows (from loadMessages / API) into ChatSession
 * message shape. Restores proposal-sent confirmation UI when contentType is
 * 'proposal_shared' and richContent contains proposalSent data.
 *
 * Also handles 'email_approval_request' contentType for human-in-the-loop
 * email approval workflow.
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
 * Email approval request payload stored in richContent when contentType === 'email_approval_request'
 */
const RICH_CONTENT_EMAIL_APPROVAL_KEY = 'emailApproval';

/**
 * Email approval data structure stored in richContent
 */
interface EmailApprovalData {
  proposalId: string;
  proposalNumber?: string;
  to: { email: string; name: string };
  subject: string;
  body: string;
  attachments: Array<{ name: string; url: string; size?: number }>;
  flightDetails?: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers?: number;
  };
  pricing?: { subtotal: number; total: number; currency: string };
  generatedAt?: string;
  requestId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'sent';
}

/**
 * Maps a persisted message to UI chat message format.
 * When contentType is 'proposal_shared' and richContent.proposalSent exists,
 * sets showProposalSentConfirmation and proposalSentData for inline rendering.
 *
 * When contentType is 'email_approval_request' and richContent.emailApproval exists,
 * sets showEmailApprovalRequest and emailApprovalData for inline email review.
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

  // Debug logging for special message types
  if (
    msg.contentType === 'proposal_shared' ||
    msg.contentType === 'email_approval_request' ||
    msg.contentType === 'margin_selection' ||
    (msg.richContent && (RICH_CONTENT_PROPOSAL_KEY in msg.richContent || RICH_CONTENT_EMAIL_APPROVAL_KEY in msg.richContent || 'marginSelection' in msg.richContent))
  ) {
    console.log('[mapDbMessageToChatMessage] Special message detected:', {
      id: msg.id,
      contentType: msg.contentType,
      hasRichContent: !!msg.richContent,
      richContentKeys: msg.richContent ? Object.keys(msg.richContent) : [],
    });
  }

  // Handle proposal_shared contentType
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

  // Handle margin_selection: detect by richContent.marginSelection (contentType may be 'text' if DB enum not updated)
  if (
    msg.richContent &&
    typeof msg.richContent === 'object' &&
    'marginSelection' in msg.richContent
  ) {
    const marginData = msg.richContent.marginSelection;
    if (marginData && typeof marginData === 'object') {
      return {
        ...base,
        showMarginSelection: true,
        marginSelectionData: marginData as {
          customerName: string;
          customerEmail: string;
          companyName: string;
          marginPercentage: number;
          selectedAt: string;
        },
      };
    }
  }

  // Handle email_approval_request: detect by richContent.emailApproval (robust against contentType variations)
  if (
    msg.richContent &&
    typeof msg.richContent === 'object' &&
    RICH_CONTENT_EMAIL_APPROVAL_KEY in msg.richContent
  ) {
    const emailApproval = msg.richContent[RICH_CONTENT_EMAIL_APPROVAL_KEY];
    if (emailApproval && typeof emailApproval === 'object') {
      const emailData = emailApproval as EmailApprovalData;
      // Only show approval UI if not already sent
      if (emailData.status !== 'sent') {
        return {
          ...base,
          showEmailApprovalRequest: true,
          emailApprovalData: emailData,
        };
      }
    }
  }

  return base;
}
