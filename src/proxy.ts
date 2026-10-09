import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { verifySessionToken } from '@/lib/session-token'

function readToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const bearer = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  return request.cookies.get('token')?.value || bearer
}

function requiredRoles(pathname: string) {
  if (
    pathname === '/api/admin/signup-request' ||
    pathname.startsWith('/api/auth/')
  ) {
    return null
  }

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin/')
  ) {
    return ['ADMIN']
  }

  if (
    pathname.startsWith('/worker') ||
    pathname.startsWith('/api/worker/')
  ) {
    return ['WORKER']
  }

  if (
    pathname.startsWith('/vulnerable') ||
    pathname.startsWith('/api/vulnerable/')
  ) {
    return ['VULNERABLE']
  }

  if (pathname.startsWith('/api/map/')) {
    return ['ADMIN', 'WORKER']
  }

  if (
    pathname === '/profile' ||
    pathname.startsWith('/api/assistant/') ||
    pathname.startsWith('/api/user/')
  ) {
    return ['ADMIN', 'WORKER', 'VULNERABLE']
  }

  return null
}

function apiError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status },
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
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

  const allowedRoles = requiredRoles(pathname)
  if (!allowedRoles) return NextResponse.next()

  const session = await verifySessionToken(readToken(request))
  const isApi = pathname.startsWith('/api/')

  if (!session) {
    if (isApi) return apiError('Authentication required', 401)

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('reason', 'session')
    return NextResponse.redirect(url)
  }

  if (!allowedRoles.includes(session.role)) {
    if (isApi) return apiError('Forbidden', 403)

    const url = request.nextUrl.clone()
    url.pathname =
      session.role === 'ADMIN'
        ? '/admin/dashboard'
        : session.role === 'WORKER'
          ? '/worker/dashboard'
          : '/vulnerable/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }


  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
