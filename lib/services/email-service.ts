/**
 * Email Service
 *
 * Service for sending emails, including proposal emails with PDF attachments.
 * Currently uses a mock implementation. In production, this would integrate
 * with Gmail MCP or another email service.
 *
 * @see app/api/proposal/send/route.ts
 * @see docs/plans/2025-12-22-rfq-workflow-steps-3-4-design.md
 */

// =============================================================================
// TYPES
// =============================================================================

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded content
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendProposalEmailOptions {
  to: string;
  customerName: string;
  subject?: string;
  body?: string;
  proposalId: string;
  pdfBase64: string;
  pdfFilename: string;
  tripDetails: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
  };
  pricing: {
    total: number;
    currency: string;
  };
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Generate default proposal email subject
 */
function generateDefaultSubject(
  departureAirport: string,
  arrivalAirport: string
): string {
  return `Jetvision Charter Proposal: ${departureAirport} → ${arrivalAirport}`;
}

/**
 * Generate default proposal email body
 */
function generateDefaultEmailBody(options: SendProposalEmailOptions): string {
  const { customerName, tripDetails, pricing, proposalId } = options;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: pricing.currency,
    maximumFractionDigits: 0,
  }).format(pricing.total);

  const formattedDate = new Date(tripDetails.departureDate).toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  return `Dear ${customerName},

Thank you for considering Jetvision for your private charter needs.

Please find attached your customized proposal for your upcoming trip:

**Trip Details:**
• Route: ${tripDetails.departureAirport} → ${tripDetails.arrivalAirport}
• Date: ${formattedDate}
• Total: ${formattedPrice}

**Proposal ID:** ${proposalId}

The attached PDF contains detailed information about your selected aircraft options, pricing breakdown, and terms of service.

This quote is valid for 48 hours. To book or if you have any questions, please reply to this email or contact our team directly.

Best regards,
The Jetvision Team

---
This email was sent by Jetvision - Private Charter Made Simple
www.jetvision.com | support@jetvision.com`;
}

// =============================================================================
// EMAIL SENDING FUNCTIONS
// =============================================================================

/**
 * Send a proposal email with PDF attachment
 *
 * @param options - Email options including customer info and PDF
 * @returns Send result with success status and message ID
 */
export async function sendProposalEmail(
  options: SendProposalEmailOptions
): Promise<SendEmailResult> {
  const {
    to,
    customerName,
    subject,
    body,
    pdfBase64,
    pdfFilename,
    tripDetails,
    pricing,
    proposalId,
  } = options;

  // Generate default subject and body if not provided
  const emailSubject =
    subject ||
    generateDefaultSubject(
      tripDetails.departureAirport,
      tripDetails.arrivalAirport
    );

  const emailBody = body || generateDefaultEmailBody(options);

  // Prepare attachment
  const attachments: EmailAttachment[] = [
    {
      filename: pdfFilename,
      content: pdfBase64,
      contentType: 'application/pdf',
    },
  ];

  // Send email using base send function
  return sendEmail({
    to,
    subject: emailSubject,
    body: emailBody,
    attachments,
  });
}

/**
 * Send an email
 *
 * In production, this would integrate with Gmail MCP or another email service.
 * Currently uses a mock implementation that simulates email sending.
 *
 * @param options - Email options
 * @returns Send result with success status and message ID
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, body, attachments } = options;

  // Validate email address format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return {
      success: false,
      error: 'Invalid email address format',
    };
  }

  // TODO: Integrate with Gmail MCP or other email service
  // For now, simulate successful email sending

  // Log email details for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email would be sent:');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body length: ${body.length} chars`);
    console.log(`   Attachments: ${attachments?.length || 0}`);
    if (attachments?.length) {
      attachments.forEach((a, i) => {
        console.log(`   - ${a.filename} (${Math.round(a.content.length / 1024)}KB)`);
      });
    }
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate a mock message ID
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  return {
    success: true,
    messageId,
  };
}

export default {
  sendEmail,
  sendProposalEmail,
};
