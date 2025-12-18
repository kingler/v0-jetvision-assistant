import type React from "react"
import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { SkipToContent } from "@/components/skip-to-content"
import "./globals.css"

export const metadata: Metadata = {
  title: "Jetvision Agent",
  description: "AI-powered private jet booking assistant",
  generator: "v0.app",
}

// Force dynamic rendering for the entire app
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="font-sans">
          <SkipToContent />
          <ErrorBoundary>
            <Suspense fallback={null}>
              <main id="main-content" tabIndex={-1} className="outline-none">
                {children}
              </main>
            </Suspense>
          </ErrorBoundary>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
