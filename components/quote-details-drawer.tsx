"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  X,
  Send,
  Star,
  Plane,
  Clock,
  MapPin,
  Users,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface OperatorMessage {
  id: string
  type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION'
  content: string
  timestamp: string
  sender?: string
}

export interface QuoteDetails {
  id: string
  rfqId: string
  operator: {
    name: string
    rating?: number
  }
  aircraft: {
    type: string
    tail: string
    category: string
    maxPassengers: number
    imageUrl?: string
  }
  price: {
    amount: number
    currency: string
  }
  flightDetails: {
    flightTimeMinutes: number
    distanceNm: number
    departureTime?: string
    arrivalTime?: string
    departureAirport?: string
    arrivalAirport?: string
  }
  status: 'unanswered' | 'quoted' | 'accepted' | 'declined' | 'expired'
  validUntil?: string
}

export interface QuoteDetailsDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean
  /** Callback to close the drawer */
  onClose: () => void
  /** Quote data to display */
  quote?: QuoteDetails
  /** Operator conversation messages */
  messages?: OperatorMessage[]
  /** Callback when user wants to send a message */
  onSendMessage?: (message: string) => void
  /** Callback when user accepts a quote */
  onAcceptQuote?: (quoteId: string) => void
}

/**
 * Format price with currency
 */
function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format flight duration from minutes
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Get status badge color based on status
 */
function getStatusBadge(status: QuoteDetails['status']) {
  switch (status) {
    case 'quoted':
      return <Badge className="bg-green-500 text-white">Quoted</Badge>
    case 'accepted':
      return <Badge className="bg-blue-500 text-white">Accepted</Badge>
    case 'declined':
      return <Badge variant="destructive">Declined</Badge>
    case 'expired':
      return <Badge variant="secondary">Expired</Badge>
    case 'unanswered':
    default:
      return <Badge variant="outline">Pending</Badge>
  }
}

/**
 * Get message type badge
 */
function getMessageTypeBadge(type: OperatorMessage['type']) {
  switch (type) {
    case 'REQUEST':
      return <Badge variant="outline" className="text-xs">Request</Badge>
    case 'RESPONSE':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Response</Badge>
    case 'CONFIRMATION':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">Confirmation</Badge>
    case 'INFO':
    default:
      return <Badge variant="secondary" className="text-xs">Info</Badge>
  }
}

/**
 * QuoteDetailsDrawer - Slide-in drawer from the right showing quote details and operator conversation
 */
export function QuoteDetailsDrawer({
  isOpen,
  onClose,
  quote,
  messages = [],
  onSendMessage,
  onAcceptQuote,
}: QuoteDetailsDrawerProps) {
  const [messageInput, setMessageInput] = useState('')

  const handleSendMessage = () => {
    if (messageInput.trim() && onSendMessage) {
      onSendMessage(messageInput.trim())
      setMessageInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "fixed right-0 top-0 h-full w-[500px] max-w-[90vw]",
          "rounded-none m-0 p-0 translate-x-0",
          "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          "border-l border-gray-200 dark:border-gray-700",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Quote Details
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        {quote ? (
          <>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {/* Operator Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Operator
                  </h3>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {quote.operator.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {quote.operator.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{quote.operator.rating}</span>
                        </div>
                      )}
                      {getStatusBadge(quote.status)}
                    </div>
                  </div>
                </div>

                {/* Aircraft Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Aircraft
                  </h3>
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-3">
                    {quote.aircraft.imageUrl ? (
                      <img
                        src={quote.aircraft.imageUrl}
                        alt={quote.aircraft.type}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <Plane className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {quote.aircraft.type}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Tail: {quote.aircraft.tail} | {quote.aircraft.category}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>Max {quote.aircraft.maxPassengers} passengers</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Price
                  </h3>
                  <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {formatPrice(quote.price.amount, quote.price.currency)}
                      </span>
                    </div>
                    {quote.validUntil && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Valid until {new Date(quote.validUntil).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Flight Details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Flight Details
                  </h3>
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Duration</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDuration(quote.flightDetails.flightTimeMinutes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">Distance</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {quote.flightDetails.distanceNm.toLocaleString()} NM
                      </span>
                    </div>
                    {quote.flightDetails.departureTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Departure</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {quote.flightDetails.departureTime}
                        </span>
                      </div>
                    )}
                    {quote.flightDetails.arrivalTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Arrival</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {quote.flightDetails.arrivalTime}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accept Quote Button */}
                {quote.status === 'quoted' && onAcceptQuote && (
                  <Button
                    onClick={() => onAcceptQuote(quote.id)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Accept Quote
                  </Button>
                )}

                {/* Operator Conversation */}
                {messages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Operator Conversation
                    </h3>
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getMessageTypeBadge(msg.type)}
                            {msg.sender && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {msg.sender}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {msg.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            {onSendMessage && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message to the operator..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No quote selected</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default QuoteDetailsDrawer
