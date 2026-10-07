'use client'

import { useEffect } from 'react'

import { apiFetch } from '@/lib/api-client'

export function useActivity(userId: string | null) {
  useEffect(() => {
    if (!userId) return

    const updateActivity = async () => {
      try {
        await apiFetch('/api/user/activity', {
          method: 'POST',
          body: JSON.stringify({ userId }),
        })
      } catch (error) {
        console.error('Failed to update activity:', error)
      }
    }

    updateActivity()

    const interval = setInterval(updateActivity, 60 * 1000)

    return () => clearInterval(interval)
  }, [userId])
}
