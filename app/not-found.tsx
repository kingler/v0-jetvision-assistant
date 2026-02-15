"use client"

import Link from "next/link"
import { AlertCircle, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-warning" />
        </div>
        <div className="space-y-2">
          <h1 className="text-responsive-h1 font-bold text-foreground">404</h1>
          <h2 className="text-responsive-h3 font-semibold text-foreground">Page Not Found</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-primary hover:bg-primary/90 min-h-[44px] md:min-h-0">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
