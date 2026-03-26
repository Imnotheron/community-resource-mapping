'use client'

import { useEffect } from 'react'

export function useActivity(userId: string | null) {
  useEffect(() => {
    if (!userId) return

    const updateActivity = async () => {
      try {
        await fetch('/api/user/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
      } catch (error) {
        console.error('Failed to update activity:', error)
      }
    }

    // Update immediately on mount
    updateActivity()

    // Update every minute
    const interval = setInterval(updateActivity, 60 * 1000)

    return () => clearInterval(interval)
  }, [userId])
}
