import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TEMPORARY: Simplified middleware to bypass Clerk Edge Runtime issue
// TODO: Re-enable Clerk middleware once Edge Runtime compatibility is fixed
// See: https://github.com/clerk/javascript/issues/...

export function middleware(request: NextRequest) {
  // Allow all requests to pass through for now
  // Authentication is handled by Clerk components on individual pages
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
