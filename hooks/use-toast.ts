/**
 * Toast Hook - Uses Sonner for toast notifications
 *
 * Provides toast notifications for chat events, workflow updates,
 * and user feedback throughout the application.
 */

import { toast as sonnerToast } from 'sonner'

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading'

export interface ToastOptions {
  title?: string
  description?: string
  type?: ToastType
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Show a toast notification
 */
export function toast(options: ToastOptions | string) {
  if (typeof options === 'string') {
    return sonnerToast(options)
  }

  const { title, description, type = 'info', duration, action } = options

  const toastOptions = {
    description,
    duration,
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
  }

  switch (type) {
    case 'success':
      return sonnerToast.success(title || 'Success', toastOptions)
    case 'error':
      return sonnerToast.error(title || 'Error', toastOptions)
    case 'warning':
      return sonnerToast.warning(title || 'Warning', toastOptions)
    case 'loading':
      return sonnerToast.loading(title || 'Loading...', toastOptions)
    case 'info':
    default:
      return sonnerToast.info(title || 'Info', toastOptions)
  }
}

/**
 * Dismiss a toast by ID
 */
export function dismissToast(toastId?: string | number) {
  if (toastId) {
    sonnerToast.dismiss(toastId)
  } else {
    sonnerToast.dismiss()
  }
}

/**
 * Pre-configured toast functions for common chat events
 */
export const chatToast = {
  /** Quote received from operator */
  quoteReceived: (operatorName: string, price?: string) => {
    toast({
      title: 'New Quote Received',
      description: price
        ? `${operatorName} submitted a quote for ${price}`
        : `${operatorName} submitted a quote`,
      type: 'success',
      duration: 5000,
    })
  },

  /** New message from operator */
  operatorMessage: (operatorName: string) => {
    toast({
      title: 'New Operator Message',
      description: `${operatorName} sent you a message`,
      type: 'info',
      duration: 4000,
    })
  },

  /** Trip created successfully */
  tripCreated: (tripId: string) => {
    toast({
      title: 'Trip Created',
      description: `Trip ${tripId} created. Open Avinode to select operators.`,
      type: 'success',
      duration: 5000,
    })
  },

  /** Workflow step completed */
  workflowStep: (stepName: string) => {
    toast({
      title: 'Progress Update',
      description: `${stepName} completed`,
      type: 'info',
      duration: 3000,
    })
  },

  /** Error occurred */
  error: (message: string) => {
    toast({
      title: 'Error',
      description: message,
      type: 'error',
      duration: 6000,
    })
  },

  /** Action required */
  actionRequired: (message: string, action?: { label: string; onClick: () => void }) => {
    toast({
      title: 'Action Required',
      description: message,
      type: 'warning',
      duration: 8000,
      action,
    })
  },

  /** Booking confirmed */
  bookingConfirmed: (flightDetails: string) => {
    toast({
      title: 'Booking Confirmed!',
      description: flightDetails,
      type: 'success',
      duration: 6000,
    })
  },

  /** Proposal ready */
  proposalReady: () => {
    toast({
      title: 'Proposal Ready',
      description: 'Your proposal has been generated and is ready to send',
      type: 'success',
      duration: 5000,
    })
  },

  /** Session saved */
  sessionSaved: () => {
    toast({
      title: 'Session Saved',
      description: 'Your conversation has been saved',
      type: 'success',
      duration: 2000,
    })
  },

  /** Connection status */
  connectionLost: () => {
    toast({
      title: 'Connection Lost',
      description: 'Attempting to reconnect...',
      type: 'warning',
      duration: 0, // Persist until dismissed
    })
  },

  connectionRestored: () => {
    toast({
      title: 'Connection Restored',
      description: 'You are back online',
      type: 'success',
      duration: 3000,
    })
  },
}

/**
 * Hook for using toast in components
 */
export const useToast = () => ({
  toast,
  dismissToast,
  chatToast,
})

export default useToast
