import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/configuracion', '/checkout', '/mis-cursos'];
const orgRoutes = ['/org'];
const adminRoutes = ['/admin'];

type Role = 'super_admin' | 'hospital_admin' | 'student';

const roleHierarchy: Record<Role, number> = {
  super_admin: 3,
  hospital_admin: 2,
  student: 1,
};

function hasRequiredRole(userRole: Role | undefined, requiredRole: Role): boolean {
  if (!userRole) return false;
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

async function getSessionRole(request: NextRequest): Promise<Role | undefined> {
  try {
    const sessionResponse = await fetch(new URL('/api/auth/get-session', request.url), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    if (!sessionResponse.ok) return undefined;

    const sessionData = await sessionResponse.json();
    return sessionData?.user?.role as Role | undefined;
  } catch {
    return undefined;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isOrgRoute = orgRoutes.some((route) => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (!isProtected && !isOrgRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has('better-auth.session_token');

  if (!hasSession) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_to', pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAdminRoute) {
    const role = await getSessionRole(request);
    if (!hasRequiredRole(role, 'super_admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (isOrgRoute) {
    const role = await getSessionRole(request);
    if (!hasRequiredRole(role, 'hospital_admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/configuracion/:path*',
    '/checkout/:path*',
    '/mis-cursos/:path*',
    '/org/:path*',
    '/admin/:path*',
  ],
};
