/**
 * Email Draft Generator
 *
 * Generates email subject and body content for proposal email previews.
 * Mirrors the template logic in lib/services/email-service.ts but runs
 * on the client side for the EmailPreviewCard workflow.
 *
 * @see lib/services/email-service.ts - Server-side email templates
 * @see components/email/email-preview-card.tsx - Preview UI
 */

export interface EmailDraftOptions {
  customerName: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  proposalId: string;
  pricing?: {
    total: number;
    currency: string;
  };
}

export interface EmailDraft {
  subject: string;
  body: string;
}

/**
 * Generate email draft content for proposal preview.
 * Produces subject and plain text body matching the server-side template.
 */
export function generateEmailDraft(options: EmailDraftOptions): EmailDraft {
  const {
    customerName,
    departureAirport,
    arrivalAirport,
    departureDate,
    proposalId,
    pricing,
  } = options;

  const subject = `Jetvision Charter Proposal: ${departureAirport} → ${arrivalAirport}`;

  // Parse YYYY-MM-DD as UTC components to avoid timezone-induced off-by-one errors
  // (e.g., new Date("2026-03-25") creates UTC midnight, which in US timezones
  // shifts to Mar 24 — showing the wrong weekday and date)
  const dateOnlyMatch = departureDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dateObj = dateOnlyMatch
    ? new Date(Date.UTC(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3])))
    : new Date(departureDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const pricingLine = pricing
    ? `\n• Total: ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: pricing.currency,
        maximumFractionDigits: 0,
      }).format(pricing.total)}`
    : '';

  const body = `Dear ${customerName},

Thank you for considering Jetvision for your private charter needs.

Please find attached your customized proposal for your upcoming trip:

Trip Details:
• Route: ${departureAirport} → ${arrivalAirport}
• Date: ${formattedDate}${pricingLine}

Proposal ID: ${proposalId}

The attached PDF contains detailed information about your selected aircraft options, pricing breakdown, and terms of service.

This quote is valid for 48 hours. To book or if you have any questions, please reply to this email or contact our team directly.

Best regards,
The Jetvision Team`;

  return { subject, body };
}
