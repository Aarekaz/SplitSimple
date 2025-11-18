import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function validateAdminPassword(password: string): Promise<boolean> {
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD environment variable not set')
    return false
  }

  return password === ADMIN_PASSWORD
}

export async function createAdminSession(): Promise<string> {
  const sessionToken = generateSessionToken()
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  })

  return sessionToken
}

export async function validateAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)

  return !!sessionToken?.value
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

type RouteContext<T = Record<string, string>> = {
  params: Promise<T>
}

export function adminAuthMiddleware<T = Record<string, string>>(
  handler: (req: NextRequest, context: RouteContext<T>) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: RouteContext<T>) => {
    const isAuthenticated = await validateAdminSession()

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return handler(req, context)
  }
}