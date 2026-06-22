import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Accessible without a session
const PUBLIC_ROUTES = ['/', '/login', '/register'];
// Redirect authenticated users away from these back to the dashboard
const AUTH_ONLY_PUBLIC = ['/login', '/register'];

async function verifySession(token: string): Promise<boolean> {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return false;
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key, { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth (return 401, not redirect)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;
  const authenticated = token ? await verifySession(token) : false;

  if (!authenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (authenticated && AUTH_ONLY_PUBLIC.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
