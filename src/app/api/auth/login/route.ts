import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  const validEmail = process.env.AUTH_USERNAME
  const validPassword = process.env.AUTH_PASSWORD
  const secret = process.env.AUTH_SECRET || 'default-secret'

  if (email === validEmail && password === validPassword) {
    // Create a simple session token (in production, use proper JWT)
    const token = Buffer.from(`${email}:${Date.now()}:${secret}`).toString('base64')

    // Only use Secure flag if accessed via HTTPS
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' ||
                    request.url.startsWith('https://')

    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
