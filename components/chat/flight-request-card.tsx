"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckCircle, Clock, Loader2, FileText, MessageSquare, Trash2, MoreVertical, X, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import { AvinodeTripBadge } from "@/components/avinode-trip-badge"
import { FlightRequestStageBadge } from "@/components/flight-request-stage-badge"
import type { FlightRequestStage } from "@/components/flight-request-stage-badge"
import type { ChatSession } from "@/components/chat-sidebar"
import { formatDate } from "@/lib/utils/format"

/**
 * Workflow steps mapping for status icons
 */
const workflowSteps = {
  1: { title: "Understanding Request", icon: CheckCircle },
  2: { title: "Searching Aircraft", icon: Clock },
  3: { title: "Requesting Quotes", icon: Loader2 },
  4: { title: "Analyzing Options", icon: Clock },
  5: { title: "Proposal Ready", icon: FileText },
  6: { title: "Proposal Sent", icon: FileText },
  7: { title: "Contract Ready", icon: FileText },
  8: { title: "Contract Sent", icon: FileText },
  9: { title: "Payment Pending", icon: Clock },
  10: { title: "Closed Won", icon: CheckCircle },
}

interface FlightRequestCardProps {
  session: ChatSession
  isActive: boolean
  onClick: () => void
  onDelete?: (sessionId: string) => void
  onCancel?: (sessionId: string) => void
  onArchive?: (sessionId: string) => void
}

/**
 * FlightRequestCard Component
 * 
 * Displays a single flight request card in the chat sidebar.
 * Fixed width of 300px to fit within the 320px sidebar with padding.
 */
export const FlightRequestCard = React.memo(function FlightRequestCard({ session, isActive, onClick, onDelete, onCancel, onArchive }: FlightRequestCardProps) {

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  /**
   * Calculate if there are unread operator messages for this session
   * Unread messages are determined by comparing operatorMessages timestamps
   * with lastMessagesReadAt timestamps for each quote ID
   */
  const hasUnreadMessages = (): boolean => {
    if (!session.operatorMessages || Object.keys(session.operatorMessages).length === 0) {
      return false
    }

    // Check each quote ID for unread messages
    for (const [quoteId, messages] of Object.entries(session.operatorMessages)) {
      if (!messages || messages.length === 0) continue

      // Get the last read timestamp for this quote ID
      const lastReadAt = session.lastMessagesReadAt?.[quoteId]
      
      // If no lastReadAt timestamp, all messages are unread
      if (!lastReadAt) {
        return true
      }

      // Check if any message is newer than the last read timestamp
      const lastReadTime = new Date(lastReadAt).getTime()
      const hasUnread = messages.some((msg) => {
        const messageTime = new Date(msg.timestamp).getTime()
        return messageTime > lastReadTime
      })

      if (hasUnread) {
        return true
      }
    }

    return false
  }

  /**
   * Handle menu item clicks
   * Prevents event propagation to avoid triggering card onClick
   */
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card onClick from firing
  }

  /**
   * Handle cancel action
   */
  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCancelDialog(true)
  }

  /**
   * Confirm cancellation and call onCancel callback
   */
  const handleConfirmCancel = () => {
    if (onCancel) {
      onCancel(session.id)
    }
    setShowCancelDialog(false)
  }

  /**
   * Handle delete action
   */
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  /**
   * Confirm deletion and call onDelete callback
   */
  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(session.id)
    }
    setShowDeleteDialog(false)
  }

  /**
   * Handle archive action
   */
  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowArchiveDialog(true)
  }

  /**
   * Confirm archive and call onArchive callback
   */
  const handleConfirmArchive = () => {
    if (onArchive) {
      onArchive(session.id)
    }
    setShowArchiveDialog(false)
  }

  /**
   * Check if session can be archived (only when status is completed/booked)
   */
  const canArchive = (): boolean => {
    const inProgress = session.status === 'understanding_request' ||
                      session.status === 'searching_aircraft' ||
                      session.status === 'requesting_quotes' ||
                      session.status === 'analyzing_options';
    return !inProgress;
  }
  /**
   * Get workflow icon based on step and status
   */
  const getWorkflowIcon = (step: number, status: string) => {
    const IconComponent = workflowSteps[step as keyof typeof workflowSteps]?.icon || Clock
    const currentStep = getCurrentStepNumber(status)

    // Terminal status: all steps complete
    if (status === "closed_won") {
      return <CheckCircle className="w-4 h-4 text-success" />
    }

    if (step < currentStep) {
      return <CheckCircle className="w-4 h-4 text-success" />
    } else if (step === currentStep) {
      if (status === "requesting_quotes") {
        return <Loader2 className="w-4 h-4 text-status-processing animate-spin" />
      }
      return <Loader2 className="w-4 h-4 text-status-processing animate-spin" />
    } else {
      return <IconComponent className="w-4 h-4 text-status-pending" />
    }
  }

  /**
   * Get current step number from status
   */
  const getCurrentStepNumber = (status: string): number => {
    switch (status) {
      case "understanding_request":
        return 1
      case "searching_aircraft":
        return 2
      case "requesting_quotes":
        return 3
      case "analyzing_options":
        return 4
      case "proposal_ready":
        return 5
      case "proposal_sent":
        return 6
      case "contract_generated":
        return 7
      case "contract_sent":
        return 8
      case "payment_pending":
        return 9
      case "closed_won":
        return 10
      default:
        return 1
    }
  }

  /**
   * Get status badge for the current flight request/booking stage.
   * Uses FlightRequestStageBadge with tinted bg + dark text in matching hue.
   */
  const getStatusBadge = () => {
    const stage = session.status as FlightRequestStage
    const quoteLabel =
      session.status === "requesting_quotes"
        ? `Quotes ${session.quotesReceived || 0}/${session.quotesTotal || 5}`
        : undefined

    return <FlightRequestStageBadge stage={stage} label={quoteLabel} />
  }

  /**
   * Get conversation start time as human-readable string
   */
  const getLastActivity = (): string => {
    const startTimestamp = session.sessionStartedAt
      ? new Date(session.sessionStartedAt)
      : session.messages[0]?.timestamp

    if (!startTimestamp || Number.isNaN(startTimestamp.getTime())) return "Just now"

    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - startTimestamp.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return `${Math.floor(diffMinutes / 1440)}d ago`
  }

  /**
   * Generate a fallback title when generatedName is missing
   * Uses available session data to create a meaningful title
   */
  const getFallbackTitle = (): string => {
    // If we have a valid route, use it
    if (session.route && session.route !== 'Select route' && session.route.trim().length > 0) {
      return session.route;
    }

    // If we have a valid date, use it with passenger count
    if (session.date && session.date !== 'Select date' && session.date.trim().length > 0) {
      return `${session.passengers || 1} passenger${(session.passengers || 1) !== 1 ? 's' : ''} • ${session.date}`;
    }

    // If we have messages, try to extract a title from the first user message
    const firstUserMessage = session.messages?.find(msg => msg.type === 'user');
    if (firstUserMessage?.content) {
      const preview = firstUserMessage.content.substring(0, 40).trim();
      return preview.length < firstUserMessage.content.length ? `${preview}...` : preview;
    }

    // Last resort: generic title
    return 'New Flight Request';
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden w-full max-w-[300px] min-w-[260px] box-border py-0 gap-0",
        !isActive && "hover:bg-surface-secondary",
      )}
      style={isActive ? { backgroundColor: '#e6f7fc', borderColor: '#00a8e8', borderWidth: '3px' } : undefined}
      onClick={onClick}
    >
      <CardContent className="px-3! py-3! w-full box-border overflow-hidden">
        {/* Header with title and status badge */}
        <div className="flex items-start justify-between mb-2 min-w-0 w-full">
          <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
            {session.tripId ? (
              <div className="min-w-0 flex-1 overflow-hidden">
                <AvinodeTripBadge
                  tripId={session.tripId}
                  deepLink={session.deepLink}
                  size="sm"
                  className="max-w-full truncate"
                />
              </div>
            ) : (
              <h3 className="font-medium text-[clamp(0.75rem,1.5vw,0.875rem)] text-foreground truncate min-w-0 flex-1">
                {session.generatedName || getFallbackTitle()}
              </h3>
            )}
          </div>
          {/* Status Badge - show when we have tripId or route data */}
          {(session.tripId || (session.route && session.route !== 'Select route')) && (
            <div className="shrink-0 ml-2 max-w-fit">{getStatusBadge()}</div>
          )}
        </div>

        {/* Route and passenger info - show if we have route data OR tripId */}
        {(session.tripId || (session.route && session.route !== 'Select route')) && (
          <div className="space-y-1 mb-2 min-w-0 w-full overflow-hidden">
            <p className="text-[clamp(0.6875rem,1.5vw,0.75rem)] text-muted-foreground truncate">{session.tripType === 'round_trip' ? session.route?.replace(' → ', ' ⇄ ') : session.route}</p>
            <p className="text-[clamp(0.6875rem,1.5vw,0.75rem)] text-muted-foreground truncate">
              {session.passengers} passenger{session.passengers !== 1 ? 's' : ''} • {(() => {
                // Format ISO date (YYYY-MM-DD) or formatted date string for display
                try {
                  return formatDate(session.date)
                } catch {
                  // If parsing fails, use as-is (might already be formatted)
                }
                return session.date
              })()}
            </p>
            {session.aircraft && session.operator && (
              <p className="text-xs text-success truncate">
                {session.aircraft} • {session.operator}
              </p>
            )}
          </div>
        )}

        {/* Workflow Status - show when we have tripId or route data */}
        {(session.tripId || (session.route && session.route !== 'Select route')) && (
          <div className="flex items-center justify-between min-w-0 w-full">
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1 overflow-hidden">
              <span className="text-[clamp(0.6875rem,1.5vw,0.75rem)] text-muted-foreground truncate">
                {workflowSteps[session.currentStep as keyof typeof workflowSteps]?.title}
              </span>
            </div>
            {/* Timestamp */}
            <span className="text-[clamp(0.6875rem,1.5vw,0.75rem)] text-text-placeholder shrink-0 ml-2">{getLastActivity()}</span>
          </div>
        )}

        {/* Progress Bar - show when we have tripId or route data */}
        {(session.tripId || (session.route && session.route !== 'Select route')) && (
          <div className="w-full bg-muted rounded-full h-1 mt-2">
            <div
              className="h-1 rounded-full transition-all duration-300 bg-primary"
              style={{
                width: `${Math.min((session.currentStep / session.totalSteps) * 100, 100)}%`,
              }}
            />
          </div>
        )}

        {/* Footer with RFQ badge and actions menu */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          {/* RFQ Badge with message icon and count (left side) */}
          {(session.tripId || (session.rfqFlights && session.rfqFlights.length > 0)) && (
            <div className="relative inline-flex items-center">
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 px-2 py-1 h-6 text-xs font-medium bg-surface-secondary border-border"
              >
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">
                  {(() => {
                    /**
                     * Count RFQs that have responded (status === 'quoted')
                     * Only operators who have submitted a quote are counted as "responded"
                     * 
                     * If rfqFlights is not loaded yet but tripId exists, show 0
                     * This is expected until RFQs are fetched when the chat becomes active
                     */
                    const totalCount = session.rfqFlights?.length || 0
                    const respondedCount = session.rfqFlights?.filter(
                      (rfq) => rfq.rfqStatus === 'quoted' || (rfq.totalPrice && rfq.totalPrice > 0)
                    ).length || 0
                    
                    // Show responded count (primary) / total count (if available)
                    if (totalCount > 0) {
                      return `${respondedCount}/${totalCount} RFQ${totalCount !== 1 ? 's' : ''}`
                    }
                    
                    // If no RFQs loaded yet but tripId exists, show 0
                    return `${respondedCount} RFQ${respondedCount !== 1 ? 's' : ''}`
                  })()}
                </span>
              </Badge>
              {/* Red dot indicator for new messages from operators - positioned at top right of badge */}
              {hasUnreadMessages() && (
                <span
                  className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background z-10"
                  aria-label="New messages from operators"
                  title="New messages from flight operators"
                />
              )}
            </div>
          )}
          {/* Actions menu (right side) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleMenuClick}
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Cancel option - show if tripId exists or has active RFQ */}
              {(session.tripId || (session.rfqFlights && session.rfqFlights.length > 0)) && (
                <>
                  <DropdownMenuItem
                    onClick={handleCancelClick}
                    className="cursor-pointer"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel RFQ
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {/* Archive option - only show if status is completed/booked */}
              {canArchive() && (
                <>
                  <DropdownMenuItem
                    onClick={handleArchiveClick}
                    className="cursor-pointer"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Delete option - always available */}
              <DropdownMenuItem
                onClick={handleDeleteClick}
                variant="destructive"
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>

      {/* Cancel confirmation dialog */}
      <ResponsiveModal open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <ResponsiveModalContent className="sm:max-w-md">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Cancel RFQ</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Are you sure you want to cancel this RFQ? This will notify all operators and close the request for quotes.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="min-h-[44px] md:min-h-0"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmCancel}
              className="min-h-[44px] md:min-h-0"
            >
              Cancel RFQ
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      {/* Delete confirmation dialog */}
      <ResponsiveModal open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ResponsiveModalContent className="sm:max-w-md">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete Chat Session</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Are you sure you want to delete this chat session? This action cannot be undone.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="min-h-[44px] md:min-h-0"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="min-h-[44px] md:min-h-0"
            >
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      {/* Archive confirmation dialog */}
      <ResponsiveModal open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <ResponsiveModalContent className="sm:max-w-md">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Archive Chat Session</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Are you sure you want to archive this chat session? Archived sessions are saved for reference but will be moved out of your active chats.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              className="min-h-[44px] md:min-h-0"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmArchive}
              className="min-h-[44px] md:min-h-0"
            >
              Archive
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render when visible data changes
  const p = prevProps.session
  const n = nextProps.session
  return (
    p.id === n.id &&
    p.status === n.status &&
    p.currentStep === n.currentStep &&
    p.rfqFlights?.length === n.rfqFlights?.length &&
    p.quotesReceived === n.quotesReceived &&
    p.quotesTotal === n.quotesTotal &&
    p.rfqsLastFetchedAt === n.rfqsLastFetchedAt &&
    p.route === n.route &&
    p.date === n.date &&
    p.passengers === n.passengers &&
    p.generatedName === n.generatedName &&
    p.aircraft === n.aircraft &&
    p.operator === n.operator &&
    p.tripId === n.tripId &&
    p.deepLink === n.deepLink &&
    p.operatorMessages === n.operatorMessages &&
    p.lastMessagesReadAt === n.lastMessagesReadAt &&
    prevProps.isActive === nextProps.isActive
  )
})
