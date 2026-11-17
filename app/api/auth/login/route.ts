import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken, setSessionCookie } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { authConfig } from '@/lib/auth-config'

export const runtime = 'nodejs'

// Username-only ("simple") login has no password, so it must never be reachable in
// production or when Shibboleth is the configured login method.
const simpleLoginEnabled = () =>
  authConfig.mode === 'simple' && process.env.NODE_ENV !== 'production'

export async function POST(request: NextRequest) {
  if (!simpleLoginEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create session token
    const token = createToken({
      userId: user.id,
      username: user.username,
    })

    // Set session cookie
    await setSessionCookie(token)

    return NextResponse.json({ 
      user: {
        userId: user.id,
        username: user.username,
      }
    })
  } catch (error) {
    logger.error({ err: error }, 'Login error')
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
