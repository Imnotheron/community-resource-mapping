import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple mobile User-Agent detection
function isMobileUserAgent(ua: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua)
}

// Proxy for handling authentication and route protection
export function proxy(request: NextRequest) {
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
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Block admin routes on mobile devices (server-side safety net)
  if (pathname.startsWith('/admin')) {
    const userAgent = request.headers.get('user-agent') || ''
    if (isMobileUserAgent(userAgent)) {
      console.log('[Proxy] Mobile device detected on admin route, redirecting to intro')
      const url = request.nextUrl.clone()
      url.pathname = '/intro'
      return NextResponse.redirect(url)
    }
  }

  // Check for auth token
  const token =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  console.log('[Proxy] Path:', pathname, 'Has Token:', !!token)

  // Protected routes
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/worker') ||
    pathname.startsWith('/vulnerable')
  ) {
    if (!token) {
      console.log('[Proxy] No token found, redirecting to intro')
      const url = request.nextUrl.clone()
      url.pathname = '/intro'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
