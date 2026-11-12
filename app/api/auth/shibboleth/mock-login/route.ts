// app/api/auth/shibboleth/mock-login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { relativeRedirect } from '@/lib/relative-redirect';

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
  const params = new URLSearchParams({ mock: 'true', utorid });
  return relativeRedirect(`/api/auth/shibboleth/callback?${params}`);
}
