'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export function useDashboardSection(
  sections: string[],
  fallback: string,
) {
  const sectionsKey = sections.join('\u0000')
  const allowed = useMemo(
    () =>
      new Set(
        sectionsKey
          ? sectionsKey.split('\u0000')
          : [],
      ),
    [sectionsKey],
  )
  const [section, setSection] = useState(fallback)

  useEffect(() => {
    const syncFromUrl = () => {
      const hash = window.location.hash
        .replace(/^#/, '')
        .trim()

      setSection(
        hash && allowed.has(hash)
          ? hash
          : fallback,
      )
    }

    syncFromUrl()
    window.addEventListener('hashchange', syncFromUrl)
    window.addEventListener('popstate', syncFromUrl)

    return () => {
      window.removeEventListener('hashchange', syncFromUrl)
      window.removeEventListener('popstate', syncFromUrl)
    }
  }, [allowed, fallback])

  const navigate = useCallback(
    (next: string) => {
      if (!allowed.has(next)) return

      const nextHash = `#${next}`
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', nextHash)
      }
      setSection(next)
    },
    [allowed],
  )

  return [section, navigate] as const
}
