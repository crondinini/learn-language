'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
          {error && (
            <div className="rounded-[var(--radius-sm)] bg-error-subtle border border-error/20 px-3 py-2 text-error text-sm">
              {error}
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
