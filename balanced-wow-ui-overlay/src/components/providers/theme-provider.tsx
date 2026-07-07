'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type AccentColor = 'emerald' | 'teal' | 'green' | 'amber'
const ACCENT_VARS: Record<AccentColor, { light: Record<string, string>; dark: Record<string, string> }> = {
  emerald: {
    light: { '--primary': 'oklch(0.69 0.17 162)', '--ring': 'oklch(0.69 0.17 162)' },
    dark: { '--primary': 'oklch(0.87 0.15 162)', '--ring': 'oklch(0.87 0.15 162)' },
  },
  teal: {
    light: { '--primary': 'oklch(0.7 0.15 200)', '--ring': 'oklch(0.7 0.15 200)' },
    dark: { '--primary': 'oklch(0.85 0.13 200)', '--ring': 'oklch(0.85 0.13 200)' },
  },
  green: {
    light: { '--primary': 'oklch(0.65 0.18 145)', '--ring': 'oklch(0.65 0.18 145)' },
    dark: { '--primary': 'oklch(0.85 0.16 145)', '--ring': 'oklch(0.85 0.16 145)' },
  },
  amber: {
    light: { '--primary': 'oklch(0.75 0.18 75)', '--ring': 'oklch(0.75 0.18 75)' },
    dark: { '--primary': 'oklch(0.85 0.16 75)', '--ring': 'oklch(0.85 0.16 75)' },
  },
}

interface AccentContextValue {
  accent: AccentColor
  setAccent: (a: AccentColor) => void
}
const AccentContext = createContext<AccentContextValue>({
  accent: 'emerald',
  setAccent: () => {},
})

export function useAccent() {
  return useContext(AccentContext)
}

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>(() => {
    if (typeof window === 'undefined') return 'emerald'
    const saved = localStorage.getItem('crms-accent') as AccentColor | null
    return saved && ACCENT_VARS[saved] ? saved : 'emerald'
  })

  useEffect(() => {
    const root = document.documentElement
    const isDark = root.classList.contains('dark')
    Object.entries(ACCENT_VARS[accent][isDark ? 'dark' : 'light']).forEach(([k, v]) => {
      root.style.setProperty(k, v)
    })
  }, [accent])

  const setAccent = (a: AccentColor) => {
    setAccentState(a)
    localStorage.setItem('crms-accent', a)
  }

  return <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>
}
