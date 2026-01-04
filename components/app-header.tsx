"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { SettingsDropdownMenu } from "@/components/settings-panel"
import { ChevronRight, ChevronLeft } from "lucide-react"
import NextImage from "next/image"

/**
 * AppHeader Component
 * 
 * Header component with Jetvision branding, sidebar toggle, and user controls.
 * Features:
 * - Jetvision logo and tagline
 * - Sidebar toggle button
 * - Settings dropdown menu
 * - User authentication button
 * 
 * @example
 * ```tsx
 * <AppHeader
 *   sidebarOpen={true}
 *   onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
 *   isMobile={false}
 * />
 * ```
 */
export interface AppHeaderProps {
  /** Whether the sidebar is currently open */
  sidebarOpen: boolean
  /** Callback to toggle sidebar state */
  onSidebarToggle: () => void
  /** Whether the app is in mobile view */
  isMobile?: boolean
}

export function AppHeader({ sidebarOpen, onSidebarToggle, isMobile = false }: AppHeaderProps) {
  const { user } = useUser()

  return (
    <header className="border-b border-gray-800 bg-black sticky top-0 z-30">
      <div className="container mx-auto px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side: Sidebar toggle, Logo, Tagline */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            {/* Sidebar Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSidebarToggle}
              className="text-gray-300 hover:text-white hover:bg-gray-800 shrink-0"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>

            {/* Jetvision Logo - White for header */}
            <NextImage
              src="/images/jvg-logo.svg"
              alt="Jetvision"
              width={120}
              height={32}
              className="h-6 sm:h-7 w-auto shrink-0 brightness-0 invert"
            />

            {/* Tagline (hidden on mobile) */}
            <div className="hidden md:block border-l border-gray-600 pl-4">
              <p className="text-sm text-gray-300 font-medium">AI-powered Private Jet Booking</p>
            </div>
          </div>

          {/* Right side: Settings, User info, User button */}
          <nav className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center space-x-2">
              {/* Settings dropdown menu - moved before user name */}
              <SettingsDropdownMenu />
              {/* User name (hidden on mobile) */}
              {user && (
                <span className="hidden sm:inline text-sm text-gray-300">
                  {user.firstName || user.username || user.emailAddresses[0]?.emailAddress}
                </span>
              )}
              {/* User authentication button */}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8 sm:w-9 sm:h-9',
                  },
                }}
                afterSignOutUrl="/sign-in"
              />
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
