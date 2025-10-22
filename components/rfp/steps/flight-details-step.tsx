/**
 * Flight Details Step
 * Step 2 of RFP Form Wizard
 */

'use client'

import type React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RFPFormData } from '@/lib/validations/rfp-form-schema'

export interface FlightDetailsStepProps {
  form: UseFormReturn<RFPFormData>
}

export function FlightDetailsStep({ form }: FlightDetailsStepProps) {
  const {
    register,
    formState: { errors },
    setValue,
  } = form

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="departureAirport">
            Departure Airport <span className="text-destructive">*</span>
          </Label>
          <Input
            id="departureAirport"
            {...register('departureAirport')}
            placeholder="KJFK or JFK"
          />
          {errors.departureAirport && (
            <p className="text-sm text-destructive">{errors.departureAirport.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="arrivalAirport">
            Arrival Airport <span className="text-destructive">*</span>
          </Label>
          <Input
            id="arrivalAirport"
            {...register('arrivalAirport')}
            placeholder="KLAX or LAX"
          />
          {errors.arrivalAirport && (
            <p className="text-sm text-destructive">{errors.arrivalAirport.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="departureDate">
            Departure Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="departureDate"
            type="date"
            {...register('departureDate', { valueAsDate: true })}
          />
          {errors.departureDate && (
            <p className="text-sm text-destructive">{errors.departureDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="departureTime">Departure Time</Label>
          <Input
            id="departureTime"
            type="time"
            {...register('departureTime')}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="returnDate">Return Date (Optional)</Label>
          <Input
            id="returnDate"
            type="date"
            {...register('returnDate', { valueAsDate: true })}
          />
          {errors.returnDate && (
            <p className="text-sm text-destructive">{errors.returnDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnTime">Return Time</Label>
          <Input
            id="returnTime"
            type="time"
            {...register('returnTime')}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="passengers">
            Passengers <span className="text-destructive">*</span>
          </Label>
          <Input
            id="passengers"
            type="number"
            min={1}
            max={20}
            {...register('passengers', { valueAsNumber: true })}
          />
          {errors.passengers && (
            <p className="text-sm text-destructive">{errors.passengers.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="aircraftType">Aircraft Type Preference</Label>
          <Select onValueChange={(value) => setValue('aircraftType', value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="light_jet">Light Jet</SelectItem>
              <SelectItem value="midsize">Midsize</SelectItem>
              <SelectItem value="super_midsize">Super Midsize</SelectItem>
              <SelectItem value="heavy_jet">Heavy Jet</SelectItem>
              <SelectItem value="ultra_long_range">Ultra Long Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
