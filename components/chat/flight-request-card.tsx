"use client"

import { useState } from "react"
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
export function FlightRequestCard({ session, isActive, onClick, onDelete, onCancel, onArchive }: FlightRequestCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  /**
   * Calculate if there are unread messages for this session
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
    // Can archive only when NOT in progress
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

    if (status === "proposal_ready" && step <= 5) {
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
        return 5
      default:
        return 1
    }
  }

  /**
   * Get status badge component
   */
  const getStatusBadge = () => {
    if (session.status === "proposal_ready") {
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
   * Get last activity time as human-readable string
   */
  const getLastActivity = (): string => {
    const lastMessage = session.messages[session.messages.length - 1]
    if (!lastMessage) return "Just now"

    const now = new Date()
    const messageTime = new Date(lastMessage.timestamp)
    const diffMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return `${Math.floor(diffMinutes / 1440)}d ago`
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
                Flight Request #{session.id}
              </h3>
            )}
          </div>
          <div className="shrink-0 ml-2 max-w-fit">{getStatusBadge()}</div>
        </div>

        {/* Route and passenger info */}
        <div className="space-y-1 mb-2 min-w-0 w-full overflow-hidden">
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{session.route}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {session.passengers} passengers • {session.date}
          </p>
          {session.aircraft && session.operator && (
            <p className="text-xs text-green-600 dark:text-green-400 truncate">
              {session.aircraft} • {session.operator}
            </p>
          )}
        </div>

        {/* Workflow Status */}
        <div className="flex items-center justify-between min-w-0 w-full">
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1 overflow-hidden">
            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
              {workflowSteps[session.currentStep as keyof typeof workflowSteps]?.title}
            </span>
          </div>
          <span className="text-xs text-gray-400 shrink-0 ml-2">{getLastActivity()}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
          <div
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              session.status === "proposal_ready" ? "bg-green-500" : "bg-cyan-500",
            )}
            style={{
              width: `${Math.min((session.currentStep / session.totalSteps) * 100, 100)}%`,
            }}
          />
        </div>

        {/* Footer with RFQ badge and actions menu */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {/* RFQ Badge with message icon and count (left side) */}
          {session.tripId && (
            <div className="relative inline-flex items-center">
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 px-2 py-1 h-6 text-xs font-medium bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                <MessageSquare className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {session.rfqFlights?.length || 0} RFQ{(session.rfqFlights?.length || 0) !== 1 ? 's' : ''}
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
          {/* Fallback: Simple message indicator when no trip ID */}
          {!session.tripId && (
            <div className="relative flex items-center">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              {hasUnreadMessages() && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
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
              {/* Cancel option - only show if tripId exists (has active RFQ) */}
              {session.tripId && (
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
}
