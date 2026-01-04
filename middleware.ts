import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

/**
 * Authentication Middleware
 * 
 * Protects all routes except public routes (sign-in, sign-up, webhooks).
 * All authenticated routes require a valid Clerk session.
 * 
 * Authentication is required in all environments (development and production).
 */
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/chat', // Health check GET endpoint is public
  '/api/chat/test', // Dev-only test endpoint
  '/component-demo(.*)', // Component demo pages for testing/screenshots
])

/**
 * Clerk Middleware
 * 
 * Enforces authentication on all routes except public routes.
 * Redirects unauthenticated users to sign-in page.
 */
export default clerkMiddleware(async (auth, request) => {
  // Check authentication - required for all non-public routes
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
