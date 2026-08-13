import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user: session })
  } catch (error) {
    logger.error({ err: error }, 'Session validation error')
    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 })
  }
}
