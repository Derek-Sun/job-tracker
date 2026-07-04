import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { encrypt, decrypt, REMEMBERED_SESSION_SECONDS } from '@/lib/session-shared';

// Accessible without a session
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
// Redirect authenticated users away from these back to the dashboard
const AUTH_ONLY_PUBLIC = ['/login', '/register'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth (return 401, not redirect)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;
  const session = token ? await decrypt(token) : null;
  const authenticated = session !== null;

  let response: NextResponse;

  if (!authenticated && !PUBLIC_ROUTES.includes(pathname)) {
    response = NextResponse.redirect(new URL('/login', request.url));
  } else if (authenticated && AUTH_ONLY_PUBLIC.includes(pathname)) {
    response = NextResponse.redirect(new URL('/', request.url));
  } else {
    response = NextResponse.next();
  }

  // Sliding refresh: remembered sessions get their 3-day window reset on every visit
  if (session?.remember) {
    const freshToken = await encrypt(
      { userId: session.userId, name: session.name, remember: true },
      `${REMEMBERED_SESSION_SECONDS}s`
    );
    response.cookies.set('session', freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REMEMBERED_SESSION_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
