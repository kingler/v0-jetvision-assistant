/**
 * New RFP Submission Page
 * Create new flight request using multi-step form wizard
 */

'use client'

import type React from 'react'
import { RFPFormWizard } from '@/components/rfp/rfp-form-wizard'
import type { RFPFormData } from '@/lib/validations/rfp-form-schema'
import { useRouter } from 'next/navigation'

export default function NewRFPPage() {
  const router = useRouter()

  const handleSubmit = async (data: RFPFormData) => {
    try {
      // TODO: Replace with actual API call
      console.log('Submitting RFP:', data)

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to submit RFP')
      }

      const result = await response.json()

      // Redirect to request details page
      router.push(`/rfp/${result.id}`)
    } catch (error) {
      console.error('Error submitting RFP:', error)
      // TODO: Show error toast
    }
  }

  const handleSaveDraft = (data: Partial<RFPFormData>) => {
    // Save to localStorage
    localStorage.setItem('rfp-draft', JSON.stringify(data))
    console.log('Draft saved:', data)
    // TODO: Show success toast
  }

  // Load draft from localStorage
  const loadDraft = (): Partial<RFPFormData> | undefined => {
    if (typeof window === 'undefined') return undefined

    const draft = localStorage.getItem('rfp-draft')
    if (draft) {
      try {
        return JSON.parse(draft)
      } catch {
        return undefined
      }
    }
    return undefined
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Flight Request</h1>
        <p className="text-muted-foreground mt-2">
          Create a new RFP for private jet charter
        </p>
      </div>

      <RFPFormWizard
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        initialData={loadDraft()}
      />
    </div>
  )
}
