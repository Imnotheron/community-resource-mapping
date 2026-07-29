import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  AUTH_COOKIE_NAME,
  type AuthRole,
  verifyAuthToken,
} from '@/lib/auth-token'

export type AuthenticatedUser = {
  id: string
  email: string
  name: string
  role: AuthRole
}

function bearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value || bearerToken(request)
  const claims = await verifyAuthToken(token)

  if (!claims) return null

  const user = await db.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, email: true, name: true, role: true },
  })

  if (!user) return null

  const role = String(user.role).toUpperCase() as AuthRole
  if (
    user.email.toLowerCase() !== claims.email.toLowerCase() ||
    role !== claims.role
  ) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
  }
}

export async function requireRoles(
  request: NextRequest,
  allowedRoles: AuthRole[],
): Promise<
  | { user: AuthenticatedUser; error?: never }
  | { user?: never; error: NextResponse }
> {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication is required' },
        { status: 401 },
      ),
    }
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { success: false, error: 'You do not have permission for this action' },
        { status: 403 },
      ),
    }
  }

  return { user }
}
