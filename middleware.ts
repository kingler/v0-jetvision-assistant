import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple test: redirect /dashboard to /chat
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  // Add a custom header to prove middleware ran
  const response = NextResponse.next()
  response.headers.set('x-middleware-ran', 'true')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
