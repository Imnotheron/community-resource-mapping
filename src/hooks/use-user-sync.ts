'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch, getStoredUser, setStoredUser, clearStoredUser, AuthUser } from '@/lib/api-client'

const HEARTBEAT_INTERVAL_MS = 30 * 1000

async function sendHeartbeat(userId: string, status: 'online' | 'offline' = 'online') {
  if (!userId) return

  await apiFetch('/api/user/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ userId, status }),
  })
}

/**
 * useUserSync — manages auth state across the SPA.
 * - Hydrates from localStorage on mount
 * - Exposes login / register / logout actions
 * - Sends a heartbeat every 30 seconds so admins can see Online / Offline / Last seen
 */
export function useUserSync() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const ping = () => {
      sendHeartbeat(user.id, 'online').catch(() => {})
    }

    ping()

    const intervalId = window.setInterval(ping, HEARTBEAT_INTERVAL_MS)

    const handleFocus = () => ping()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ping()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id])

  const login = useCallback(async (email: string, password: string, role: string) => {
    const data = await apiFetch<{ success: boolean; user: AuthUser; token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      }
    )

    setStoredUser(data.user, data.token)
    setUser(data.user)

    if (data.user?.id) {
      sendHeartbeat(data.user.id, 'online').catch(() => {})
    }

    return data
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, role: string) => {
    const data = await apiFetch<{ success: boolean; user: AuthUser; token: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      }
    )

    setStoredUser(data.user, data.token)
    setUser(data.user)

    if (data.user?.id) {
      sendHeartbeat(data.user.id, 'online').catch(() => {})
    }

    return data
  }, [])

  const logout = useCallback(async () => {
    const userId = user?.id

    if (userId) {
      try {
        await sendHeartbeat(userId, 'offline')
      } catch {}
    }

    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {}

    clearStoredUser()
    setUser(null)
  }, [user?.id])

  const refreshUser = useCallback((u: AuthUser) => {
    const token = localStorage.getItem('crms_token') || ''
    setStoredUser(u, token)
    setUser(u)
  }, [])

  return { user, loading, login, register, logout, refreshUser }
}
