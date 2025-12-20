"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, XCircle, Plane, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QuoteRequest {
  id: string
  jetType: string
  aircraftImageUrl?: string
  operatorName: string
  status: 'pending' | 'received' | 'expired'
  flightDuration?: string
  price?: number
  currency?: string
  departureAirport: string
  arrivalAirport: string
}

export interface QuoteRequestItemProps {
  quote: QuoteRequest
  onViewDetails: () => void
}

/**
 * QuoteRequestItem - Individual quote request row in the header
 * Shows jet type, operator, status, duration, price, and route
 */
export function QuoteRequestItem({ quote, onViewDetails }: QuoteRequestItemProps) {
  const getStatusBadge = () => {
    switch (quote.status) {
      case 'received':
        return (
          <Badge className="bg-green-500 text-white text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Received
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1 animate-pulse" />
            Pending
          </Badge>
        )
    }
  }

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border transition-colors",
        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
        "hover:bg-gray-50 dark:hover:bg-gray-700/50"
      )}
    >
      {/* Aircraft Image or Placeholder */}
      <div className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
        {quote.aircraftImageUrl ? (
          <img
            src={quote.aircraftImageUrl}
            alt={quote.jetType}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Plane className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top Row: Jet Type and Operator */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {quote.jetType}
          </span>
          <span className="text-gray-400 dark:text-gray-500">|</span>
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {quote.operatorName}
          </span>
        </div>

        {/* Bottom Row: Route */}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-mono">{quote.departureAirport}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-mono">{quote.arrivalAirport}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        {getStatusBadge()}
      </div>

      {/* Duration */}
      {quote.flightDuration && (
        <div className="flex-shrink-0 text-right">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {quote.flightDuration}
          </span>
        </div>
      )}

      {/* Price */}
      <div className="flex-shrink-0 text-right min-w-[80px]">
        {quote.price ? (
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatPrice(quote.price, quote.currency)}
          </span>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500">--</span>
        )}
      </div>

      {/* View Details Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onViewDetails}
        className="flex-shrink-0 text-xs"
      >
        View Details
      </Button>
    </div>
  )
}

export default QuoteRequestItem
