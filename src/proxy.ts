import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { authConfig } from '../auth.config';

const { auth } = NextAuth(authConfig);

export async function proxy(request: NextRequest) {
    const session = await auth();

    // console.log('--- NEW Middleware Debug ---');
    // console.log('Session Object (again):', JSON.stringify(session, null, 2));

    const { nextUrl } = request;

    const isLoggedIn = !!session?.user;
    const userRole = session?.user?.role as UserRole | undefined;
        const userModules = session?.user?.modules as { path?: string }[] | undefined;


    const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
    const isOnLoginPage = nextUrl.pathname.startsWith('/auth/login');
    const isOnRoot = nextUrl.pathname === '/';

    // Route-specific protection for /dashboard/products
    if (nextUrl.pathname.startsWith('/dashboard/products')) {
      // 1. If user is not logged in, redirect to login
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL('/auth/login', nextUrl));
      }

      // 2. If user is MASSIVA_ADMIN, allow access
      if (userRole === 'MASSIVA_ADMIN') {
        return NextResponse.next();
      }
      
      // 3. If user is MASSIVA_EXTRA, check for module permission
      if (userRole === 'MASSIVA_EXTRA') {
        const hasAccess = userModules?.some(module => module.path === '/dashboard/products');
        if (hasAccess) {
          return NextResponse.next();
        }
      }
      
      // 4. For any other case (e.g., CLIENTE, or EXTRA without permission), deny access
      return NextResponse.redirect(new URL('/access-denied', nextUrl));
    }

    if (isOnDashboard && !isLoggedIn) {
        return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }

    if (isLoggedIn && (isOnLoginPage || isOnRoot)) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }

    if (!isLoggedIn && isOnRoot) {
        return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}