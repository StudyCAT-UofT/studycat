import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user: session })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 })
  }
}
