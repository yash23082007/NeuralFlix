import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('neuralflix_access_token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Basic admin check for /admin routes
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
