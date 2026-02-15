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
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <AlertCircle className="w-16 h-16 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground">500</h1>
              <h2 className="text-2xl font-semibold text-foreground">Something went wrong</h2>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try again or contact support if the problem persists.
              </p>
            </div>
            {process.env.NODE_ENV === "development" && error && (
              <div className="bg-error-bg border border-error-border rounded-lg p-4 text-left">
                <p className="text-sm font-semibold text-destructive mb-2">Error Details:</p>
                <p className="text-xs text-destructive/80 font-mono break-all">{error.toString()}</p>
                {error.digest && (
                  <p className="text-xs text-destructive/70 mt-2">Error ID: {error.digest}</p>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} className="bg-primary hover:bg-primary/90">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
