/**
 * API client utilities for the frontend.
 * Reads the user from localStorage and attaches auth context to every request.
 */

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'worker' | 'vulnerable'
  profilePicture?: string | null
}

const USER_KEY = 'crms_user'
const TOKEN_KEY = 'crms_token'
const LEGACY_USER_KEY = 'user'
const LEGACY_TOKEN_KEY = 'token'

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)
}

export function setStoredUser(user: AuthUser, token: string) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user))
  localStorage.setItem(LEGACY_TOKEN_KEY, token)
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LEGACY_USER_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

type FetchOptions = RequestInit & {
  /** If true, send x-user-id header (used by /api/user/* routes) */
  useUserHeader?: boolean
  /** Override which userId to send in body/header. Defaults to current stored user. */
  userId?: string
}

/**
 * Universal API fetch wrapper.
 * - GET/DELETE: appends userId as query param when available
 * - POST/PUT: injects userId/adminId/createdBy into body when the route needs it
 * - /api/user/* routes use the x-user-id header instead
 * - Always sets Authorization: Bearer <token> for cookie-friendly middleware
 */
export async function apiFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { useUserHeader = false, userId, ...fetchOpts } = options
  const user = getStoredUser()
  const token = getStoredToken()
  const effectiveUserId = userId ?? user?.id

  const isFormData = typeof FormData !== 'undefined' && fetchOpts.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(fetchOpts.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (useUserHeader && effectiveUserId) {
    headers['x-user-id'] = effectiveUserId
  }

  // Body injection for POST/PUT
  let body = fetchOpts.body
  if (body && typeof body === 'string' && effectiveUserId) {
    try {
      const parsed = JSON.parse(body)
      if (!('userId' in parsed) && !('adminId' in parsed) && !('createdBy' in parsed) && !('workerId' in parsed) && !('requesterId' in parsed)) {
        // Heuristic: routes that need identity will read userId/adminId/createdBy/workerId
        // We attach userId by default; specific routes can still override via explicit body field
        parsed.userId = effectiveUserId
        body = JSON.stringify(parsed)
      }
    } catch {
      // non-JSON body (FormData) — leave as is
    }
  } else if (fetchOpts.method === 'POST' && !body && effectiveUserId && !useUserHeader) {
    body = JSON.stringify({ userId: effectiveUserId })
  }

  // Query param injection for GET/DELETE
  let finalUrl = url
  if (effectiveUserId && (fetchOpts.method === 'GET' || fetchOpts.method === 'DELETE' || !fetchOpts.method)) {
    const sep = finalUrl.includes('?') ? '&' : '?'
    if (!finalUrl.includes('userId=') && !finalUrl.includes('adminId=')) {
      finalUrl = `${finalUrl}${sep}userId=${effectiveUserId}`
    }
  }

  const res = await fetch(finalUrl, { ...fetchOpts, headers, body })
  let data: any
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}
