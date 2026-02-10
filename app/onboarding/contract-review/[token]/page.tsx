'use client';

/**
 * Contract Review Page
 *
 * Allows an authenticated ISO agent to review and sign their
 * employment commission contract. Accessed via a secure token link
 * sent in the onboarding email.
 *
 * Flow:
 * 1. Validate token on mount
 * 2. Display PDF in iframe
 * 3. Capture typed name + acknowledgment
 * 4. Submit signature -> redirect to /chat
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// =============================================================================
// TYPES
// =============================================================================

type ReviewPhase = 'loading' | 'review' | 'signing' | 'success' | 'error';

interface TokenValidation {
  contractId: string;
  agentEmail: string;
  pdfUrl?: string;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function ContractReviewPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { user, isLoaded: isUserLoaded } = useUser();

  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [validation, setValidation] = useState<TokenValidation | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [signedName, setSignedName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  // Validate token on mount
  const validateToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/onboarding/validate-token/${token}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid token');
        setErrorCode(data.errorCode || '');
        setPhase('error');
        return;
      }

      setValidation(data);
      setPhase('review');
    } catch {
      setErrorMessage('Failed to validate token');
      setPhase('error');
    }
  }, [token]);

  useEffect(() => {
    if (isUserLoaded) {
      if (!user) {
        router.replace(`/sign-in?redirect_url=/onboarding/contract-review/${token}`);
        return;
      }
      validateToken();
    }
  }, [isUserLoaded, user, router, token, validateToken]);

  // Sign contract
  async function handleSign() {
    if (!signedName.trim() || !acknowledged) return;

    setPhase('signing');
    try {
      const res = await fetch('/api/onboarding/sign-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signedName: signedName.trim(),
          acknowledgeSignature: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to sign contract');
      }

      setPhase('success');

      // Redirect to chat after 3 seconds
      setTimeout(() => {
        router.replace('/chat');
      }, 3000);
    } catch (error) {
      console.error('Sign contract failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to sign');
      setPhase('error');
    }
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="mt-4 text-sm text-slate-500">Validating your contract link...</p>
        </div>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <CardTitle>Contract Signed</CardTitle>
            <CardDescription>
              Welcome to Jetvision! Your onboarding is complete. Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">
              {errorCode === 'EXPIRED'
                ? 'Link Expired'
                : errorCode === 'USED'
                ? 'Link Already Used'
                : errorCode === 'EMAIL_MISMATCH'
                ? 'Wrong Account'
                : 'Invalid Link'}
            </CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {errorCode === 'EXPIRED' && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Please return to the onboarding page to request a new contract link.
              </p>
            )}
            {errorCode === 'USED' && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your contract has already been signed. You can proceed to the dashboard.
              </p>
            )}
            {errorCode === 'EMAIL_MISMATCH' && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Please sign in with the email address associated with this contract.
              </p>
            )}
            <Button
              onClick={() => router.replace(errorCode === 'USED' ? '/chat' : '/onboarding')}
            >
              {errorCode === 'USED' ? 'Go to Dashboard' : 'Back to Onboarding'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'signing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="mt-4 text-sm text-slate-500">Processing your signature...</p>
        </div>
      </div>
    );
  }

  // phase === 'review'
  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Review & Sign Your Contract
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Contract for: {validation?.agentEmail}
          </p>
        </div>

        {/* PDF Viewer */}
        {validation?.pdfUrl && (
          <Card className="mb-6">
            <CardContent className="p-2">
              <iframe
                src={validation.pdfUrl}
                className="w-full h-[600px] rounded border"
                title="Contract PDF"
              />
            </CardContent>
          </Card>
        )}

        {!validation?.pdfUrl && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <p className="font-medium text-amber-700 dark:text-amber-300">Contract PDF unavailable for preview</p>
              <p className="mt-1 text-sm text-slate-500">The PDF was attached to the email sent to your inbox. You can still sign the contract below after reviewing the emailed copy.</p>
            </CardContent>
          </Card>
        )}

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle>Digital Signature</CardTitle>
            <CardDescription>
              Type your full legal name below to sign this agreement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signedName">Full Legal Name *</Label>
              <Input
                id="signedName"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Enter your full legal name"
              />
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <Label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
                I confirm that I have reviewed the Independent Sales Agent Agreement in full.
                By typing my name above and clicking &quot;Sign Contract&quot;, I am providing my
                electronic signature, which I understand to be legally binding and equivalent
                to a handwritten signature.
              </Label>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSign}
                disabled={!signedName.trim() || !acknowledged}
              >
                Sign Contract
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
