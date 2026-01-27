import { NextResponse, NextRequest } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'
import { authConfig, isShibbolethMode } from '@/lib/auth-config'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    await clearSessionCookie()
    if (isShibbolethMode()) {
      // For Shibboleth mode: return the Shibboleth logout URL
      // Frontend will redirect to this URL to clear Shibboleth session
      const returnUrl = encodeURIComponent(
        request.nextUrl.origin + '/login'
      )
      const shibbolethLogoutUrl = `${authConfig.shibboleth.logoutUrl}?return=${returnUrl}`
      
      return NextResponse.json({ 
        message: 'Logged out successfully',
        redirectUrl: shibbolethLogoutUrl 
      })
    }
    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
