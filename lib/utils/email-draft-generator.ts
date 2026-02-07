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
 * Produces subject and HTML body matching the server-side template.
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

  const formattedDate = new Date(departureDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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

<strong>Trip Details:</strong>
• Route: ${departureAirport} → ${arrivalAirport}
• Date: ${formattedDate}${pricingLine}

<strong>Proposal ID:</strong> ${proposalId}

The attached PDF contains detailed information about your selected aircraft options, pricing breakdown, and terms of service.

This quote is valid for 48 hours. To book or if you have any questions, please reply to this email or contact our team directly.

Best regards,
The Jetvision Team`;

  return { subject, body };
}
