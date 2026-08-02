import { NextRequest, NextResponse } from 'next/server'

type TokenPayload = {
  userId?: string
}

function readToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const bearer = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  return bearer || request.cookies.get('token')?.value || ''
}

function decodeToken(token: string): TokenPayload | null {
  if (!token) return null

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const payload = JSON.parse(decoded) as TokenPayload
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

export function requireMatchingRequestUser(request: NextRequest) {
  const payload = decodeToken(readToken(request))
  const sessionUserId = String(payload?.userId || '').trim()

  if (!sessionUserId) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication is required' },
        { status: 401 },
      ),
    }
  }

  const requestedUserId = String(
    request.headers.get('x-user-id') ||
      request.nextUrl.searchParams.get('userId') ||
      '',
  ).trim()

  if (requestedUserId && requestedUserId !== sessionUserId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: 'The requested user does not match the current session',
        },
        { status: 403 },
      ),
    }
  }

  return { userId: sessionUserId }
}
