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
  const token = request.cookies.get('access_token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // For admin routes: basic client-side UX guard.
  // The real admin check happens server-side in the backend via require_admin dependency.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (!payload.is_admin) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*'],
}
