"use client"

import type React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">500</h1>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Something went wrong</h2>
              <p className="text-gray-600 dark:text-gray-400">
                We encountered an unexpected error. Please try again or contact support if the problem persists.
              </p>
            </div>
            {process.env.NODE_ENV === "development" && error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Error Details:</p>
                <p className="text-xs text-red-700 dark:text-red-400 font-mono break-all">{error.toString()}</p>
                {error.digest && (
                  <p className="text-xs text-red-600 dark:text-red-500 mt-2">Error ID: {error.digest}</p>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} className="bg-cyan-600 hover:bg-cyan-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()} className="border-gray-300 dark:border-gray-600">
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
