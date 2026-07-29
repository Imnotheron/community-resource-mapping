import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import {
  AUTH_COOKIE_NAME,
  verifyAuthToken,
} from '@/lib/auth-token'

function isMobileUserAgent(ua: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(
    ua,
  )
}

function requiredRole(pathname: string) {
  if (pathname.startsWith('/admin')) return 'ADMIN'
  if (pathname.startsWith('/worker')) return 'WORKER'
  if (pathname.startsWith('/vulnerable')) return 'VULNERABLE'
  return null
}

function redirectToIntro(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/intro'
  url.search = ''

  const response = NextResponse.redirect(url)
  response.cookies.delete(AUTH_COOKIE_NAME)
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const roleNeeded = requiredRole(pathname)

  if (!roleNeeded) return NextResponse.next()

  if (roleNeeded === 'ADMIN') {
    const userAgent = request.headers.get('user-agent') || ''
    if (isMobileUserAgent(userAgent)) return redirectToIntro(request)
  }

  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const bearer = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
  const claims = await verifyAuthToken(cookieToken || bearer)

  if (!claims || claims.role !== roleNeeded) {
    return redirectToIntro(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/worker/:path*', '/vulnerable/:path*'],
}
