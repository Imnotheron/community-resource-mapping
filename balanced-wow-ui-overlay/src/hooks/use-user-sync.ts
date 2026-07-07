'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch, getStoredUser, setStoredUser, clearStoredUser, AuthUser } from '@/lib/api-client'

/**
 * useUserSync — manages auth state across the SPA.
 * - Hydrates from localStorage on mount
 * - Exposes login / register / logout actions
 * - Periodically pings /api/user/activity to keep lastActive fresh
 */
export function useUserSync() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [loading, setLoading] = useState(false)

  // Heartbeat — update lastActive every 5 minutes
  useEffect(() => {
    if (!user) return
    const ping = () => {
      apiFetch('/api/user/activity', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {})
    }
    ping()
    const id = setInterval(ping, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [user])

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
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    clearStoredUser()
    setUser(null)
  }, [])

  const refreshUser = useCallback((u: AuthUser) => {
    const token = localStorage.getItem('crms_token') || ''
    setStoredUser(u, token)
    setUser(u)
  }, [])

  return { user, loading, login, register, logout, refreshUser }
}
