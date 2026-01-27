// app/api/auth/shibboleth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken, setSessionCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isMockMode = searchParams.get('mock') === 'true' && process.env.ENABLE_MOCK_SHIBBOLETH === 'true';

    let utorid: string | null = null;

    if (isMockMode) {
      // Mock mode: read from query parameters
      utorid = searchParams.get('utorid');
      console.log('Mock Shibboleth authentication:', { utorid });
    } else {
      // Real Shibboleth mode: read UTORid from header set by SP
      utorid = request.headers.get('x-remote-user') || 
               request.headers.get('remote-user');
      
      console.log('Real Shibboleth authentication:', { utorid });
      console.log('All headers:', Object.fromEntries(request.headers.entries()));
    }

    // Validate UTORid exists
    if (!utorid) {
      console.error('Missing UTORid from Shibboleth');
      return NextResponse.redirect(
        new URL('/login?error=missing_utorid', request.url)
      );
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: {
        username: utorid
      }
    });

    if (!user) {
      return NextResponse.redirect(
      new URL('/login?error=authentication_failed', request.url)
    );
    }

    // Create session token using existing auth function
    const token = createToken({
      userId: user.id,
      username: user.username,
    });

    // Set session cookie using existing auth function
    await setSessionCookie(token);

    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('Shibboleth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=authentication_failed', request.url)
    );
  }
}