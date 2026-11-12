// app/api/auth/shibboleth/callback/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { relativeRedirect } from '@/lib/relative-redirect';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isMockMode = searchParams.get('mock') === 'true' && process.env.ENABLE_MOCK_SHIBBOLETH === 'true';

    let utorid: string | null = null;

    if (isMockMode) {
      // Mock mode: read from query parameters
      utorid = searchParams.get('utorid');
    } else {
      // Real Shibboleth mode: read attributes from headers set by SP
      // Note: Apache converts header names to lowercase and hyphens to underscores
      // Prefer 'uid' (just username) over 'remote_user' (which includes @domain)
      utorid = request.headers.get('uid') ||
        request.headers.get('remote_user')?.split('@')[0] ||
        request.headers.get('eppn')?.split('@')[0] || null;

      logger.debug(
        { utorid, headers: Object.fromEntries(request.headers.entries()) },
        'Real Shibboleth authentication'
      );
    }

    // Validate UTORid exists
    if (!utorid) {
      logger.error('Missing UTORid from Shibboleth');
      return relativeRedirect('/login?error=missing_utorid');
    }

    // Find or create user in database
    const user = await prisma.user.findUnique({
      where: {
        username: utorid
      }
    });

    if (!user) {
      logger.error({ utorid }, 'User not found');
      return relativeRedirect('/login?error=user_not_found');
    }

    // Create session token using JWT function with full payload
    const tokenPayload = {
      userId: user.id,
      username: utorid
    };

    const token = signToken(tokenPayload);

    // Relative redirect: the browser stays on the public host it used (e.g. behind
    // Apache), rather than the server's internal address from request.url
    const response = relativeRedirect('/');

    // Set session cookie directly in the response (not using setSessionCookie)
    // because we need to ensure the cookie domain matches the browser domain
    response.cookies.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });


    return response;

  } catch (error) {
    logger.error({ err: error }, 'Shibboleth callback error');
    return relativeRedirect('/login?error=authentication_failed');
  }
}
