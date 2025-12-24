import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

/**
 * Check if auth should be bypassed
 * 
 * Security: BYPASS_AUTH requires explicit opt-in via environment variable.
 * Authentication bypass is only allowed in development environments (NODE_ENV === 'development').
 * In production (NODE_ENV === 'production'), authentication bypass is never allowed.
 * 
 * To enable bypass in development, explicitly set: BYPASS_AUTH=true
 * 
 * For Vercel deployments in development, you can also use: BYPASS_AUTH_VERCEL=true
 * (This is a convenience flag for Vercel preview deployments but still requires explicit opt-in)
 */
const isDevelopment = process.env.NODE_ENV === 'development'
const bypassAuthEnv = process.env.BYPASS_AUTH === 'true'
const bypassAuthVercelEnv = process.env.BYPASS_AUTH_VERCEL === 'true'

// Warn if BYPASS_AUTH is set in non-development environments
if (bypassAuthEnv && !isDevelopment) {
  console.warn(
    '[middleware] Security Warning: BYPASS_AUTH is set to "true" but NODE_ENV is not "development". ' +
    'Authentication bypass is only allowed in development. Ignoring BYPASS_AUTH setting.'
  )
}

// Warn if BYPASS_AUTH_VERCEL is set in non-development environments
if (bypassAuthVercelEnv && !isDevelopment) {
  console.warn(
    '[middleware] Security Warning: BYPASS_AUTH_VERCEL is set to "true" but NODE_ENV is not "development". ' +
    'Authentication bypass is only allowed in development. Ignoring BYPASS_AUTH_VERCEL setting.'
  )
}

// Require explicit opt-in: Only allow bypass in development with explicit BYPASS_AUTH flag
// Optional convenience flag BYPASS_AUTH_VERCEL for Vercel preview deployments (also requires explicit opt-in)
const BYPASS_AUTH = isDevelopment && Boolean(
  bypassAuthEnv || (bypassAuthVercelEnv && process.env.VERCEL === '1')
)

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/chat', // Health check GET endpoint is public
  '/api/chat/test', // Dev-only test endpoint
  '/component-demo(.*)', // Component demo pages for testing/screenshots
])

// Middleware with conditional auth bypass
// Always use clerkMiddleware for consistent export type, but bypass auth when BYPASS_AUTH is true
export default clerkMiddleware(async (auth, request) => {
  // If auth bypass is enabled in development, skip all auth checks
  if (BYPASS_AUTH) {
    // Log auth bypass in development for debugging visibility
    if (isDevelopment) {
      console.debug(
        `[middleware] Auth bypassed (dev mode): ${request.method} ${request.nextUrl.pathname}`
      )
    }
    // In dev mode with bypass, just pass through all requests
    return NextResponse.next()
  }

  // Normal auth flow: check authentication
  const { userId } = await auth()

  // Redirect authenticated users away from auth pages to home
  if (userId && (request.nextUrl.pathname.startsWith('/sign-in') || request.nextUrl.pathname.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect deprecated dashboard routes to unified chat interface (ONEK-101)
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  // Protect all routes except public routes - redirect to sign-in if not authenticated
  if (!isPublicRoute(request) && !userId) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.url)
    return NextResponse.redirect(signInUrl)
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
