"use client"

import { useState } from "react"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageSquare, Trash2, MoreVertical, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatSession } from "@/components/chat-sidebar"

interface GeneralChatCardProps {
  session: ChatSession
  isActive: boolean
  onClick: () => void
  onDelete?: (sessionId: string) => void
  onArchive?: (sessionId: string) => void
}

/**
 * GeneralChatCard Component
 *
 * Simplified card for general chat conversations (not tied to a specific flight request).
 * Shows conversation title, last message preview, and timestamp.
 * Fixed width of 300px to fit within the 320px sidebar with padding.
 */
export function GeneralChatCard({ session, isActive, onClick, onDelete, onArchive }: GeneralChatCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  /**
   * Handle menu item clicks
   * Prevents event propagation to avoid triggering card onClick
   */
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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
   * Get conversation title
   * Prioritizes generatedName (from conversation.subject), then first message preview, then default title
   * This ensures the title is dynamic from the start without requiring a click to load messages
   */
  const getTitle = (): string => {
    // First, check if generatedName is available (from conversation.subject in chat-session-to-ui.ts)
    // This should be available immediately when the session is loaded
    if (session.generatedName) {
      return session.generatedName
    }
    
    // Fall back to first message preview if messages are loaded
    const firstMessage = session.messages[0]
    if (firstMessage?.content) {
      // Truncate to first 40 chars
      const preview = firstMessage.content.substring(0, 40)
      return preview.length < firstMessage.content.length ? `${preview}...` : preview
    }
    
    // Default fallback
    return "General Chat"
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
   * Get message count
   */
  const getMessageCount = (): number => {
    return session.messages.length
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden w-full max-w-[300px] min-w-[260px] box-border py-0 gap-0",
        isActive
          ? "ring-2 ring-active-ring bg-active-bg"
          : "hover:bg-surface-secondary",
      )}
      onClick={onClick}
    >
      <CardContent className="!px-3 !py-3 w-full box-border overflow-hidden">
        {/* Header with title and actions */}
        <div className="flex items-start justify-between mb-2 min-w-0 w-full">
          <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
            <MessageSquare className="w-4 h-4 text-text-placeholder shrink-0" />
            <h3 className="font-medium text-xs sm:text-sm text-foreground truncate min-w-0 flex-1">
              {getTitle()}
            </h3>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-text-placeholder hover:text-muted-foreground shrink-0"
                onClick={handleMenuClick}
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={handleArchiveClick}
                className="cursor-pointer"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteClick}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer with message count and timestamp */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {getMessageCount()} message{getMessageCount() !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-text-placeholder">{getLastActivity()}</span>
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
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
            <DialogTitle>Archive Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this chat? It will be moved out of your active conversations.
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
