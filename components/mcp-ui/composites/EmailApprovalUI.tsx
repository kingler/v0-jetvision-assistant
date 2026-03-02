'use client';

import { EmailPreviewCard } from '@/components/email/email-preview-card';
import type { UIActionResult } from '@mcp-ui/server';
import {
  uiActionResultToolCall,
  uiActionResultNotification,
} from '@mcp-ui/server';

export interface EmailApprovalUIProps {
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
    tripType?: 'one_way' | 'round_trip' | 'multi_city';
    returnDate?: string;
    segments?: Array<{
      departureAirport: string;
      arrivalAirport: string;
      date: string;
    }>;
  };
  pricing?: { subtotal: number; total: number; currency: string };
  generatedAt?: string;
  requestId?: string;
  /** Override status (e.g. 'sent' for read-only display after email was sent) */
  status?: 'draft' | 'sending' | 'sent' | 'error';
  onAction: (action: UIActionResult) => void;
}

export function EmailApprovalUI({
  proposalId,
  proposalNumber,
  to,
  subject,
  body,
  attachments,
  flightDetails,
  pricing,
  generatedAt,
  requestId,
  status,
  onAction,
}: EmailApprovalUIProps) {
  const effectiveStatus = status || 'draft';

  return (
    <EmailPreviewCard
      proposalId={proposalId}
      proposalNumber={proposalNumber}
      to={to}
      subject={subject}
      body={body}
      attachments={attachments}
      flightDetails={flightDetails}
      pricing={pricing}
      status={effectiveStatus}
      generatedAt={generatedAt}
      requestId={requestId}
      onSend={effectiveStatus === 'sent' ? undefined : async () => {
        onAction(
          uiActionResultToolCall('send_proposal_email', {
            proposal_id: proposalId,
            to_email: to.email,
            to_name: to.name,
          })
        );
        onAction(uiActionResultNotification('Sending email...'));
      }}
      onCancel={effectiveStatus === 'sent' ? undefined : () => {
        onAction(uiActionResultNotification('Email cancelled'));
      }}
    />
  );
}
