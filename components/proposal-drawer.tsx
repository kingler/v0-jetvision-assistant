"use client"

/**
 * Proposal Drawer Component
 *
 * A slide-in drawer that allows generating, previewing, and sending
 * flight proposals to customers. Used in the RFQ workflow when a user
 * selects a flight and wants to create a proposal.
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  X,
  Send,
  Download,
  FileText,
  Plane,
  Calendar,
  Users,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast, chatToast } from "@/hooks/use-toast"
import type { RFQFlight } from "./avinode/rfq-flight-card"

// =============================================================================
// TYPES
// =============================================================================

export interface ProposalCustomer {
  name: string
  email: string
  company?: string
  phone?: string
}

export interface ProposalTripDetails {
  departureAirport: {
    icao: string
    name?: string
    city?: string
  }
  arrivalAirport: {
    icao: string
    name?: string
    city?: string
  }
  departureDate: string
  departureTime?: string
  passengers: number
  tripId?: string
}

export interface ProposalPricing {
  subtotal: number
  jetvisionFee: number
  taxes: number
  total: number
  currency: string
}

export interface GeneratedProposal {
  proposalId: string
  fileName: string
  pdfBase64: string
  generatedAt: string
  pricing: ProposalPricing
}

export interface ProposalDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean
  /** Callback to close the drawer */
  onClose: () => void
  /** Selected flight data */
  flight?: RFQFlight
  /** Customer information */
  customer?: ProposalCustomer
  /** Trip details */
  tripDetails?: ProposalTripDetails
  /** Callback when proposal is successfully sent */
  onProposalSent?: (proposalId: string) => void
}

// =============================================================================
// HELPERS
// =============================================================================

function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProposalDrawer({
  isOpen,
  onClose,
  flight,
  customer: initialCustomer,
  tripDetails,
  onProposalSent,
}: ProposalDrawerProps) {
  // State
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [proposal, setProposal] = useState<GeneratedProposal | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Customer form state (editable)
  const [customer, setCustomer] = useState<ProposalCustomer>({
    name: initialCustomer?.name || '',
    email: initialCustomer?.email || '',
    company: initialCustomer?.company || '',
    phone: initialCustomer?.phone || '',
  })

  // Email customization
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')

  // Reset state when drawer opens with new flight
  useEffect(() => {
    if (isOpen && flight) {
      setProposal(null)
      setError(null)
      setCustomer({
        name: initialCustomer?.name || '',
        email: initialCustomer?.email || '',
        company: initialCustomer?.company || '',
        phone: initialCustomer?.phone || '',
      })
      // Set default email subject
      if (tripDetails) {
        setEmailSubject(`Flight Proposal: ${tripDetails.departureAirport.icao} → ${tripDetails.arrivalAirport.icao}`)
      }
      setEmailMessage('')
    }
    // Note: We intentionally only depend on flight.id (not the full flight object)
    // to avoid unnecessary resets when other flight properties change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flight?.id, initialCustomer, tripDetails])

  /**
   * Generate the proposal PDF
   */
  const handleGenerateProposal = async () => {
    if (!flight || !tripDetails) {
      setError('Missing flight or trip details')
      return
    }

    if (!customer.name || !customer.email) {
      setError('Customer name and email are required')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          tripDetails: {
            ...tripDetails,
            passengers: tripDetails.passengers || 1,
          },
          selectedFlights: [flight],
          jetvisionFeePercentage: 10,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate proposal')
      }

      setProposal({
        proposalId: data.proposalId,
        fileName: data.fileName,
        pdfBase64: data.pdfBase64,
        generatedAt: data.generatedAt,
        pricing: data.pricing,
      })

      chatToast.proposalReady()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate proposal'
      setError(message)
      chatToast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Send the proposal via email
   */
  const handleSendProposal = async () => {
    if (!flight || !tripDetails || !proposal) {
      setError('No proposal to send')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch('/api/proposal/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          tripDetails: {
            ...tripDetails,
            passengers: tripDetails.passengers || 1,
          },
          selectedFlights: [flight],
          jetvisionFeePercentage: 10,
          emailSubject: emailSubject || undefined,
          emailMessage: emailMessage || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send proposal')
      }

      toast({
        title: 'Proposal Sent!',
        description: `Email sent to ${customer.email}`,
        type: 'success',
        duration: 5000,
      })

      onProposalSent?.(data.proposalId)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send proposal'
      setError(message)
      chatToast.error(message)
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Download the PDF
   */
  const handleDownloadPdf = () => {
    if (!proposal?.pdfBase64) return

    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${proposal.pdfBase64}`
    link.download = proposal.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Preview PDF in new tab
   */
  const handlePreviewPdf = () => {
    if (!proposal?.pdfBase64) return

    const pdfBlob = new Blob(
      [Uint8Array.from(atob(proposal.pdfBase64), c => c.charCodeAt(0))],
      { type: 'application/pdf' }
    )
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "fixed right-0 top-0 h-full w-[550px] max-w-[95vw]",
          "rounded-none m-0 p-0 translate-x-0",
          "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          "border-l border-gray-200 dark:border-gray-700",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Generate Proposal
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create and send a proposal to your customer
                </p>
              </div>
            </div>
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
        <ScrollArea className="flex-1 p-6">
          {flight ? (
            <div className="space-y-6">
              {/* Flight Summary */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Selected Flight
                </h3>
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{flight.aircraftType}</span>
                    </div>
                    <Badge variant="outline">{flight.operatorName}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{tripDetails?.departureDate ? formatDate(tripDetails.departureDate) : 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{tripDetails?.passengers || 1} passengers</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{flight.departureAirport?.icao || tripDetails?.departureAirport?.icao}</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium">{flight.arrivalAirport?.icao || tripDetails?.arrivalAirport?.icao}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500">Price</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatPrice(flight.totalPrice, flight.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Customer Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Customer Information
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-name">Name *</Label>
                      <Input
                        id="customer-name"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="Customer name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-email">Email *</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="customer@email.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-company">Company</Label>
                      <Input
                        id="customer-company"
                        value={customer.company || ''}
                        onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                        placeholder="Company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-phone">Phone</Label>
                      <Input
                        id="customer-phone"
                        type="tel"
                        value={customer.phone || ''}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Generated Proposal Preview */}
              {proposal ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Generated Proposal
                    </h3>
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span>{formatPrice(proposal.pricing.subtotal, proposal.pricing.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Jetvision Fee</span>
                      <span>{formatPrice(proposal.pricing.jetvisionFee, proposal.pricing.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Taxes & Fees</span>
                      <span>{formatPrice(proposal.pricing.taxes, proposal.pricing.currency)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold text-blue-600">
                        {formatPrice(proposal.pricing.total, proposal.pricing.currency)}
                      </span>
                    </div>
                  </div>

                  {/* PDF Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewPdf}
                      className="flex-1"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Preview PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  {/* Email Customization */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Email Message (Optional)
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="email-subject">Subject</Label>
                      <Input
                        id="email-subject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Flight Proposal: TETERBORO → MIAMI"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-message">Personal Message</Label>
                      <Textarea
                        id="email-message"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Add a personal note to your customer..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Generate Proposal Button
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Generate a professional proposal PDF for your customer
                  </p>
                  <Button
                    onClick={handleGenerateProposal}
                    disabled={isGenerating || !customer.name || !customer.email}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Proposal
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No flight selected</p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        {proposal && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <Button
              onClick={handleSendProposal}
              disabled={isSending || !customer.email}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Proposal to {customer.name || 'Customer'}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ProposalDrawer
