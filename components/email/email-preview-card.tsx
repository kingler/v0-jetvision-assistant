"use client"

import React, { useState, useCallback } from "react"
import {
  Mail,
  Send,
  Edit3,
  X,
  Paperclip,
  FileText,
  AlertCircle,
  Check,
  Loader2,
  RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

/**
 * EmailPreviewCard Component
 *
 * Displays a proposal email preview with inline editing capabilities.
 * Part of the human-in-the-loop email approval workflow.
 *
 * Features:
 * - Display recipient, subject, body with inline editing
 * - Show attachments with preview links
 * - "Edit Email" toggles edit mode
 * - "Send Email" button with loading state
 * - Error display with retry option
 * - Dark mode support
 */

export interface EmailPreviewCardProps {
  /** Proposal ID */
  proposalId: string
  /** Proposal number for display */
  proposalNumber?: string
  /** Recipient information */
  to: {
    email: string
    name: string
  }
  /** Email subject */
  subject: string
  /** Email body (plain text) */
  body: string
  /** Attachments */
  attachments: Array<{
    name: string
    url: string
    size?: number
    type?: string
  }>
  /** Flight details for context */
  flightDetails?: {
    departureAirport: string
    arrivalAirport: string
    departureDate: string
    passengers?: number
    /** Trip type for multi-leg display */
    tripType?: 'one_way' | 'round_trip' | 'multi_city'
    /** Return date for round-trip */
    returnDate?: string
    /** Segments for multi-city trips */
    segments?: Array<{
      departureAirport: string
      arrivalAirport: string
      date: string
    }>
  }
  /** Pricing information */
  pricing?: {
    subtotal: number
    total: number
    currency: string
  }
  /** Current status */
  status: 'draft' | 'sending' | 'sent' | 'error'
  /** Callback when field is edited */
  onEdit?: (field: 'subject' | 'body', value: string) => void
  /** Callback when send is clicked */
  onSend?: () => Promise<void>
  /** Callback when cancel is clicked */
  onCancel?: () => void
  /** Error message */
  error?: string
  /** When the draft was generated */
  generatedAt?: string
  /** Request ID for context */
  requestId?: string
}

/**
 * Format file size for display
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Strip HTML tags for plain text display, preserving line breaks
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function EmailPreviewCard({
  proposalId,
  proposalNumber,
  to,
  subject: initialSubject,
  body: initialBody,
  attachments,
  flightDetails,
  pricing,
  status,
  onEdit,
  onSend,
  onCancel,
  error,
  generatedAt,
}: EmailPreviewCardProps) {
  // Strip any legacy HTML from body for consistent plain text handling
  const cleanInitialBody = stripHtml(initialBody)

  // State
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState(initialSubject)
  const [editedBody, setEditedBody] = useState(cleanInitialBody)
  const [isSending, setIsSending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Computed values
  const displaySubject = isEditing ? editedSubject : initialSubject
  const displayBody = isEditing ? editedBody : cleanInitialBody
  const hasChanges = editedSubject !== initialSubject || editedBody !== cleanInitialBody
  const currentError = error || localError

  /**
   * Handle edit mode toggle
   */
  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      // Save changes when exiting edit mode
      if (hasChanges) {
        onEdit?.('subject', editedSubject)
        onEdit?.('body', editedBody)
      }
    }
    setIsEditing(!isEditing)
  }, [isEditing, hasChanges, editedSubject, editedBody, onEdit])

  /**
   * Handle discard changes
   */
  const handleDiscardChanges = useCallback(() => {
    setEditedSubject(initialSubject)
    setEditedBody(cleanInitialBody)
    setIsEditing(false)
  }, [initialSubject, cleanInitialBody])

  /**
   * Handle send email
   */
  const handleSend = useCallback(async () => {
    if (!onSend) return

    setIsSending(true)
    setLocalError(null)

    try {
      // Save any pending edits before sending
      if (hasChanges) {
        onEdit?.('subject', editedSubject)
        onEdit?.('body', editedBody)
      }
      await onSend()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email'
      setLocalError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }, [onSend, hasChanges, onEdit, editedSubject, editedBody])

  /**
   * Handle attachment click
   */
  const handleAttachmentClick = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  /**
   * Render status badge
   */
  const renderStatusBadge = () => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <Edit3 className="h-3 w-3" />
            Pending Approval
          </span>
        )
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sending...
          </span>
        )
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <Check className="h-3 w-3" />
            Sent
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        )
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold text-foreground">
              Review Email Before Sending
            </CardTitle>
          </div>
          {renderStatusBadge()}
        </div>
        {proposalNumber && (
          <p className="text-sm text-muted-foreground mt-1">
            Proposal: {proposalNumber}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recipient */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            To
          </Label>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">
              {to.name}
            </span>
            <span className="text-muted-foreground">
              &lt;{to.email}&gt;
            </span>
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Subject
          </Label>
          {isEditing ? (
            <Input
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="text-sm"
              placeholder="Email subject..."
            />
          ) : (
            <p className="text-sm font-medium text-foreground bg-muted rounded px-3 py-2">
              {displaySubject}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Message
          </Label>
          {isEditing ? (
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="text-sm min-h-[200px] font-mono"
              placeholder="Email body..."
            />
          ) : (
            <div className="text-sm text-foreground bg-muted rounded px-3 py-3 max-h-[300px] overflow-y-auto whitespace-pre-wrap">
              {displayBody}
            </div>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Attachments
            </Label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <button
                  key={`${attachment.name}-${index}`}
                  onClick={() => handleAttachmentClick(attachment.url)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  {attachment.type?.includes('pdf') ? (
                    <FileText className="h-4 w-4 text-red-500" />
                  ) : (
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-foreground">
                    {attachment.name}
                  </span>
                  {attachment.size && (
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(attachment.size)})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Flight Details Summary */}
        {flightDetails && (
          <div className="bg-muted rounded-lg p-3 border border-border">
            {flightDetails.tripType === 'multi_city' && flightDetails.segments && flightDetails.segments.length > 0 ? (
              // Multi-city: show each segment
              <div className="space-y-1.5 text-sm">
                {flightDetails.segments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-primary font-medium w-10 shrink-0">
                      Leg {i + 1}
                    </span>
                    <span className="text-primary font-medium">
                      {seg.departureAirport}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary font-medium">
                      {seg.arrivalAirport}
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-foreground">{seg.date}</span>
                  </div>
                ))}
                {flightDetails.passengers && (
                  <div className="text-foreground pt-1">
                    {flightDetails.passengers} passenger{flightDetails.passengers !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ) : (
              // One-way / round-trip
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div>
                  <span className="text-primary font-medium">
                    {flightDetails.departureAirport}
                  </span>
                  <span className="text-muted-foreground mx-2">
                    {flightDetails.tripType === 'round_trip' ? '⇄' : '→'}
                  </span>
                  <span className="text-primary font-medium">
                    {flightDetails.arrivalAirport}
                  </span>
                </div>
                <span className="text-muted-foreground">|</span>
                <span className="text-foreground">
                  {flightDetails.departureDate}
                </span>
                {flightDetails.tripType === 'round_trip' && flightDetails.returnDate && (
                  <>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-foreground">
                      {flightDetails.returnDate}
                    </span>
                  </>
                )}
                {flightDetails.passengers && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-foreground">
                      {flightDetails.passengers} passenger{flightDetails.passengers !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pricing Summary */}
        {pricing && (
          <div className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2">
            <span className="text-muted-foreground">Total Price</span>
            <span className="font-semibold text-foreground">
              {pricing.currency} {pricing.total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}

        {/* Error Display */}
        {currentError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-300">{currentError}</p>
              <button
                onClick={handleSend}
                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {status !== 'sent' && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardChanges}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Discard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleEdit}
                    disabled={!hasChanges}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleEdit}
                  disabled={status === 'sending'}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit Email
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSending || status === 'sending'}
                >
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSending || status === 'sending' || isEditing}
                className="bg-black dark:bg-gray-900 hover:bg-gray-800 dark:hover:bg-gray-800 text-white"
              >
                {isSending || status === 'sending' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Generated timestamp */}
        {generatedAt && (
          <p className="text-xs text-muted-foreground text-right">
            Draft generated {new Date(generatedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default EmailPreviewCard
