"use client"

import { useMemo, useState } from "react"
import { ChatKit, useChatKit } from "@openai/chatkit-react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type WorkflowAction = {
  type: string
  payload?: Record<string, unknown>
}

interface ChatKitWidgetProps {
  sessionId: string
  metadata?: {
    route?: string
    date?: string
    passengers?: number
    status?: string
  }
  onWorkflowAction?: (action: WorkflowAction) => Promise<void> | void
  className?: string
}

const chatkitEnabled = process.env.NEXT_PUBLIC_CHATKIT_ENABLED !== "false"

export function ChatKitWidget({ sessionId, metadata, onWorkflowAction, className }: ChatKitWidgetProps) {
  const [error, setError] = useState<string | null>(null)

  const sessionMetadata = useMemo(
    () => ({
      ...metadata,
      flightRequestId: sessionId,
    }),
    [metadata, sessionId],
  )

  // Initialize ChatKit hook BEFORE any conditional returns (React Rules of Hooks)
  const { control } = useChatKit({
    api: {
      async getClientSecret(existingClientSecret) {
        try {
          const response = await fetch("/api/chatkit/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user: sessionId,
              existingClientSecret,
              metadata: sessionMetadata,
            }),
          })

          if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({})) as { error?: string };
            const message =
              typeof errorPayload?.error === "string"
                ? errorPayload.error
                : `ChatKit session request failed (${response.status})`
            throw new Error(message)
          }

          const data = await response.json() as { client_secret: string };
          setError(null)
          return data.client_secret as string
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unable to initialize ChatKit session"
          setError(message)
          if (existingClientSecret) {
            return existingClientSecret
          }
          throw err instanceof Error ? err : new Error(message)
        }
      },
    },
    theme: {
      colorScheme: "dark",
      radius: "soft",
      density: "normal",
      color: {
        accent: {
          primary: "#0891b2",
          level: 2,
        },
      },
    },
    header: {
      enabled: true,
      title: {
        text: "JetVision Concierge Assistant",
      },
    },
    history: {
      enabled: true,
      showDelete: false,
      showRename: true,
    },
    startScreen: {
      greeting: "How can JetVision help with this flight?",
      prompts: [
        { title: "Review routing & timing" },
        { title: "Request updated quotes" },
        { title: "Finalize booking checklist" },
      ],
    },
    disclaimer: {
      text: "ChatKit is connected to JetVision's private jet search, quote, and booking workflow.",
      highContrast: false,
    },
    widgets: onWorkflowAction
      ? {
          async onAction(action, widgetItem) {
            await onWorkflowAction({
              type: action.type,
              payload: {
                ...action.payload,
                widgetId: widgetItem.id,
              },
            })
          },
        }
      : undefined,
    onError(detail) {
      const message = detail?.error?.message ?? "ChatKit encountered an unexpected error."
      setError(message)
    },
  })

  return (
    <div className={cn("relative flex h-full min-h-[320px] flex-col gap-3", className)}>
      {error && (
        <div className="flex items-start space-x-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">ChatKit unavailable</p>
            <p className="text-xs text-red-200">
              {error}. Verify ChatKit environment variables and the session token API route.
            </p>
          </div>
        </div>
      )}
      <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-800 bg-black/60">
        {!error ? (
          <ChatKit control={control} className="h-full w-full" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center space-y-3 text-gray-300">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-xs text-gray-400 text-center">
              Provide a valid ChatKit session endpoint to render the assistant.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
