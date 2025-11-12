/**
 * Review Step
 * Step 4 of RFP Form Wizard - Review and Submit
 */

'use client'

import type React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FlightRoute } from '@/components/aviation'
import { Separator } from '@/components/ui/separator'
import type { RFPFormData } from '@/lib/validations/rfp-form-schema'
import { format } from 'date-fns'

export interface ReviewStepProps {
  form: UseFormReturn<RFPFormData>
}

export function ReviewStep({ form }: ReviewStepProps) {
  const data = form.watch()

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Not specified'
    return format(date, 'PPP')
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'Not specified'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{data.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID:</span>
            <span className="font-medium">{data.clientId}</span>
          </div>
          {data.clientEmail && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{data.clientEmail}</span>
            </div>
          )}
          {data.vipStatus && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={data.vipStatus === 'ultra_vip' ? 'default' : 'secondary'}>
                {data.vipStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flight Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Flight Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FlightRoute
            departureAirport={data.departureAirport}
            arrivalAirport={data.arrivalAirport}
            departureTime={data.departureTime}
            arrivalTime={data.returnTime}
          />
          <Separator />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="text-sm text-muted-foreground">Departure:</span>
              <p className="font-medium">{formatDate(data.departureDate)}</p>
              {data.departureTime && (
                <p className="text-sm text-muted-foreground">{data.departureTime}</p>
              )}
            </div>
            {data.returnDate && (
              <div>
                <span className="text-sm text-muted-foreground">Return:</span>
                <p className="font-medium">{formatDate(data.returnDate)}</p>
                {data.returnTime && (
                  <p className="text-sm text-muted-foreground">{data.returnTime}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Passengers:</span>
            <span className="font-medium">{data.passengers}</span>
          </div>
          {data.aircraftType && data.aircraftType !== 'any' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aircraft Type:</span>
              <span className="font-medium capitalize">{data.aircraftType.replace('_', ' ')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences & Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.budgetMin || data.budgetMax) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget Range:</span>
              <span className="font-medium">
                {formatCurrency(data.budgetMin)} - {formatCurrency(data.budgetMax)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Catering:</span>
            <span className="font-medium capitalize">{data.cateringPreference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ground Transport:</span>
            <span className="font-medium">{data.groundTransport ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Flexible Dates:</span>
            <span className="font-medium">{data.flexibleDates ? 'Yes' : 'No'}</span>
          </div>
          {data.specialRequirements && (
            <>
              <Separator className="my-2" />
              <div>
                <span className="text-sm text-muted-foreground">Special Requirements:</span>
                <p className="mt-1 text-sm">{data.specialRequirements}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
