/**
 * Proposal PDF Upload API Route
 *
 * POST /api/proposal/upload-pdf
 *
 * Uploads a base64-encoded PDF to Supabase storage and returns the public URL.
 * Used by the email preview workflow to make the PDF available as an attachment
 * link before the email is sent.
 *
 * @see app/api/proposal/generate/route.ts - Generates the PDF
 * @see components/email/email-preview-card.tsx - Displays the preview
 */

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
  fileSizeBytes?: number;
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
    const uploadResult = await uploadProposalPdf(
      pdfBuffer,
      fileName,
      authResult.id
    );

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
      fileSizeBytes: uploadResult.fileSizeBytes,
    });
  } catch (error) {
    console.error('[UploadPdf] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}
