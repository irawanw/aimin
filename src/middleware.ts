import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('aimin_token')?.value;
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/user', request.url));
    }
  }

  // Protect admin191 routes (except login page and API login)
  if (
    pathname.startsWith('/admin191') &&
    !pathname.startsWith('/admin191/login') &&
    !pathname.startsWith('/admin191/api/auth/login')
  ) {
    const admin191Token = request.cookies.get('admin191_token')?.value;
    if (!admin191Token) {
      return NextResponse.redirect(new URL('/admin191/login', request.url));
    }
  }

  // Protect /user routes (except when token param is present for login)
  if (pathname.startsWith('/user') && !pathname.startsWith('/api/')) {
    const pelangganToken = request.cookies.get('pelanggan_token')?.value;
    const hasLoginToken = request.nextUrl.searchParams.has('token');
    if (!pelangganToken && !hasLoginToken) {
      // Let the page handle displaying the error
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/admin191/:path*', '/user/:path*'],
};
