/**
 * Client Selection Step
 * Step 1 of RFP Form Wizard
 */

'use client'

import type React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { RFPFormData } from '@/lib/validations/rfp-form-schema'

export interface ClientSelectionStepProps {
  form: UseFormReturn<RFPFormData>
}

export function ClientSelectionStep({ form }: ClientSelectionStepProps) {
  const {
    register,
    formState: { errors },
    watch,
  } = form

  const vipStatus = watch('vipStatus')

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="clientName">
          Client Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="clientName"
          {...register('clientName')}
          placeholder="John Smith"
        />
        {errors.clientName?.message && (
          <p className="text-sm text-destructive">{String(errors.clientName.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientId">
          Client ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="clientId"
          {...register('clientId')}
          placeholder="CL-12345"
        />
        {errors.clientId?.message && (
          <p className="text-sm text-destructive">{String(errors.clientId.message)}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clientEmail">Email</Label>
          <Input
            id="clientEmail"
            type="email"
            {...register('clientEmail')}
            placeholder="john@example.com"
          />
          {errors.clientEmail?.message && (
            <p className="text-sm text-destructive">{String(errors.clientEmail.message)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientPhone">Phone</Label>
          <Input
            id="clientPhone"
            {...register('clientPhone')}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>VIP Status</Label>
        <div className="flex gap-2">
          <Badge variant={vipStatus === 'standard' ? 'default' : 'outline'}>
            Standard
          </Badge>
          <Badge variant={vipStatus === 'vip' ? 'default' : 'outline'} className="bg-secondary">
            VIP
          </Badge>
          <Badge variant={vipStatus === 'ultra_vip' ? 'default' : 'outline'} className="bg-accent">
            Ultra VIP
          </Badge>
        </div>
      </div>
    </div>
  )
}
