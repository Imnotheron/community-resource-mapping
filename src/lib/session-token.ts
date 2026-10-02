type SessionPayload = {
  userId: string
  role: string
  iat: number
  exp: number
}

const TOKEN_TTL_SECONDS = 60 * 60 * 8

function getSecret() {
  const value =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ''

  if (value.length < 32) {
    throw new Error(
      'AUTH_SECRET or NEXTAUTH_SECRET must contain at least 32 characters',
    )
  }

  return value
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(value: string) {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padded =
    normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
  const binary = atob(padded)

  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function createSessionToken(input: {
  userId: string
  role: string
}) {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    userId: input.userId,
    role: String(input.role || '').toUpperCase(),
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }

  const payloadPart = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    await getHmacKey(),
    new TextEncoder().encode(payloadPart),
  )

  return `${payloadPart}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifySessionToken(token: string) {
  try {
    const [payloadPart, signaturePart, extra] = token.split('.')
    if (!payloadPart || !signaturePart || extra) return null

    const valid = await crypto.subtle.verify(
      'HMAC',
      await getHmacKey(),
      base64UrlDecode(signaturePart),
      new TextEncoder().encode(payloadPart),
    )

    if (!valid) return null

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadPart)),
    ) as Partial<SessionPayload>

    if (
      !payload.userId ||
      !payload.role ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return {
      userId: String(payload.userId),
      role: String(payload.role).toUpperCase(),
      expiresAt: payload.exp,
    }
  } catch {
    return null
  }
}
