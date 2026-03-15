import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { isEmailAllowed, getOrCreateUser } from '@/lib/auth'

interface GoogleTokenResponse {
  access_token: string
  id_token: string
  token_type: string
  expires_in: number
}

interface GoogleUserInfo {
  email: string
  name: string
  picture: string
  email_verified: boolean
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_URL || request.url

  if (error) {
    return NextResponse.redirect(new URL('/login?error=google_denied', baseUrl))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=google_invalid', baseUrl))
  }

  // Verify state parameter
  const cookieStore = await cookies()
  const savedState = cookieStore.get('google-oauth-state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/login?error=google_csrf', baseUrl))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=google_config', baseUrl))
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL('/login?error=google_token', baseUrl))
    }

    const tokens: GoogleTokenResponse = await tokenRes.json()

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/login?error=google_user', baseUrl))
    }

    const user: GoogleUserInfo = await userRes.json()

    // v2 userinfo returns `verified_email`, not `email_verified`
    if (user.email_verified === false || (user as Record<string, unknown>).verified_email === false) {
      return NextResponse.redirect(new URL('/login?error=google_unverified', baseUrl))
    }

    // Check allowlist
    if (!isEmailAllowed(user.email)) {
      return NextResponse.redirect(new URL('/login?error=not_allowed', baseUrl))
    }

    // Ensure user exists in DB
    getOrCreateUser(user.email, user.name)

    // Create session token (same format as email/password auth)
    const secret = process.env.AUTH_SECRET || 'default-secret'
    const token = Buffer.from(`${user.email}:${Date.now()}:${secret}`).toString('base64')

    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    // Clean up state cookie
    cookieStore.delete('google-oauth-state')

    // Redirect to app
    const lang = cookieStore.get('lang')?.value || 'ar'
    return NextResponse.redirect(new URL(`/${lang}`, baseUrl))
  } catch {
    return NextResponse.redirect(new URL('/login?error=google_failed', baseUrl))
  }
}
