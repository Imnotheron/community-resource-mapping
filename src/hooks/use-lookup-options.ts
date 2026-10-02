'use client'

import { useEffect, useState } from 'react'

import { apiFetch } from '@/lib/api-client'

export function useLookupOptions(
  group: string,
  fallback: string[] = [],
) {
  const [options, setOptions] = useState<string[]>(fallback)

  useEffect(() => {
    let active = true

    apiFetch<{
      options?: Array<{
        value: string
        label: string
        isActive: boolean
      }>
    }>(`/api/lookups?group=${encodeURIComponent(group)}`)
      .then((data) => {
        if (!active) return
        const next = (data.options || [])
          .filter((option) => option.isActive !== false)
          .map((option) =>
            String(option.label || option.value || '').trim(),
          )
          .filter(Boolean)

        if (next.length) setOptions(next)
      })
      .catch(() => {
        if (active) setOptions(fallback)
      })

    return () => {
      active = false
    }
  }, [group])

  return options
}
