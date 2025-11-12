/**
 * RFP Form Wizard
 * Multi-step form for submitting flight requests
 */

'use client'

import type React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Stepper } from '@/components/ui/stepper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { rfpFormSchema, type RFPFormData } from '@/lib/validations/rfp-form-schema'
import { ClientSelectionStep } from './steps/client-selection-step'
import { FlightDetailsStep } from './steps/flight-details-step'
import { PreferencesStep } from './steps/preferences-step'
import { ReviewStep } from './steps/review-step'

const STEPS = [
  { title: 'Client', description: 'Select client' },
  { title: 'Flight', description: 'Flight details' },
  { title: 'Preferences', description: 'Requirements' },
  { title: 'Review', description: 'Confirm & submit' },
]

export interface RFPFormWizardProps {
  onSubmit: (data: RFPFormData) => Promise<void>
  onSaveDraft?: (data: Partial<RFPFormData>) => void
  initialData?: Partial<RFPFormData>
}

export function RFPFormWizard({ onSubmit, onSaveDraft, initialData }: RFPFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RFPFormData>({
    resolver: zodResolver(rfpFormSchema),
    defaultValues: initialData || {
      passengers: 1,
      cateringPreference: 'none',
      groundTransport: false,
      flexibleDates: false,
    },
    mode: 'onChange',
  })

  const handleNext = async () => {
    const fields = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fields as any)

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
      // Auto-save draft
      if (onSaveDraft) {
        onSaveDraft(form.getValues())
      }
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmitForm = async (data: RFPFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = () => {
    if (onSaveDraft) {
      onSaveDraft(form.getValues())
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Progress Stepper */}
      <Stepper steps={STEPS} currentStep={currentStep} />

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>

        <form onSubmit={form.handleSubmit(handleSubmitForm)}>
          <CardContent className="min-h-[400px]">
            {currentStep === 1 && <ClientSelectionStep form={form} />}
            {currentStep === 2 && <FlightDetailsStep form={form} />}
            {currentStep === 3 && <PreferencesStep form={form} />}
            {currentStep === 4 && <ReviewStep form={form} />}
          </CardContent>

          <CardFooter className="flex justify-between gap-4">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              {onSaveDraft && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSaveDraft}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
              )}
            </div>

            <div>
              {currentStep < STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit RFP'}
                </Button>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

// Helper function to get fields for each step for validation
function getFieldsForStep(step: number): string[] {
  switch (step) {
    case 1:
      return ['clientId', 'clientName']
    case 2:
      return ['departureAirport', 'arrivalAirport', 'departureDate', 'passengers']
    case 3:
      return []  // All fields optional in preferences
    case 4:
      return []  // Review step, no new fields
    default:
      return []
  }
}
