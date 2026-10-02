'use client'

import { useEffect, useState } from 'react'

export type ConnectionQuality =
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'OFFLINE'
  | 'CHECKING'

export function useConnectionQuality(intervalMs = 15000) {
  const [latency, setLatency] = useState<number | null>(null)
  const [quality, setQuality] = useState<ConnectionQuality>(
    typeof navigator !== 'undefined' && !navigator.onLine
      ? 'OFFLINE'
      : 'CHECKING',
  )

  useEffect(() => {
    let disposed = false
    let timer: number | null = null
    let controller: AbortController | null = null

    const schedule = () => {
      if (disposed) return
      timer = window.setTimeout(check, intervalMs)
    }

    const check = async () => {
      if (disposed) return

      if (!navigator.onLine) {
        setLatency(null)
        setQuality('OFFLINE')
        schedule()
        return
      }

      if (document.visibilityState === 'hidden') {
        schedule()
        return
      }

      controller?.abort()
      controller = new AbortController()
      const timeout = window.setTimeout(
        () => controller?.abort(),
        5000,
      )
      const started = performance.now()

      try {
        const response = await fetch(
          `/api/health?t=${Date.now()}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          throw new Error('Health check failed')
        }

        const ms = Math.max(
          1,
          Math.round(performance.now() - started),
        )

        if (!disposed) {
          setLatency(ms)
          setQuality(
            ms < 150
              ? 'GOOD'
              : ms < 400
                ? 'FAIR'
                : 'POOR',
          )
        }
      } catch {
        if (!disposed) {
          setLatency(null)
          setQuality(
            navigator.onLine
              ? 'POOR'
              : 'OFFLINE',
          )
        }
      } finally {
        window.clearTimeout(timeout)
        schedule()
      }
    }

    const handleOnline = () => {
      setQuality('CHECKING')
      check()
    }

    const handleOffline = () => {
      controller?.abort()
      setLatency(null)
      setQuality('OFFLINE')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    check()

    return () => {
      disposed = true
      controller?.abort()
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [intervalMs])

  return { latency, quality }
}
