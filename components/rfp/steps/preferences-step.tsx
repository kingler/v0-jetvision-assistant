/**
 * Preferences Step
 * Step 3 of RFP Form Wizard
 */

'use client'

import type React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import type { RFPFormData } from '@/lib/validations/rfp-form-schema'

export interface PreferencesStepProps {
  form: UseFormReturn<RFPFormData>
}

export function PreferencesStep({ form }: PreferencesStepProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form

  const budgetMax = watch('budgetMax') || 100000
  const groundTransport = watch('groundTransport')
  const flexibleDates = watch('flexibleDates')

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Budget Range (Optional)</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="budgetMin" className="text-sm text-muted-foreground">
              Minimum
            </Label>
            <Input
              id="budgetMin"
              type="number"
              min={0}
              step={1000}
              {...register('budgetMin', { valueAsNumber: true })}
              placeholder="$50,000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetMax" className="text-sm text-muted-foreground">
              Maximum
            </Label>
            <Input
              id="budgetMax"
              type="number"
              min={0}
              step={1000}
              {...register('budgetMax', { valueAsNumber: true })}
              placeholder="$100,000"
            />
            {errors.budgetMax && (
              <p className="text-sm text-destructive">{errors.budgetMax.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="specialRequirements">Special Requirements</Label>
        <Textarea
          id="specialRequirements"
          {...register('specialRequirements')}
          placeholder="Any special requests, accessibility needs, or preferences..."
          rows={4}
        />
        {errors.specialRequirements && (
          <p className="text-sm text-destructive">{errors.specialRequirements.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cateringPreference">Catering Preference</Label>
        <Select onValueChange={(value) => setValue('cateringPreference', value as any)}>
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="light">Light Refreshments</SelectItem>
            <SelectItem value="full">Full Catering</SelectItem>
            <SelectItem value="custom">Custom Menu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="groundTransport">Ground Transport</Label>
            <p className="text-sm text-muted-foreground">
              Arrange ground transportation
            </p>
          </div>
          <Switch
            id="groundTransport"
            checked={groundTransport}
            onCheckedChange={(checked) => setValue('groundTransport', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="flexibleDates">Flexible Dates</Label>
            <p className="text-sm text-muted-foreground">
              Can adjust dates if better pricing available
            </p>
          </div>
          <Switch
            id="flexibleDates"
            checked={flexibleDates}
            onCheckedChange={(checked) => setValue('flexibleDates', checked)}
          />
        </div>
      </div>
    </div>
  )
}
