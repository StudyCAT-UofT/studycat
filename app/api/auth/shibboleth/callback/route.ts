// app/api/auth/shibboleth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { setSessionCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isMockMode = searchParams.get('mock') === 'true' && process.env.ENABLE_MOCK_SHIBBOLETH === 'true';

    let utorid: string | null = null;
    let email: string | null = null;
    let displayName: string | null = null;
    let affiliation: string | null = null;

    if (isMockMode) {
      // Mock mode: read from query parameters
      utorid = searchParams.get('utorid');
      console.log('Mock Shibboleth authentication:', { utorid });
    } else {
      // Real Shibboleth mode: read attributes from headers set by SP
      // Note: Apache converts header names to lowercase and hyphens to underscores
      // Prefer 'uid' (just username) over 'remote_user' (which includes @domain)
      utorid = request.headers.get('uid') || 
               request.headers.get('remote_user')?.split('@')[0] ||
               request.headers.get('eppn')?.split('@')[0];
      email = request.headers.get('mail');
      displayName = request.headers.get('displayname') ||
                    request.headers.get('cn');
      affiliation = request.headers.get('scoped-affiliation') ||
                    request.headers.get('affiliation');
      
      console.log('Real Shibboleth authentication:', { 
        utorid, 
        email, 
        displayName, 
        affiliation 
      });
      console.log('All headers:', Object.fromEntries(request.headers.entries()));
    }

    // Validate UTORid exists
    if (!utorid) {
      console.error('Missing UTORid from Shibboleth');
      return NextResponse.redirect(
        new URL('/login?error=missing_utorid', request.url)
      );
    }

    // CRITICAL TODO: Implement proper role mapping from Shibboleth affiliations
    // Currently defaulting to 'student' - THIS NEEDS TO BE FIXED
    // 
    // Proper mapping should be:
    // - If affiliation contains "student" → role = 'student'
    // - If affiliation contains "faculty" or "staff" → role = 'instructor'
    // - If affiliation contains "employee" → role = 'admin'
    //
    // Example affiliation values from Shibboleth:
    // - student: "member;student@studycat.local"
    // - instructor: "member;faculty@studycat.local;staff@studycat.local"
    // - admin: "member;staff@studycat.local;employee@studycat.local"
    const role: 'student' | 'instructor' | 'admin' = 'student'; // TEMPORARY DEFAULT

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: {
        username: utorid
      }
    });

    if (!user) {
      // User doesn't exist - create them (SSO auto-provisioning)
      user = await prisma.user.create({
        data: {
          username: utorid,
          givenName: displayName?.split(' ')[0] || utorid,
          familyName: displayName?.split(' ').slice(1).join(' ') || '',
        }
      });
      console.log('Created new user via Shibboleth SSO:', { username: utorid });
    }

    // Create session token using JWT function with full payload
    const tokenPayload = {
      userId: user.id,
      email: email || `${user.username}@studycat.local`,
      role: role,
      displayName: displayName || `${user.givenName} ${user.familyName}`.trim() || user.username,
    };
    console.log('Creating JWT token with payload:', tokenPayload);
    
    const token = signToken(tokenPayload);
    console.log('JWT token created, length:', token.length);

    // Create redirect response using the forwarded host (sp.studycat.local)
    // NOT the internal host (host.docker.internal)
    // Always use HTTPS since the browser is on HTTPS (Apache forwards as http in dev)
    const forwardedHost = request.headers.get('x-forwarded-host') || 'localhost:3000';
    const redirectUrl = `https://${forwardedHost}/`;
    
    const response = NextResponse.redirect(redirectUrl);
    
    // Set session cookie directly in the response (not using setSessionCookie)
    // because we need to ensure the cookie domain matches the browser domain
    response.cookies.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    console.log('Session cookie set, redirecting to:', redirectUrl);
    return response;

  } catch (error) {
    console.error('Shibboleth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=authentication_failed', request.url)
    );
  }
}