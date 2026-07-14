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
  phone?: string | null
  theme?: 'light' | 'dark'
  accent?: 'emerald' | 'teal' | 'green' | 'amber'
  registrationStatus?: string | null
  temporaryPasswordIssued?: boolean
  passwordChangedAt?: string | null
  onboardingReminderDismissedAt?: string | null
}

const USER_KEY = 'crms_user'
const TOKEN_KEY = 'crms_token'
const LEGACY_USER_KEY = 'user'
const LEGACY_TOKEN_KEY = 'token'
const AUTH_CHANGED_EVENT = 'crms-auth-changed'

function dispatchAuthChanged() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(AUTH_CHANGED_EVENT),
  )
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null

  try {
    const raw =
      localStorage.getItem(USER_KEY) ||
      localStorage.getItem(LEGACY_USER_KEY)

    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null

  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY)
  )
}

export function setStoredUser(
  user: AuthUser,
  token: string,
) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(
    LEGACY_USER_KEY,
    JSON.stringify(user),
  )
  localStorage.setItem(LEGACY_TOKEN_KEY, token)

  dispatchAuthChanged()
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LEGACY_USER_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)

  dispatchAuthChanged()
}

type FetchOptions = RequestInit & {
  /** If true, send x-user-id header (used by /api/user/* routes) */
  useUserHeader?: boolean
  /** Override which userId to send in body/header. Defaults to current stored user. */
  userId?: string
}

export async function apiFetch<T = any>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    useUserHeader = false,
    userId,
    ...fetchOpts
  } = options

  const user = getStoredUser()
  const token = getStoredToken()
  const effectiveUserId = userId ?? user?.id

  const isFormData =
    typeof FormData !== 'undefined' &&
    fetchOpts.body instanceof FormData

  const headers: Record<string, string> = {
    ...(isFormData
      ? {}
      : { 'Content-Type': 'application/json' }),
    ...(fetchOpts.headers as Record<string, string>),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (useUserHeader && effectiveUserId) {
    headers['x-user-id'] = effectiveUserId
  }

  let body = fetchOpts.body

  if (
    body &&
    typeof body === 'string' &&
    effectiveUserId
  ) {
    try {
      const parsed = JSON.parse(body)

      if (
        !('userId' in parsed) &&
        !('adminId' in parsed) &&
        !('createdBy' in parsed) &&
        !('workerId' in parsed) &&
        !('requesterId' in parsed)
      ) {
        parsed.userId = effectiveUserId
        body = JSON.stringify(parsed)
      }
    } catch {
      // Non-JSON body — leave unchanged.
    }
  } else if (
    fetchOpts.method === 'POST' &&
    !body &&
    effectiveUserId &&
    !useUserHeader
  ) {
    body = JSON.stringify({
      userId: effectiveUserId,
    })
  }

  let finalUrl = url

  if (
    effectiveUserId &&
    (fetchOpts.method === 'GET' ||
      fetchOpts.method === 'DELETE' ||
      !fetchOpts.method)
  ) {
    const separator = finalUrl.includes('?') ? '&' : '?'

    if (
      !finalUrl.includes('userId=') &&
      !finalUrl.includes('adminId=')
    ) {
      finalUrl = `${finalUrl}${separator}userId=${effectiveUserId}`
    }
  }

  const response = await fetch(finalUrl, {
    ...fetchOpts,
    headers,
    body,
  })

  let data: any
  const contentType =
    response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  if (!response.ok) {
    const message =
      (data &&
        typeof data === 'object' &&
        (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      `Request failed (${response.status})`

    throw new Error(message)
  }

  return data as T
}
