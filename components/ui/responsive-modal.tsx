"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

// =============================================================================
// ResponsiveModal
// Desktop (>=768px): Centered dialog overlay
// Mobile (<768px): iOS-style bottom sheet drawer via Vaul
// =============================================================================

interface ResponsiveModalProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function ResponsiveModal({ children, open, onOpenChange }: ResponsiveModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
}

function ResponsiveModalTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DrawerTrigger className={className} {...props}>
        {children}
      </DrawerTrigger>
    )
  }

  return (
    <DialogTrigger className={className} {...props}>
      {children}
    </DialogTrigger>
  )
}

function ResponsiveModalClose({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DrawerClose className={className} {...props}>
        {children}
      </DrawerClose>
    )
  }

  return (
    <DialogClose className={className} {...props}>
      {children}
    </DialogClose>
  )
}

function ResponsiveModalContent({
  className,
  children,
  showCloseButton,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <DrawerContent className={cn("px-4 pb-6", className)} {...(props as any)}>
        {children}
      </DrawerContent>
    )
  }

  return (
    <DialogContent className={className} showCloseButton={showCloseButton} {...props}>
      {children}
    </DialogContent>
  )
}

function ResponsiveModalHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerHeader className={className} {...props} />
  }

  return <DialogHeader className={className} {...props} />
}

function ResponsiveModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerFooter className={className} {...props} />
  }

  return <DialogFooter className={className} {...props} />
}

function ResponsiveModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerTitle className={className} {...(props as any)} />
  }

  return <DialogTitle className={className} {...props} />
}

function ResponsiveModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <DrawerDescription className={className} {...(props as any)} />
  }

  return <DialogDescription className={className} {...props} />
}

export {
  ResponsiveModal,
  ResponsiveModalTrigger,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
}
