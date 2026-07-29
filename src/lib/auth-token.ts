export type AuthRole = 'ADMIN' | 'WORKER' | 'VULNERABLE'

export interface AuthTokenClaims {
  userId: string
  email: string
  role: AuthRole
  issuedAt: number
  expiresAt: number
}

const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 7

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim()

  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production')
  }

  return 'development-only-change-this-auth-secret'
}

function encodeBase64Url(value: string | Uint8Array): string {
  const buffer =
    typeof value === 'string'
      ? Buffer.from(value, 'utf8')
      : Buffer.from(value)

  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(normalized + padding, 'base64').toString('utf8')
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getAuthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )

  return encodeBase64Url(new Uint8Array(signature))
}

function normalizeRole(value: unknown): AuthRole | null {
  const role = String(value || '').trim().toUpperCase()

  return role === 'ADMIN' || role === 'WORKER' || role === 'VULNERABLE'
    ? role
    : null
}

export async function createAuthToken(input: {
  userId: string
  email: string
  role: string
}): Promise<string> {
  const role = normalizeRole(input.role)

  if (!role) {
    throw new Error('Cannot create a session for an invalid role')
  }

  const now = Math.floor(Date.now() / 1000)
  const claims: AuthTokenClaims = {
    userId: input.userId,
    email: input.email,
    role,
    issuedAt: now,
    expiresAt: now + TOKEN_LIFETIME_SECONDS,
  }

  const payload = encodeBase64Url(JSON.stringify(claims))
  const signature = await signPayload(payload)
  return `${payload}.${signature}`
}

export async function verifyAuthToken(
  token: string | null | undefined,
): Promise<AuthTokenClaims | null> {
  if (!token) return null

  const [payload, providedSignature, extra] = token.split('.')
  if (!payload || !providedSignature || extra) return null

  const expectedSignature = await signPayload(payload)

  const expected = Buffer.from(expectedSignature)
  const provided = Buffer.from(providedSignature)

  if (
    expected.length !== provided.length ||
    !crypto.timingSafeEqual(expected, provided)
  ) {
    return null
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as Partial<AuthTokenClaims>
    const role = normalizeRole(parsed.role)
    const now = Math.floor(Date.now() / 1000)

    if (
      !parsed.userId ||
      !parsed.email ||
      !role ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= now
    ) {
      return null
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      role,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

export const AUTH_COOKIE_NAME = 'token'
export const AUTH_COOKIE_MAX_AGE = TOKEN_LIFETIME_SECONDS
