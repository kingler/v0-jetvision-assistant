import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

export const metadata: Metadata = {
  title: "JetVision Agent",
  description: "AI-powered private jet booking assistant",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // @ts-expect-error - ClerkProvider is an async Server Component (returns Promise<JSX.Element>)
    // This is a known TypeScript limitation with async components in JSX
    // The component works correctly at runtime
    <ClerkProvider>
      <html lang="en">
        <body className="font-sans">
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
