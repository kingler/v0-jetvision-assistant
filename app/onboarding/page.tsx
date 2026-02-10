'use client';

/**
 * Onboarding Page
 *
 * Multi-step onboarding form for new ISO agents.
 * Steps:
 * 1. Personal Information (name, DOB, phone, address)
 * 2. Commission Terms (display terms + acknowledgment)
 * 3. Review & Submit
 *
 * After submission: generates contract, sends email, shows success state.
 * Resumes from correct step if user returns mid-flow.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stepper } from '@/components/ui/stepper';
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
import {
  onboardingFormSchema,
  type OnboardingFormData,
} from '@/lib/validations/onboarding';

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS = [
  { title: 'Personal Info', description: 'Your details' },
  { title: 'Commission Terms', description: 'Review terms' },
  { title: 'Review & Submit', description: 'Confirm details' },
];

type OnboardingPhase = 'loading' | 'form' | 'submitting' | 'sending' | 'success' | 'error';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function OnboardingPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { user, isLoaded: isUserLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [phase, setPhase] = useState<OnboardingPhase>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorSource, setErrorSource] = useState<'form' | 'contract' | null>(null);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      acknowledgeCommissionTerms: false,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = form;

  // Check onboarding status on mount
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/status');
      if (!res.ok) {
        setPhase('form');
        return;
      }
      const data = await res.json();

      switch (data.onboardingStatus) {
        case 'completed':
        case 'contract_signed':
          routerRef.current.replace('/chat');
          return;
        case 'contract_sent':
          setPhase('success');
          return;
        case 'profile_complete':
          // Profile done, need to generate + send contract
          setPhase('sending');
          await generateAndSendContract();
          return;
        case 'pending':
        default:
          setPhase('form');
          break;
      }
    } catch {
      setPhase('form');
    }
  }, []);

  useEffect(() => {
    if (isUserLoaded) {
      if (!user) {
        routerRef.current.replace('/sign-in');
        return;
      }
      checkStatus();
    }
  }, [isUserLoaded, user, checkStatus]);

  // Pre-fill name from Clerk
  useEffect(() => {
    if (user) {
      if (user.firstName) setValue('firstName', user.firstName);
      if (user.lastName) setValue('lastName', user.lastName);
    }
  }, [user, setValue]);

  // Generate contract and send email
  async function generateAndSendContract() {
    setPhase('sending');
    try {
      // Step 1: Generate contract PDF
      const genRes = await fetch('/api/onboarding/generate-contract', {
        method: 'POST',
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || 'Failed to generate contract');
      }

      const genData = await genRes.json();

      // Step 2: Send contract email
      const sendRes = await fetch('/api/onboarding/send-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: genData.contractId,
          pdfBase64: genData.pdfBase64,
          fileName: genData.fileName,
        }),
      });

      if (!sendRes.ok) {
        const err = await sendRes.json();
        throw new Error(err.error || 'Failed to send contract');
      }

      setPhase('success');
    } catch (error) {
      console.error('Contract generation/send failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      setErrorSource('contract');
      setPhase('error');
    }
  }

  // Form submission
  async function onSubmit(data: OnboardingFormData) {
    setPhase('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }

      // Profile saved, now generate and send contract
      await generateAndSendContract();
    } catch (error) {
      console.error('Registration failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      setErrorSource('form');
      setPhase('error');
    }
  }

  // Step navigation
  async function handleNext() {
    if (currentStep === 1) {
      const valid = await trigger([
        'firstName', 'lastName', 'dateOfBirth', 'phone',
        'addressLine1', 'city', 'state', 'zipCode',
      ]);
      if (!valid) return;
    }
    if (currentStep === 2) {
      const valid = await trigger(['acknowledgeCommissionTerms']);
      if (!valid) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="mt-4 text-sm text-slate-500">Loading...</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              Your commission contract has been sent to{' '}
              <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Please review and sign the contract using the link in the email.
              The link is valid for 72 hours.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Something Went Wrong</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            {errorSource === 'contract' ? (
              <>
                <Button onClick={() => { setErrorSource(null); generateAndSendContract(); }}>
                  Retry Contract
                </Button>
                <p className="text-xs text-slate-500">
                  Your profile was saved. Only the contract step will be retried.
                </p>
              </>
            ) : (
              <Button onClick={() => { setPhase('form'); setCurrentStep(1); setErrorSource(null); }}>
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'submitting' || phase === 'sending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="mt-4 text-sm text-slate-500">
            {phase === 'submitting' ? 'Saving your profile...' : 'Generating and sending your contract...'}
          </p>
        </div>
      </div>
    );
  }

  const watchedValues = watch();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Welcome to Jetvision
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Complete your profile to get started as an ISO agent
          </p>
        </div>

        <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Please provide your personal details for the agent agreement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" {...register('firstName')} />
                      {errors.firstName && (
                        <p className="text-xs text-red-500">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" {...register('lastName')} />
                      {errors.lastName && (
                        <p className="text-xs text-red-500">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                      {errors.dateOfBirth && (
                        <p className="text-xs text-red-500">{errors.dateOfBirth.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" {...register('phone')} />
                      {errors.phone && (
                        <p className="text-xs text-red-500">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input id="addressLine1" placeholder="Street address" {...register('addressLine1')} />
                    {errors.addressLine1 && (
                      <p className="text-xs text-red-500">{errors.addressLine1.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input id="addressLine2" placeholder="Apt, suite, unit (optional)" {...register('addressLine2')} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" {...register('city')} />
                      {errors.city && (
                        <p className="text-xs text-red-500">{errors.city.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input id="state" {...register('state')} />
                      {errors.state && (
                        <p className="text-xs text-red-500">{errors.state.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input id="zipCode" placeholder="12345" {...register('zipCode')} />
                      {errors.zipCode && (
                        <p className="text-xs text-red-500">{errors.zipCode.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleNext}>
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 2: Commission Terms */}
            {currentStep === 2 && (
              <>
                <CardHeader>
                  <CardTitle>Commission Terms</CardTitle>
                  <CardDescription>
                    Review the commission structure for your agent agreement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
                    <h3 className="font-semibold mb-2">Commission Structure</h3>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li>
                        <strong>Rate:</strong> 10% of net brokerage fee per transaction
                      </li>
                      <li>
                        <strong>Calculation:</strong> Based on the difference between client price
                        and operator cost, not gross transaction value
                      </li>
                      <li>
                        <strong>Payment:</strong> Monthly, within 30 days of month-end
                      </li>
                      <li>
                        <strong>Condition:</strong> Payable only after full client payment received
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
                    <h3 className="font-semibold mb-2">Key Terms</h3>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li>You will operate as an independent contractor</li>
                      <li>
                        Confidentiality of business operations and client data is required
                      </li>
                      <li>
                        Either party may terminate with 30 days written notice
                      </li>
                      <li>
                        The full agreement will be sent to your email for review and signature
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                      id="acknowledgeCommissionTerms"
                      checked={watchedValues.acknowledgeCommissionTerms === true}
                      onCheckedChange={(checked) => {
                        setValue('acknowledgeCommissionTerms', checked === true);
                        trigger('acknowledgeCommissionTerms');
                      }}
                    />
                    <Label htmlFor="acknowledgeCommissionTerms" className="text-sm leading-relaxed cursor-pointer">
                      I acknowledge that I have read and understand the commission terms outlined
                      above. I understand that a full Independent Sales Agent Agreement will be
                      sent to my email for formal review and digital signature.
                    </Label>
                  </div>
                  {errors.acknowledgeCommissionTerms && (
                    <p className="text-xs text-red-500">{errors.acknowledgeCommissionTerms.message}</p>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button type="button" onClick={handleNext}>
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
              <>
                <CardHeader>
                  <CardTitle>Review & Submit</CardTitle>
                  <CardDescription>
                    Please verify your information before submitting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">Name:</span>{' '}
                        {watchedValues.firstName} {watchedValues.lastName}
                      </div>
                      <div>
                        <span className="text-slate-500">Date of Birth:</span>{' '}
                        {watchedValues.dateOfBirth}
                      </div>
                      <div>
                        <span className="text-slate-500">Phone:</span>{' '}
                        {watchedValues.phone}
                      </div>
                      <div>
                        <span className="text-slate-500">Email:</span>{' '}
                        {user?.primaryEmailAddress?.emailAddress}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500">Address:</span>{' '}
                      {watchedValues.addressLine1}
                      {watchedValues.addressLine2 ? `, ${watchedValues.addressLine2}` : ''},{' '}
                      {watchedValues.city}, {watchedValues.state} {watchedValues.zipCode}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-1">Commission Terms</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      10% of net brokerage fee — Acknowledged
                    </p>
                  </div>

                  <p className="text-xs text-slate-500">
                    By clicking Submit, your profile will be saved and a full Independent Sales
                    Agent Agreement will be sent to your email for review and digital signature.
                  </p>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button type="submit">
                      Submit & Send Contract
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
