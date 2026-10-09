import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { verifySessionToken } from '@/lib/session-token'

type RequestUserOptions = {
  allowedRoles?: string[]
  requestedUserId?: string | null
}

function readToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const bearer = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  return request.cookies.get('token')?.value || bearer
}

function normalizeRole(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

export async function requireMatchingRequestUser(request: NextRequest) {
  const session = await verifySessionToken(readToken(request))
  const sessionUserId = String(session?.userId || '').trim()

  if (!sessionUserId) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication is required' },
        { status: 401 },
      ),
    }
  }

  const requestedUserId = String(
    request.headers.get('x-user-id') || '',
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

  return {
    userId: sessionUserId,
    tokenRole: normalizeRole(session?.role),
  }
}

/**
 * Resolves the signed-in database user, optionally checks a body/query user ID,
 * and restricts the request to one or more roles. The signed token establishes
 * identity, while the database remains authoritative for the current role.
 */
export async function requireRequestUser(
  request: NextRequest,
  options: RequestUserOptions = {},
) {
  const match = await requireMatchingRequestUser(request)
  if ('error' in match) return match

  const requestedUserId = String(options.requestedUserId || '').trim()
  if (requestedUserId && requestedUserId !== match.userId) {
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

  const user = await db.user.findUnique({
    where: { id: match.userId },
    select: { id: true, role: true },
  })

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Session user was not found' },
        { status: 401 },
      ),
    }
  }

  const role = normalizeRole(user.role)
  const allowedRoles = (options.allowedRoles || []).map(normalizeRole)

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: 'This account is not allowed to perform this action',
        },
        { status: 403 },
      ),
    }
  }

  return { userId: user.id, role }
}
