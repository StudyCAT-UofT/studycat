import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST() {
  try {
    await clearSessionCookie()
    // Just clear the app session cookie - Shibboleth session remains active
    // User will need to re-authenticate at IdP level separately if needed
    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    logger.error({ err: error }, 'Logout error')
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
