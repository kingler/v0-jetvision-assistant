/**
 * Email Service
 *
 * Service for sending emails, including proposal emails with PDF attachments.
 * Uses the Gmail MCP server in production and a mock implementation for
 * development/testing (controlled by USE_MOCK_EMAIL env var).
 *
 * @see app/api/proposal/send/route.ts
 * @see mcp-servers/gmail-mcp-server/src/index.ts
 */

import gmailMCPClient from '@/lib/mcp/clients/gmail-mcp-client';

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
  cc?: string | string[];
  bcc?: string | string[];
  /**
   * Optional delay in milliseconds for mock email sending.
   * If not provided, uses MOCK_EMAIL_DELAY_MS environment variable or defaults to 500ms.
   * Useful for testing fast or timeout scenarios.
   */
  mockDelayMs?: number;
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
  /** Base64 encoded PDF (optional - if not provided, no attachment) */
  pdfBase64?: string;
  /** PDF filename (required if pdfBase64 is provided) */
  pdfFilename?: string;
  tripDetails?: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
  };
  pricing?: {
    total: number;
    currency: string;
  };
  /**
   * Custom HTML body to use instead of generating default body.
   * Used by the email approval workflow when user has edited the email.
   */
  customHtmlBody?: string;
}

export interface SendContractEmailOptions {
  to: string;
  customerName: string;
  subject?: string;
  body?: string;
  contractNumber: string;
  pdfBase64: string;
  pdfFilename: string;
  flightDetails: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    aircraftType: string;
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
 * Only called when tripDetails and pricing are defined
 */
function generateDefaultEmailBody(options: Required<Pick<SendProposalEmailOptions, 'customerName' | 'tripDetails' | 'pricing' | 'proposalId'>>): string {
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
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Get the mock email delay in milliseconds from environment variable or default.
 * Parses MOCK_EMAIL_DELAY_MS as an integer, falling back to 500ms on invalid/missing values.
 *
 * @param overrideDelay - Optional delay override (takes precedence over env var)
 * @returns Delay in milliseconds (default: 500)
 */
function getMockEmailDelay(overrideDelay?: number): number {
  // If override is provided, use it (but still validate it's a valid number)
  if (overrideDelay !== undefined) {
    const parsed = Number.parseInt(String(overrideDelay), 10);
    return Number.isNaN(parsed) || parsed < 0 ? 500 : parsed;
  }

  // Check environment variable
  const envDelay = process.env.MOCK_EMAIL_DELAY_MS;
  if (envDelay !== undefined) {
    const parsed = Number.parseInt(envDelay, 10);
    // Fallback to 500 if parsing fails or value is negative
    return Number.isNaN(parsed) || parsed < 0 ? 500 : parsed;
  }

  // Default fallback
  return 500;
}

// =============================================================================
// EMAIL SENDING FUNCTIONS
// =============================================================================

/**
 * Send a proposal email with optional PDF attachment
 *
 * @param options - Email options including customer info and optional PDF
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
    customHtmlBody,
  } = options;

  // Generate default subject if not provided
  const emailSubject =
    subject ||
    (tripDetails
      ? generateDefaultSubject(
          tripDetails.departureAirport,
          tripDetails.arrivalAirport
        )
      : `Jetvision Charter Proposal: ${proposalId}`);

  // Use custom HTML body if provided, otherwise generate default or use provided body
  let emailBody: string;
  if (customHtmlBody) {
    // Use the custom HTML body from the approval workflow
    emailBody = customHtmlBody;
  } else if (body) {
    // Use the provided body
    emailBody = body;
  } else if (tripDetails && pricing) {
    // Generate default body - we've verified tripDetails and pricing exist
    emailBody = generateDefaultEmailBody({
      customerName,
      tripDetails,
      pricing,
      proposalId,
    });
  } else {
    // Fallback to a simple body
    emailBody = `Dear ${customerName},\n\nPlease find attached your charter flight proposal.\n\nProposal ID: ${proposalId}\n\nBest regards,\nThe Jetvision Team`;
  }

  // Prepare attachment only if PDF is provided
  const attachments: EmailAttachment[] = [];
  if (pdfBase64 && pdfFilename) {
    attachments.push({
      filename: pdfFilename,
      content: pdfBase64,
      contentType: 'application/pdf',
    });
  }

  // Send email using base send function
  return sendEmail({
    to,
    subject: emailSubject,
    body: emailBody,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}

/**
 * Normalize email address(es) to an array
 * Handles both string and string[] inputs, filtering out invalid addresses
 *
 * @param emails - Email address(es) as string or string array
 * @param fieldName - Field name for error messages
 * @returns Normalized array of valid email addresses
 */
function normalizeEmailArray(
  emails: string | string[] | undefined,
  fieldName: string
): string[] {
  if (!emails) {
    return [];
  }

  // Convert single string to array
  const emailArray = Array.isArray(emails) ? emails : [emails];

  // Validate and filter email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmails: string[] = [];

  for (const email of emailArray) {
    if (typeof email === 'string' && email.trim()) {
      const trimmedEmail = email.trim();
      if (emailRegex.test(trimmedEmail)) {
        validEmails.push(trimmedEmail);
      } else {
        console.warn(
          `[EmailService] Invalid ${fieldName} email address skipped: ${trimmedEmail}`
        );
      }
    }
  }

  return validEmails;
}

/**
 * Send an email.
 *
 * Operating modes (checked in order):
 * 1. **Mock** – `USE_MOCK_EMAIL=true` → logs to console, returns fake ID.
 * 2. **MCP**  – Default → routes through the Gmail MCP server.
 * 3. On MCP failure, returns an error result (no silent fallback in production).
 *
 * @param options - Email options including to, subject, body, attachments, replyTo, cc, bcc
 * @returns Send result with success status and message ID
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, body, attachments, replyTo, cc, bcc, mockDelayMs } = options;

  // Validate primary recipient email address format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return {
      success: false,
      error: 'Invalid email address format for "to" field',
    };
  }

  // Validate replyTo if provided
  if (replyTo && !emailRegex.test(replyTo)) {
    return {
      success: false,
      error: 'Invalid email address format for "replyTo" field',
    };
  }

  // Normalize cc and bcc to arrays, validating each address
  const normalizedCc = normalizeEmailArray(cc, 'cc');
  const normalizedBcc = normalizeEmailArray(bcc, 'bcc');

  // Log email details for debugging
  console.log('[EmailService] Sending email:');
  console.log(`   To: ${to}`);
  if (replyTo) {
    console.log(`   Reply-To: ${replyTo}`);
  }
  if (normalizedCc.length > 0) {
    console.log(`   Cc: ${normalizedCc.join(', ')}`);
  }
  if (normalizedBcc.length > 0) {
    console.log(`   Bcc: ${normalizedBcc.length} recipient(s)`);
  }
  console.log(`   Subject: ${subject}`);
  console.log(`   Body length: ${body.length} chars`);
  console.log(`   Attachments: ${attachments?.length || 0}`);

  // ── Mode 1: Mock ──────────────────────────────────────────────────────
  if (process.env.USE_MOCK_EMAIL === 'true') {
    return sendEmailMock({ to, attachments, mockDelayMs });
  }

  // ── Mode 2: Gmail MCP ─────────────────────────────────────────────────
  return sendEmailViaMCP({ to, subject, body, attachments, normalizedCc, normalizedBcc });
}

/**
 * Mock email sender for development and testing.
 * Logs to console and returns a fake message ID.
 */
async function sendEmailMock(opts: {
  to: string;
  attachments?: EmailAttachment[];
  mockDelayMs?: number;
}): Promise<SendEmailResult> {
  console.log('[EmailService] Mock mode — email not actually sent');
  console.log(`   Mock recipient: ${opts.to}`);
  if (opts.attachments?.length) {
    for (const a of opts.attachments) {
      console.log(`   Attachment: ${a.filename} (${Math.round(a.content.length / 1024)}KB)`);
    }
  }

  const delayMs = getMockEmailDelay(opts.mockDelayMs);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  return { success: true, messageId };
}

/**
 * Send email via the Gmail MCP server.
 * Maps email-service fields to the MCP `send_email` tool schema.
 */
async function sendEmailViaMCP(opts: {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  normalizedCc: string[];
  normalizedBcc: string[];
}): Promise<SendEmailResult> {
  const { to, subject, body, attachments, normalizedCc, normalizedBcc } = opts;

  // Determine body_html: if the body looks like HTML, use as-is; otherwise wrap in <pre>
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(body);
  const bodyHtml = isHtml ? body : `<pre>${body}</pre>`;
  const bodyText = isHtml ? undefined : body;

  try {
    const result = await gmailMCPClient.sendEmail({
      to,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      cc: normalizedCc.length > 0 ? normalizedCc : undefined,
      bcc: normalizedBcc.length > 0 ? normalizedBcc : undefined,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || 'application/octet-stream',
      })),
    });

    console.log('[EmailService] Email sent via Gmail MCP:', result.messageId);
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[EmailService] Gmail MCP error:', message);
    return {
      success: false,
      error: `Failed to send email via Gmail MCP: ${message}`,
    };
  }
}

// =============================================================================
// CONTRACT EMAIL FUNCTIONS
// =============================================================================

/**
 * Generate default contract email subject
 */
function generateContractDefaultSubject(
  departureAirport: string,
  arrivalAirport: string
): string {
  return `Jetvision Flight Contract: ${departureAirport} → ${arrivalAirport}`;
}

/**
 * Generate default contract email body
 */
function generateContractDefaultEmailBody(options: SendContractEmailOptions): string {
  const { customerName, flightDetails, pricing, contractNumber } = options;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: pricing.currency,
    maximumFractionDigits: 0,
  }).format(pricing.total);

  const formattedDate = new Date(flightDetails.departureDate).toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  return `Dear ${customerName},

Thank you for choosing Jetvision for your private charter flight.

Please find attached your Flight Charter Service Agreement for your upcoming trip:

**Flight Details:**
• Route: ${flightDetails.departureAirport} → ${flightDetails.arrivalAirport}
• Date: ${formattedDate}
• Aircraft: ${flightDetails.aircraftType}
• Total: ${formattedPrice}

**Contract Number:** ${contractNumber}

The attached PDF contains your complete contract including:
• Flight summary and pricing breakdown
• Terms and conditions
• Signature page
• Credit card authorization form (if paying by card)

Please review the contract carefully. To proceed with booking:
1. Sign the agreement on the signature page
2. Complete the payment information
3. Return the signed contract via email

If you have any questions or need any modifications, please reply to this email or contact our team directly.

Best regards,
The Jetvision Team

---
This email was sent by Jetvision - Private Charter Made Simple
www.jetvision.com | support@jetvision.com`;
}

/**
 * Send a contract email with PDF attachment
 *
 * @param options - Email options including customer info and PDF
 * @returns Send result with success status and message ID
 */
export async function sendContractEmail(
  options: SendContractEmailOptions
): Promise<SendEmailResult> {
  const {
    to,
    customerName,
    subject,
    body,
    pdfBase64,
    pdfFilename,
    flightDetails,
    pricing,
    contractNumber,
  } = options;

  // Generate default subject and body if not provided
  const emailSubject =
    subject ||
    generateContractDefaultSubject(
      flightDetails.departureAirport,
      flightDetails.arrivalAirport
    );

  const emailBody = body || generateContractDefaultEmailBody(options);

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

const emailService = {
  sendEmail,
  sendProposalEmail,
  sendContractEmail,
};

export default emailService;
