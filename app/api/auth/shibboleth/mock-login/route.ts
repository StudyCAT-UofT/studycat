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
  const utorid = searchParams.get('utorid') || 'testuser';

  // Redirect to the callback with mock UTORid
  const callbackUrl = new URL('/api/auth/shibboleth/callback', request.url);
  callbackUrl.searchParams.set('mock', 'true');
  callbackUrl.searchParams.set('utorid', utorid);

  return NextResponse.redirect(callbackUrl);
}
