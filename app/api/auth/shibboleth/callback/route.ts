// app/api/auth/shibboleth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';

// Map Shibboleth affiliation
function mapAffiliationToRole(affiliation: string): 'student' | 'instructor' {
  const aff = affiliation.toLowerCase();
  
  if (aff.includes('faculty') || aff.includes('instructor')) {
    return 'instructor';
  }
  
  // Default to student
  return 'student';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isMockMode = searchParams.get('mock') === 'true' && process.env.ENABLE_MOCK_SHIBBOLETH === 'true';

    let userId: string | null = null;
    let email: string | null = null;
    let displayName: string | null = null;
    let affiliation: string | null = null;

    if (isMockMode) {
      // Mock mode: read from query parameters
      userId = searchParams.get('userId');
      email = searchParams.get('email');
      displayName = searchParams.get('displayName');
      affiliation = searchParams.get('affiliation');
      
      console.log('Mock Shibboleth authentication:', { userId, email, displayName, affiliation });
    } else {
      // Real Shibboleth mode: read from headers set by SP
      // These header names depend on how Person 1 configures the SP in attribute-map.xml
      // Common header names (may need adjustment):
      userId = request.headers.get('x-remote-user') || 
               request.headers.get('eppn') ||
               request.headers.get('remote-user');
               
      email = request.headers.get('x-remote-email') || 
              request.headers.get('mail');
              
      displayName = request.headers.get('x-remote-displayname') || 
                    request.headers.get('displayname') ||
                    request.headers.get('cn');
                    
      affiliation = request.headers.get('x-remote-affiliation') || 
                    request.headers.get('affiliation') ||
                    request.headers.get('edupersonaffiliation');
      
      console.log('Real Shibboleth authentication:', { userId, email, displayName, affiliation });
      console.log('All headers:', Object.fromEntries(request.headers.entries()));
    }

    // Validate required fields
    if (!userId || !email) {
      console.error('Missing required Shibboleth attributes:', { userId, email });
      return NextResponse.redirect(
        new URL('/login?error=missing_attributes', request.url)
      );
    }

    // Map affiliation to role
    const role = mapAffiliationToRole(affiliation || 'student');

    // TODO: Find or create user in database
    // For now, we'll just use the Shibboleth data directly
    // In a real implementation, you'd do something like:
    //
    // const user = await prisma.user.upsert({
    //   where: { email },
    //   update: {
    //     displayName,
    //     affiliation,
    //     role,
    //     lastLogin: new Date(),
    //   },
    //   create: {
    //     email,
    //     userId,
    //     displayName,
    //     affiliation,
    //     role,
    //   },
    // });

    // Generate JWT token
    const token = signToken({
      userId,
      email,
      role,
      displayName: displayName || undefined,
    });

    // Create response with redirect to app home
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Set JWT as HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Shibboleth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=authentication_failed', request.url)
    );
  }
}