"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  5: { title: "Generating Proposal", icon: FileText },
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
  if (process.env.NODE_ENV === 'development') {
    console.log('[FlightRequestCard] render:', {
      id: session.id,
      status: session.status,
      rfqFlights: session.rfqFlights?.length || 0,
      quotesReceived: session.quotesReceived,
      isActive,
    })
  }

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
    // Can archive when status is terminal (proposal_ready, proposal_sent)
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

    if ((status === "proposal_ready" || status === "proposal_sent") && step <= 5) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    } else if (status === "requesting_quotes" && step === 3) {
      return <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
    } else if (step < getCurrentStepNumber(status)) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    } else if (step === getCurrentStepNumber(status)) {
      return <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
    } else {
      return <IconComponent className="w-4 h-4 text-gray-400" />
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
      case "proposal_sent":
        return 5
      default:
        return 1
    }
  }

  /**
   * Get status badge component
   */
  const getStatusBadge = () => {
    if (session.status === "proposal_sent") {
      return (
        <Badge variant="default" className="bg-blue-500 text-xs">
          Proposal Sent
        </Badge>
      )
    } else if (session.status === "proposal_ready") {
      return (
        <Badge variant="default" className="bg-green-500 text-xs">
          Proposal Ready
        </Badge>
      )
    } else if (session.status === "requesting_quotes") {
      return (
        <Badge variant="default" className="bg-cyan-500 text-xs">
          Quotes {session.quotesReceived || 0}/{session.quotesTotal || 5}
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-400 text-white text-xs">
          Pending
        </Badge>
      )
    }
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
        "cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden w-[300px] box-border py-0 gap-0",
        isActive
          ? "ring-2 ring-cyan-500 bg-cyan-50 dark:bg-cyan-950"
          : "hover:bg-gray-50 dark:hover:bg-gray-800",
      )}
      onClick={onClick}
    >
      <CardContent className="!px-3 !py-3 w-full box-border overflow-hidden">
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
              <h3 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate min-w-0 flex-1">
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
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{session.route}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
              <p className="text-xs text-green-600 dark:text-green-400 truncate">
                {session.aircraft} • {session.operator}
              </p>
            )}
          </div>
        )}

        {/* Workflow Status - show when we have tripId or route data */}
        {(session.tripId || (session.route && session.route !== 'Select route')) && (
          <div className="flex items-center justify-between min-w-0 w-full">
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1 overflow-hidden">
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                {workflowSteps[session.currentStep as keyof typeof workflowSteps]?.title}
              </span>
            </div>
            {/* Timestamp */}
            <span className="text-xs text-gray-400 shrink-0 ml-2">{getLastActivity()}</span>
          </div>
        )}

        {/* Progress Bar - show when we have tripId or route data */}
        {(session.tripId || (session.route && session.route !== 'Select route')) && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
            <div
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                session.status === "proposal_sent" ? "bg-blue-500" : session.status === "proposal_ready" ? "bg-green-500" : "bg-cyan-500",
              )}
              style={{
                width: `${Math.min((session.currentStep / session.totalSteps) * 100, 100)}%`,
              }}
            />
          </div>
        )}

        {/* Footer with RFQ badge and actions menu */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {/* RFQ Badge with message icon and count (left side) */}
          {(session.tripId || (session.rfqFlights && session.rfqFlights.length > 0)) && (
            <div className="relative inline-flex items-center">
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 px-2 py-1 h-6 text-xs font-medium bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                <MessageSquare className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
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
                      (rfq) => rfq.rfqStatus === 'quoted'
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
                  className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 z-10"
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
                className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel RFQ</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this RFQ? This will notify all operators and close the request for quotes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmCancel}
            >
              Cancel RFQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Chat Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this chat session? Archived sessions are saved for reference but will be moved out of your active chats.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmArchive}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
