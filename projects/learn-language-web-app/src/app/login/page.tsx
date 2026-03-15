'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: 'Google sign-in was cancelled',
  google_invalid: 'Invalid response from Google',
  google_csrf: 'Security check failed, please try again',
  google_config: 'Google OAuth is not configured',
  google_token: 'Failed to authenticate with Google',
  google_user: 'Could not get your Google account info',
  google_unverified: 'Your Google email is not verified',
  google_failed: 'Google sign-in failed, please try again',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const googleError = searchParams.get('error')
  const displayError = error || (googleError && GOOGLE_ERRORS[googleError]) || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        // Read lang cookie to redirect to the right language
        const langMatch = document.cookie.match(/(?:^|; )lang=([^;]*)/)
        const lang = langMatch ? langMatch[1] : 'ar'
        router.push(`/${lang}`)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid credentials')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg" style={{ background: 'radial-gradient(ellipse at center, #f5f3ff 0%, #f5f5f3 60%)' }}>
      <div className="animate-modal bg-surface p-8 rounded-[var(--radius-lg)] border border-line/50 w-full max-w-md" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex justify-center mb-8">
          <span className="text-3xl font-bold text-ink">
            Learn<span className="text-accent">.</span>
          </span>
        </div>

        {/* Google Sign-In */}
        <a
          href="/api/auth/google"
          className="w-full flex items-center justify-center gap-3 bg-white text-ink border border-line px-4 py-2.5 rounded-[var(--radius-md)] hover:bg-bg hover:border-ink-faint transition font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </a>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-surface text-ink-faint">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-soft">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-[var(--radius-sm)] border border-line px-3 py-2.5 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-soft">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-[var(--radius-sm)] border border-line px-3 py-2.5 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              required
            />
          </div>
          {displayError && (
            <div className="rounded-[var(--radius-sm)] bg-error-subtle border border-error/20 px-3 py-2 text-error text-sm">
              {displayError}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-2.5 px-4 rounded-[var(--radius-md)] hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 font-medium transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
