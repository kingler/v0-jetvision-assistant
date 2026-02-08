"use client"

import Link from "next/link"
import { AlertCircle, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-responsive-h1 font-bold text-gray-900 dark:text-white">404</h1>
          <h2 className="text-responsive-h3 font-semibold text-gray-800 dark:text-gray-200">Page Not Found</h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-cyan-600 hover:bg-cyan-700 min-h-[44px] md:min-h-0">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()} className="border-gray-300 dark:border-gray-600">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
