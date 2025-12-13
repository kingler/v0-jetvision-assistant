/**
 * ChatKit Interface Component
 *
 * Embeddable chat UI for agentic experiences powered by OpenAI ChatKit.
 * Uses CDN approach as @openai/chatkit-react package is not yet published.
 *
 * @see docs/GPT5_CHATKIT_INTEGRATION.md for setup guide
 */

'use client'

import { useEffect, useState, useRef } from 'react'

interface ChatKitInterfaceProps {
  className?: string
  theme?: {
    primaryColor?: string
    backgroundColor?: string
    textColor?: string
    borderRadius?: string
  }
}

/**
 * ChatKitInterface Component
 *
 * IMPORTANT: This component requires the ChatKit script to be loaded.
 * Add this to your app/layout.tsx:
 *
 * ```tsx
 * <script
 *   src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
 *   async
 * ></script>
 * ```
 *
 * Also requires CHATKIT_WORKFLOW_ID to be set in .env.local
 */
export function ChatKitInterface({
  className = '',
  theme,
}: ChatKitInterfaceProps) {
  const [deviceId, setDeviceId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Generate or retrieve device ID
    const id = localStorage.getItem('chatkit_device_id') || crypto.randomUUID()
    localStorage.setItem('chatkit_device_id', id)
    setDeviceId(id)
  }, [])

  useEffect(() => {
    if (!deviceId) return

    // Check if ChatKit script is loaded
    if (typeof (window as any).ChatKit === 'undefined') {
      setError(
        'ChatKit script not loaded. Please add the ChatKit script to your layout.'
      )
      setLoading(false)
      return
    }

    const initializeChatKit = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get session token from our API
        const response = await fetch('/api/chatkit/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deviceId }),
        })

        if (!response.ok) {
          const errorData = await response.json() as { message?: string };
          throw new Error(errorData.message || 'Failed to create ChatKit session')
        }

        const sessionData = await response.json() as { client_secret: string };
        const { client_secret } = sessionData;

        // Initialize ChatKit widget
        const ChatKit = (window as any).ChatKit
        const widget = new ChatKit({
          clientSecret: client_secret,
          container: containerRef.current,
          theme: theme || {
            primaryColor: '#0066cc',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            borderRadius: '12px',
          },
        })

        setLoading(false)
      } catch (err: any) {
        console.error('ChatKit initialization failed:', err)
        setError(err.message || 'Failed to initialize ChatKit')
        setLoading(false)
      }
    }

    initializeChatKit()
  }, [deviceId, theme])

  if (error) {
    return (
      <div className={`rounded-lg border border-red-300 bg-red-50 p-6 ${className}`}>
        <h3 className="mb-2 text-lg font-semibold text-red-900">
          ChatKit Error
        </h3>
        <p className="text-sm text-red-700">{error}</p>
        <div className="mt-4 space-y-2 text-xs text-red-600">
          <p>Troubleshooting steps:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              Ensure ChatKit script is loaded in app/layout.tsx
            </li>
            <li>
              Set CHATKIT_WORKFLOW_ID in .env.local
            </li>
            <li>
              Create a workflow in{' '}
              <a
                href="https://platform.openai.com/agent-builder"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                OpenAI Agent Builder
              </a>
            </li>
            <li>
              Verify OPENAI_API_KEY is valid
            </li>
          </ul>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 p-6 ${className}`}>
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm text-gray-600">Initializing ChatKit...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '400px' }}
    />
  )
}

/**
 * Example Usage:
 *
 * ```tsx
 * import { ChatKitInterface } from '@/components/chatkit-interface'
 *
 * export default function ChatPage() {
 *   return (
 *     <div className="container mx-auto p-4">
 *       <h1 className="mb-4 text-2xl font-bold">JetVision AI Assistant</h1>
 *       <ChatKitInterface
 *         className="h-[600px] w-full rounded-lg shadow-xl"
 *         theme={{
 *           primaryColor: '#0066cc',
 *           backgroundColor: '#ffffff',
 *           textColor: '#333333',
 *           borderRadius: '12px',
 *         }}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
