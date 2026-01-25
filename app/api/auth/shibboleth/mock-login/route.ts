// app/api/auth/shibboleth/mock-login/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This should ONLY work in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Mock login not available in production' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'testuser';
  const email = searchParams.get('email') || 'testuser@utoronto.ca';
  const displayName = searchParams.get('displayName') || 'Test User';
  const affiliation = searchParams.get('affiliation') || 'student';

  // Redirect to the callback with mock headers
  // In a real scenario, the SP would redirect to your callback WITH headers set
  // We'll simulate this by passing the data as query params
  // and let the callback route handle them specially in mock mode
  
  const callbackUrl = new URL('/api/auth/shibboleth/callback', request.url);
  callbackUrl.searchParams.set('mock', 'true');
  callbackUrl.searchParams.set('userId', userId);
  callbackUrl.searchParams.set('email', email);
  callbackUrl.searchParams.set('displayName', displayName);
  callbackUrl.searchParams.set('affiliation', affiliation);

  return NextResponse.redirect(callbackUrl);
}