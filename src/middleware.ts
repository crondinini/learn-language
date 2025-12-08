import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to login page and auth API
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const token = request.cookies.get('auth-token')?.value

  if (token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const [email, timestamp, secret] = decoded.split(':')
      const expectedSecret = process.env.AUTH_SECRET || 'default-secret'

      // Validate token structure and secret
      if (email && timestamp && secret === expectedSecret) {
        // Token valid for 30 days
        const tokenAge = Date.now() - parseInt(timestamp)
        if (tokenAge < 30 * 24 * 60 * 60 * 1000) {
          return NextResponse.next()
        }
      }
    } catch {
      // Invalid token, redirect to login
    }
  }

  // Redirect to login
  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
