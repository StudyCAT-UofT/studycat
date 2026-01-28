import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    // Debug: check what cookies we're receiving
    const cookieHeader = request.headers.get('cookie');
    console.log('Session API - Cookie header:', cookieHeader);
    
    const session = await getSession()
    console.log('Session API - Session result:', session ? 'FOUND' : 'NOT FOUND');
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user: session })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 })
  }
}
