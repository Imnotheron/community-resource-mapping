import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple mobile User-Agent detection
function isMobileUserAgent(ua: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua)
}

// Middleware for handling authentication and route protection
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to static files, API routes, and public pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/' ||
    pathname.startsWith('/intro') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/role-selection') ||
    pathname.startsWith('/register') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next()
  }

  // Block admin routes on mobile devices (server-side safety net)
  if (pathname.startsWith('/admin')) {
    const userAgent = request.headers.get('user-agent') || ''
    if (isMobileUserAgent(userAgent)) {
      console.log('[Middleware] Mobile device detected on admin route, redirecting to intro')
      const url = request.nextUrl.clone()
      url.pathname = '/intro'
      return NextResponse.redirect(url)
    }
  }

  // Check for auth token
  const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')

  console.log('[Middleware] Path:', pathname, 'Has Token:', !!token)

  // Protected routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/worker') || pathname.startsWith('/vulnerable')) {
    if (!token) {
      console.log('[Middleware] No token found, redirecting to intro')
      // Redirect to intro if not authenticated
      const url = request.nextUrl.clone()
      url.pathname = '/intro'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
