# ONEK-178: Email Preview Before Sending Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing EmailPreviewCard component into the proposal sending flow so users must review and approve the email before it's sent.

**Architecture:** The proposal flow in `chat-interface.tsx` currently calls `/api/proposal/send` directly (generates PDF + sends email in one shot). We split this into two steps: (1) generate PDF + draft email content, show `EmailPreviewCard` in chat, (2) on user approval, call `/api/proposal/approve-email` to actually send. All building blocks exist — we're connecting them.

**Tech Stack:** Next.js 14, React, TypeScript, Supabase

---

## Current State

- `EmailPreviewCard` component: **complete** (`components/email/email-preview-card.tsx`)
- `AgentMessage` rendering of EmailPreviewCard: **complete** (lines 526-546, triggered by `showEmailApprovalRequest` prop)
- `POST /api/proposal/generate`: **complete** (generates PDF, optionally saves draft)
- `POST /api/proposal/approve-email`: **complete** (validates, sends email, updates DB)
- `EmailApprovalRequestContent` type: **complete** (`lib/types/chat.ts:396-434`)
- DB schema (`email_approval_status`, `email_draft_subject`, `email_draft_body`): **complete**

## What's Missing

The `handleCustomerSelected` function in `chat-interface.tsx` (lines 1355-1612) directly calls `/api/proposal/send` at line 1480. It never:
1. Sets `showEmailApprovalRequest=true` on a message
2. Populates `emailApprovalData` with draft email content
3. Passes `onEmailSend` / `onEmailEdit` / `onEmailCancel` callbacks to AgentMessage

---

### Task 1: Add Email Draft Generation Utility

**Files:**
- Create: `lib/utils/email-draft-generator.ts`
- Test: `__tests__/unit/lib/utils/email-draft-generator.test.ts`

This utility generates the email subject and body that will be shown in the preview card. It replicates the template logic from `lib/services/email-service.ts` (lines 97-150) but runs on the client side.

**Step 1: Write the failing test**

```typescript
// __tests__/unit/lib/utils/email-draft-generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateEmailDraft } from '@/lib/utils/email-draft-generator';

describe('generateEmailDraft', () => {
  it('should generate subject with route', () => {
    const draft = generateEmailDraft({
      customerName: 'John Smith',
      departureAirport: 'KTEB',
      arrivalAirport: 'KLAX',
      departureDate: '2026-03-15',
      proposalId: 'JV-ABC123',
      pricing: { total: 45000, currency: 'USD' },
    });

    expect(draft.subject).toContain('KTEB');
    expect(draft.subject).toContain('KLAX');
  });

  it('should generate body with customer name', () => {
    const draft = generateEmailDraft({
      customerName: 'John Smith',
      departureAirport: 'KTEB',
      arrivalAirport: 'KLAX',
      departureDate: '2026-03-15',
      proposalId: 'JV-ABC123',
      pricing: { total: 45000, currency: 'USD' },
    });

    expect(draft.body).toContain('John Smith');
    expect(draft.body).toContain('KTEB');
    expect(draft.body).toContain('KLAX');
    expect(draft.body).toContain('$45,000');
  });

  it('should generate body without pricing when not provided', () => {
    const draft = generateEmailDraft({
      customerName: 'Jane Doe',
      departureAirport: 'KJFK',
      arrivalAirport: 'EGLL',
      departureDate: '2026-04-01',
      proposalId: 'JV-DEF456',
    });

    expect(draft.body).toContain('Jane Doe');
    expect(draft.body).not.toContain('Total:');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/utils/email-draft-generator.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// lib/utils/email-draft-generator.ts

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

export function generateEmailDraft(options: EmailDraftOptions): EmailDraft {
  const { customerName, departureAirport, arrivalAirport, departureDate, proposalId, pricing } = options;

  const subject = `Jetvision Charter Proposal: ${departureAirport} → ${arrivalAirport}`;

  const formattedDate = new Date(departureDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pricingSection = pricing
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
• Date: ${formattedDate}${pricingSection}

<strong>Proposal ID:</strong> ${proposalId}

The attached PDF contains detailed information about your selected aircraft options, pricing breakdown, and terms of service.

This quote is valid for 48 hours. To book or if you have any questions, please reply to this email or contact our team directly.

Best regards,
The Jetvision Team`;

  return { subject, body };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/utils/email-draft-generator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/email-draft-generator.ts __tests__/unit/lib/utils/email-draft-generator.test.ts
git commit -m "feat(ONEK-178): add email draft generator utility"
```

---

### Task 2: Add Email Approval State to ChatInterface

**Files:**
- Modify: `components/chat-interface.tsx`

Add state variables and handler functions for the email approval workflow. This task only adds the state and handlers — Task 3 wires the flow.

**Step 1: Add state variables after existing state declarations**

Find the state declarations block (around lines 100-160) and add:

```typescript
// Email approval workflow state (ONEK-178)
const [emailApprovalMessageId, setEmailApprovalMessageId] = useState<string | null>(null);
const [emailApprovalData, setEmailApprovalData] = useState<import('@/lib/types/chat').EmailApprovalRequestContent | null>(null);
const [emailApprovalStatus, setEmailApprovalStatus] = useState<'draft' | 'sending' | 'sent' | 'error'>('draft');
const [emailApprovalError, setEmailApprovalError] = useState<string | undefined>();
```

**Step 2: Add email approval handler functions**

Add these handler functions in the handlers section (after `handleCustomerSelected`, around line 1612):

```typescript
/**
 * Handle email field edit from EmailPreviewCard
 */
const handleEmailEdit = useCallback((field: 'subject' | 'body', value: string) => {
  if (!emailApprovalData) return;
  setEmailApprovalData(prev => prev ? { ...prev, [field]: value } : null);
}, [emailApprovalData]);

/**
 * Handle email send approval from EmailPreviewCard
 * Calls /api/proposal/approve-email with the final (possibly edited) content
 */
const handleEmailSend = useCallback(async () => {
  if (!emailApprovalData) return;

  setEmailApprovalStatus('sending');
  setEmailApprovalError(undefined);

  try {
    const response = await fetch('/api/proposal/approve-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: emailApprovalData.proposalId,
        subject: emailApprovalData.subject,
        body: emailApprovalData.body,
        to: emailApprovalData.to,
        requestId: emailApprovalData.requestId,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    setEmailApprovalStatus('sent');

    // Open the PDF if available
    const pdfAttachment = emailApprovalData.attachments?.find(a => a.type?.includes('pdf'));
    if (pdfAttachment?.url) {
      window.open(pdfAttachment.url, '_blank');
    }

    // Add proposal-sent confirmation message to chat
    if (activeChat) {
      const proposalSentData = {
        flightDetails: emailApprovalData.flightDetails
          ? {
              departureAirport: emailApprovalData.flightDetails.departureAirport,
              arrivalAirport: emailApprovalData.flightDetails.arrivalAirport,
              departureDate: emailApprovalData.flightDetails.departureDate,
            }
          : undefined,
        client: { name: emailApprovalData.to.name, email: emailApprovalData.to.email },
        pdfUrl: pdfAttachment?.url || '',
        fileName: pdfAttachment?.name || '',
        proposalId: emailApprovalData.proposalId,
        pricing: emailApprovalData.pricing
          ? { total: emailApprovalData.pricing.total, currency: emailApprovalData.pricing.currency }
          : undefined,
      };

      const dep = emailApprovalData.flightDetails?.departureAirport || '';
      const arr = emailApprovalData.flightDetails?.arrivalAirport || '';
      const confirmationContent = `The proposal for ${dep} → ${arr} was sent to ${emailApprovalData.to.name} at ${emailApprovalData.to.email}.`;

      const confirmationMessage = {
        id: result.savedMessageId || `agent-proposal-sent-${Date.now()}`,
        type: 'agent' as const,
        content: confirmationContent,
        timestamp: new Date(),
        showProposalSentConfirmation: true,
        proposalSentData,
      };

      const updatedMessages = [...(activeChat.messages || []), confirmationMessage];
      onUpdateChat(activeChat.id, {
        messages: updatedMessages,
        status: 'proposal_sent' as const,
        customer: {
          name: emailApprovalData.to.name,
          email: emailApprovalData.to.email,
          isReturning: false,
          preferences: {},
        },
      });
    }
  } catch (error) {
    console.error('[ChatInterface] Email approval send failed:', error);
    setEmailApprovalStatus('error');
    setEmailApprovalError(error instanceof Error ? error.message : 'Failed to send email');
  }
}, [emailApprovalData, activeChat, onUpdateChat]);

/**
 * Handle email approval cancel from EmailPreviewCard
 */
const handleEmailCancel = useCallback(() => {
  // Remove the email approval message from chat
  if (emailApprovalMessageId && activeChat) {
    const updatedMessages = (activeChat.messages || []).filter(
      m => m.id !== emailApprovalMessageId
    );
    onUpdateChat(activeChat.id, { messages: updatedMessages });
  }
  // Reset email approval state
  setEmailApprovalMessageId(null);
  setEmailApprovalData(null);
  setEmailApprovalStatus('draft');
  setEmailApprovalError(undefined);
}, [emailApprovalMessageId, activeChat, onUpdateChat]);
```

**Step 3: Pass handlers to AgentMessage component**

Find where `showEmailApprovalRequest` and `emailApprovalData` are passed to `<AgentMessage>` (around line 2297-2298) and add the missing handler props immediately after:

```typescript
showEmailApprovalRequest={message.showEmailApprovalRequest}
emailApprovalData={message.emailApprovalData}
onEmailEdit={handleEmailEdit}
onEmailSend={handleEmailSend}
onEmailCancel={handleEmailCancel}
emailApprovalStatus={message.showEmailApprovalRequest ? emailApprovalStatus : undefined}
emailApprovalError={message.showEmailApprovalRequest ? emailApprovalError : undefined}
```

**Step 4: Commit**

```bash
git add components/chat-interface.tsx
git commit -m "feat(ONEK-178): add email approval state and handlers to ChatInterface"
```

---

### Task 3: Rewire handleCustomerSelected to Show Email Preview

**Files:**
- Modify: `components/chat-interface.tsx`

This is the core change. Replace the direct `/api/proposal/send` call with a two-step flow:
1. Call `/api/proposal/generate` with `saveDraft: true` to generate PDF
2. Upload the PDF to storage
3. Generate email draft content
4. Add a message to chat with `showEmailApprovalRequest=true` and `emailApprovalData`

**Step 1: Add import for email draft generator**

At the top of `chat-interface.tsx`, add:

```typescript
import { generateEmailDraft } from '@/lib/utils/email-draft-generator';
```

**Step 2: Replace the proposal send logic**

Replace the block from line 1479 (`// Call the proposal send API...`) through the end of the try block (approximately line 1603) with the new two-step flow:

```typescript
      // Step 1: Generate proposal PDF (without sending email)
      const generateResponse = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerData,
          tripDetails,
          selectedFlights: [selectedFlight],
          jetvisionFeePercentage: 30,
          saveDraft: true,
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to generate proposal: ${generateResponse.statusText}`);
      }

      const generateResult = await generateResponse.json();

      if (!generateResult.success) {
        throw new Error(generateResult.error || 'Failed to generate proposal');
      }

      console.log('[ChatInterface] Proposal generated, showing email preview:', {
        proposalId: generateResult.proposalId,
        dbProposalId: generateResult.dbProposalId,
        proposalNumber: generateResult.proposalNumber,
        pricing: generateResult.pricing,
      });

      // Upload PDF to storage for attachment URL
      let pdfUrl = '';
      if (generateResult.pdfBase64) {
        try {
          const uploadResponse = await fetch('/api/proposal/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64: generateResult.pdfBase64,
              fileName: generateResult.fileName,
            }),
          });
          const uploadResult = await uploadResponse.json();
          if (uploadResult.success && uploadResult.publicUrl) {
            pdfUrl = uploadResult.publicUrl;
          }
        } catch (uploadErr) {
          console.warn('[ChatInterface] PDF upload failed, continuing without URL:', uploadErr);
        }
      }

      // Step 2: Generate email draft content for preview
      const emailDraft = generateEmailDraft({
        customerName: customerData.name,
        departureAirport: departureIcao,
        arrivalAirport: arrivalIcao,
        departureDate: tripDetails.departureDate,
        proposalId: generateResult.proposalId,
        pricing: generateResult.pricing
          ? { total: generateResult.pricing.total, currency: generateResult.pricing.currency }
          : undefined,
      });

      // Build email approval data for EmailPreviewCard
      const proposalId = generateResult.dbProposalId || generateResult.proposalId;
      const approvalData: import('@/lib/types/chat').EmailApprovalRequestContent = {
        proposalId,
        proposalNumber: generateResult.proposalNumber,
        to: {
          email: customerData.email,
          name: customerData.name,
        },
        subject: emailDraft.subject,
        body: emailDraft.body,
        attachments: generateResult.fileName
          ? [{
              name: generateResult.fileName,
              url: pdfUrl,
              type: 'application/pdf',
            }]
          : [],
        flightDetails: {
          departureAirport: departureIcao,
          arrivalAirport: arrivalIcao,
          departureDate: tripDetails.departureDate,
          passengers: tripDetails.passengers,
        },
        pricing: generateResult.pricing
          ? {
              subtotal: generateResult.pricing.subtotal,
              total: generateResult.pricing.total,
              currency: generateResult.pricing.currency,
            }
          : undefined,
        generatedAt: generateResult.generatedAt,
        requestId: requestIdForSave || undefined,
      };

      // Step 3: Add email preview message to chat
      const emailPreviewMessageId = `email-preview-${Date.now()}`;
      const emailPreviewMessage = {
        id: emailPreviewMessageId,
        type: 'agent' as const,
        content: `I've prepared a proposal for ${customerData.name}. Please review the email below before sending.`,
        timestamp: new Date(),
        showEmailApprovalRequest: true,
        emailApprovalData: approvalData,
      };

      // Set approval state
      setEmailApprovalMessageId(emailPreviewMessageId);
      setEmailApprovalData(approvalData);
      setEmailApprovalStatus('draft');
      setEmailApprovalError(undefined);

      const updatedMessages = [...(activeChat.messages || []), emailPreviewMessage];
      onUpdateChat(activeChat.id, { messages: updatedMessages });
```

**Step 3: Commit**

```bash
git add components/chat-interface.tsx
git commit -m "feat(ONEK-178): rewire proposal flow to show email preview before sending"
```

---

### Task 4: Create PDF Upload API Route

**Files:**
- Create: `app/api/proposal/upload-pdf/route.ts`

The generate endpoint returns base64 PDF but doesn't upload to storage. We need a small endpoint to handle the upload so the email preview can link to the PDF.

**Step 1: Create the route**

```typescript
// app/api/proposal/upload-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadProposalPdf } from '@/lib/supabase/admin';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api';

export const dynamic = 'force-dynamic';

interface UploadPdfRequest {
  pdfBase64: string;
  fileName: string;
}

interface UploadPdfResponse {
  success: boolean;
  publicUrl?: string;
  filePath?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadPdfResponse>> {
  try {
    const authResult = await getAuthenticatedAgent();
    if (isErrorResponse(authResult)) {
      return authResult as NextResponse<UploadPdfResponse>;
    }

    const bodyResult = await parseJsonBody<UploadPdfRequest>(request);
    if (isErrorResponse(bodyResult)) {
      return bodyResult as NextResponse<UploadPdfResponse>;
    }

    const { pdfBase64, fileName } = bodyResult;

    if (!pdfBase64 || !fileName) {
      return NextResponse.json(
        { success: false, error: 'pdfBase64 and fileName are required' },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const uploadResult = await uploadProposalPdf(pdfBuffer, fileName, authResult.id);

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      publicUrl: uploadResult.publicUrl,
      filePath: uploadResult.filePath,
    });
  } catch (error) {
    console.error('[UploadPdf] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/proposal/upload-pdf/route.ts
git commit -m "feat(ONEK-178): add PDF upload API route for email preview workflow"
```

---

### Task 5: Verify End-to-End Flow

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Manual test**

1. Open app in browser
2. Create/select a flight request with quotes
3. Click "Generate Proposal" on a flight card
4. Select a customer from the dialog
5. **Expected**: EmailPreviewCard appears in chat showing:
   - Recipient name and email
   - Email subject with route
   - Email body with trip details and pricing
   - PDF attachment link
   - "Edit Email" and "Send Email" buttons
6. Click "Edit Email" — fields become editable
7. Modify subject or body, click "Save Changes"
8. Click "Send Email"
9. **Expected**: Status changes to "Sending..." then "Sent"
10. **Expected**: ProposalSentConfirmation appears below
11. Click "Cancel" instead of Send
12. **Expected**: Email preview message removed from chat

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ONEK-178): complete email preview before send workflow"
```

---

## Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `lib/utils/email-draft-generator.ts` | Create | Client-side email template generation |
| `__tests__/unit/lib/utils/email-draft-generator.test.ts` | Create | Unit tests for draft generator |
| `app/api/proposal/upload-pdf/route.ts` | Create | Upload PDF to storage for preview attachment |
| `components/chat-interface.tsx` | Modify | Add email approval state, handlers, rewire proposal flow |

## Risk Assessment

- **Risk**: Low — all infrastructure exists, we're connecting pieces
- **Breaking changes**: None — existing `/api/proposal/send` route remains unchanged (can be used as fallback)
- **Rollback**: Remove the email preview message logic and restore the direct `/api/proposal/send` call
