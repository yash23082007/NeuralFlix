import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware — UX guard only, NOT a security boundary.
 * 
 * Real authentication and authorization are enforced server-side by the backend.
 * This middleware only provides UX redirects (e.g., redirect to /login if no cookie).
 * 
 * HttpOnly cookies ARE accessible to Next.js server middleware (they run server-side).
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('nf_access_token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authorization is deliberately server-side. JWT claims are not a trusted UX gate.
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*'],
}
