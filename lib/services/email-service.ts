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
// BRANDED HTML EMAIL TEMPLATE
// =============================================================================

/**
 * Wraps plain-text email content in a dark-branded HTML template
 * matching the Jetvision PDF branding (#0a1628 header/footer, #00a8e8 accent).
 *
 * @param bodyContent - Inner HTML content (paragraphs, lists, etc.)
 * @param preheader - Optional preheader text for email clients
 * @returns Complete HTML email string
 */
export function wrapInBrandedTemplate(bodyContent: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jetvision</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f4f4f7;line-height:1px;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0a1628;padding:24px 32px;border-radius:8px 8px 0 0;text-align:center;">
              <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:1px;">JETVISION</span>
              <br />
              <span style="font-size:11px;color:#d4af37;letter-spacing:2px;">PRIVATE AVIATION</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;font-size:14px;line-height:1.6;color:#1a1a1a;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#0a1628;padding:20px 32px;border-radius:0 0 8px 8px;text-align:center;">
              <span style="font-size:12px;color:#94a3b8;">Jetvision LLC &middot; Private Charter Made Simple</span>
              <br />
              <span style="font-size:11px;color:#64748b;">www.jetvision.com &middot; support@jetvision.com</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

  const bodyContent = `
    <p>Dear ${customerName},</p>
    <p>Thank you for considering Jetvision for your private charter needs.</p>
    <p>Please find attached your customized proposal for your upcoming trip:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;border-left:3px solid #00a8e8;padding-left:16px;">
      <tr><td style="padding:4px 0;"><strong>Route:</strong> ${tripDetails.departureAirport} &rarr; ${tripDetails.arrivalAirport}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Date:</strong> ${formattedDate}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Total:</strong> ${formattedPrice}</td></tr>
      <tr><td style="padding:4px 0;font-size:12px;color:#64748b;">Proposal ID: ${proposalId}</td></tr>
    </table>
    <p>The attached PDF contains detailed information about your selected aircraft options, pricing breakdown, and terms of service.</p>
    <p>This quote is valid for <strong>48 hours</strong>. To book or if you have any questions, please reply to this email or contact our team directly.</p>
    <p style="margin-top:24px;">Best regards,<br /><strong>The Jetvision Team</strong></p>
  `;

  return wrapInBrandedTemplate(
    bodyContent,
    `Your charter proposal for ${tripDetails.departureAirport} → ${tripDetails.arrivalAirport}`,
  );
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

  const bodyContent = `
    <p>Dear ${customerName},</p>
    <p>Thank you for choosing Jetvision for your private charter flight.</p>
    <p>Please find attached your Flight Charter Service Agreement for your upcoming trip:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;border-left:3px solid #00a8e8;padding-left:16px;">
      <tr><td style="padding:4px 0;"><strong>Route:</strong> ${flightDetails.departureAirport} &rarr; ${flightDetails.arrivalAirport}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Date:</strong> ${formattedDate}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Aircraft:</strong> ${flightDetails.aircraftType}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Total:</strong> ${formattedPrice}</td></tr>
      <tr><td style="padding:4px 0;font-size:12px;color:#64748b;">Contract: ${contractNumber}</td></tr>
    </table>
    <p>The attached PDF contains your complete contract including flight summary, pricing, terms &amp; conditions, and signature page.</p>
    <p><strong>To proceed with booking:</strong></p>
    <ol style="margin:8px 0;padding-left:20px;">
      <li>Sign the agreement on the signature page</li>
      <li>Complete the payment information</li>
      <li>Return the signed contract via email</li>
    </ol>
    <p>If you have any questions or need any modifications, please reply to this email or contact our team directly.</p>
    <p style="margin-top:24px;">Best regards,<br /><strong>The Jetvision Team</strong></p>
  `;

  return wrapInBrandedTemplate(
    bodyContent,
    `Your flight contract for ${flightDetails.departureAirport} → ${flightDetails.arrivalAirport}`,
  );
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

// =============================================================================
// ONBOARDING CONTRACT EMAIL FUNCTIONS
// =============================================================================

export interface SendOnboardingContractEmailOptions {
  to: string;
  agentName: string;
  contractReviewUrl: string;
  pdfBase64: string;
  pdfFilename: string;
  commissionPercentage: number;
}

/**
 * Generate onboarding contract email body
 */
function generateOnboardingContractEmailBody(
  options: SendOnboardingContractEmailOptions
): string {
  return `Dear ${options.agentName},

Welcome to Jetvision! We're excited to have you on board.

Please review and sign your Independent Sales Agent Agreement. This contract outlines your commission structure (${options.commissionPercentage}% of net brokerage fees) and the terms of your engagement with Jetvision LLC.

**To review and sign your contract, please click the link below:**

${options.contractReviewUrl}

This link is valid for 72 hours and can only be used once.

The contract PDF is also attached to this email for your records.

If you have any questions about the agreement, please reply to this email or contact our team.

Best regards,
The Jetvision Team

---
Jetvision LLC - Private Charter Made Simple
15303 Ventura Blvd. Suite 250, Sherman Oaks, CA 91403
www.jetvision.com | support@jetvision.com`;
}

/**
 * Send an onboarding contract email with PDF attachment and review link
 */
export async function sendOnboardingContractEmail(
  options: SendOnboardingContractEmailOptions
): Promise<SendEmailResult> {
  const subject = 'Jetvision — Your Independent Sales Agent Agreement';
  const body = generateOnboardingContractEmailBody(options);

  const attachments: EmailAttachment[] = [
    {
      filename: options.pdfFilename,
      content: options.pdfBase64,
      contentType: 'application/pdf',
    },
  ];

  return sendEmail({
    to: options.to,
    subject,
    body,
    attachments,
  });
}

const emailService = {
  sendEmail,
  sendProposalEmail,
  sendContractEmail,
  sendOnboardingContractEmail,
};

export default emailService;
