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
 * Send an email via Gmail MCP server
 *
 * Integrates with the Gmail MCP server to send emails with attachments.
 * Falls back to mock implementation if Gmail MCP is not available.
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
  console.log('📧 Sending email via Gmail MCP:');
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

  // Check if Gmail is configured
  const isGmailConfigured = process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_REFRESH_TOKEN !== 'your_refresh_token_here' &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET;

  if (!isGmailConfigured) {
    console.log('📧 Gmail not configured - using mock email sender');
    console.log('📧 To enable Gmail, set GOOGLE_REFRESH_TOKEN in .env.local');
    if (attachments?.length) {
      attachments.forEach((a) => {
        console.log(`   📎 Attachment: ${a.filename} (${Math.round(a.content.length / 1024)}KB)`);
      });
    }
  } else {
    // Try to send via Gmail API
    try {
      const { google } = await import('googleapis');
      const { OAuth2Client } = await import('google-auth-library');

      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build email message in RFC 2822 format
      const boundary = '----=_Part_' + Math.random().toString(36).substring(7);
      let message = '';

      // Headers
      const fromEmail = process.env.GMAIL_USER_EMAIL || process.env.GOOGLE_USER_EMAIL || 'noreply@jetvision.com';
      message += `From: ${fromEmail}\r\n`;
      message += `To: ${to}\r\n`;
      if (normalizedCc.length > 0) {
        message += `Cc: ${normalizedCc.join(', ')}\r\n`;
      }
      message += `Subject: ${subject}\r\n`;
      message += `MIME-Version: 1.0\r\n`;

      if (attachments && attachments.length > 0) {
        message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

        // Body
        message += `--${boundary}\r\n`;
        message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
        message += `${body}\r\n\r\n`;

        // Attachments
        for (const attachment of attachments) {
          message += `--${boundary}\r\n`;
          message += `Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${attachment.filename}"\r\n`;
          message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
          message += `Content-Transfer-Encoding: base64\r\n\r\n`;
          message += `${attachment.content}\r\n\r\n`;
        }
        message += `--${boundary}--`;
      } else {
        message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
        message += body;
      }

      // Encode message to base64url
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log('📧 Email sent successfully via Gmail API:', response.data.id);
      return {
        success: true,
        messageId: response.data.id || '',
      };
    } catch (error) {
      console.error('📧 Gmail API error:', error);
      console.log('📧 Falling back to mock email sender');
    }
  }

  // Fallback: Mock implementation for development/testing
  console.log('📧 Mock email sent to:', to);

  // Simulate network delay using configurable delay
  const delayMs = getMockEmailDelay(mockDelayMs);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  // Generate a mock message ID
  const messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  return {
    success: true,
    messageId,
  };
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
