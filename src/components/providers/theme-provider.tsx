'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTheme } from 'next-themes'

import { apiFetch, getStoredUser } from '@/lib/api-client'

export type AppearanceTheme = 'light' | 'dark'
export type AccentColor = 'emerald' | 'teal' | 'green' | 'amber'
export type FontSizePreference =
  | 'small'
  | 'medium'
  | 'large'

type AccentVariables = Record<string, string>

type SettingsResponse = {
  success: boolean
  user?: {
    theme?: string
    accent?: string
    fontSize?: string
  }
}

const THEME_STORAGE_KEY = 'crms-theme'
const ACCENT_STORAGE_KEY = 'crms-accent'
const FONT_SIZE_STORAGE_KEY = 'crms-font-size'
const AUTH_CHANGED_EVENT = 'crms-auth-changed'

const FONT_ROOT_SIZES: Record<
  FontSizePreference,
  string
> = {
  small: '15px',
  medium: '16px',
  large: '17px',
}

const ACCENT_VARS: Record<
  AccentColor,
  Record<AppearanceTheme, AccentVariables>
> = {
  emerald: {
    light: {
      '--primary': 'oklch(0.69 0.17 162)',
      '--primary-foreground': 'oklch(0.98 0.01 160)',
      '--ring': 'oklch(0.69 0.17 162)',
      '--accent': 'oklch(0.98 0.03 160)',
      '--accent-foreground': 'oklch(0.4 0.12 162)',
      '--secondary': 'oklch(0.97 0.01 160)',
      '--sidebar-primary': 'oklch(0.69 0.17 162)',
      '--sidebar-ring': 'oklch(0.69 0.17 162)',
      '--chart-1': 'oklch(0.69 0.17 162)',
      '--wow-emerald-rgb': '16 185 129',
    },
    dark: {
      '--primary': 'oklch(0.87 0.15 162)',
      '--primary-foreground': 'oklch(0.17 0.02 264)',
      '--ring': 'oklch(0.87 0.15 162)',
      '--accent': 'oklch(0.3 0.04 162)',
      '--accent-foreground': 'oklch(0.87 0.15 162)',
      '--secondary': 'oklch(0.3 0.02 260)',
      '--sidebar-primary': 'oklch(0.87 0.15 162)',
      '--sidebar-ring': 'oklch(0.87 0.15 162)',
      '--chart-1': 'oklch(0.87 0.15 162)',
      '--wow-emerald-rgb': '52 211 153',
    },
  },
  teal: {
    light: {
      '--primary': 'oklch(0.66 0.14 190)',
      '--primary-foreground': 'oklch(0.98 0.01 190)',
      '--ring': 'oklch(0.66 0.14 190)',
      '--accent': 'oklch(0.97 0.03 190)',
      '--accent-foreground': 'oklch(0.38 0.11 190)',
      '--secondary': 'oklch(0.97 0.015 190)',
      '--sidebar-primary': 'oklch(0.66 0.14 190)',
      '--sidebar-ring': 'oklch(0.66 0.14 190)',
      '--chart-1': 'oklch(0.66 0.14 190)',
      '--wow-emerald-rgb': '13 148 136',
    },
    dark: {
      '--primary': 'oklch(0.84 0.13 190)',
      '--primary-foreground': 'oklch(0.17 0.02 264)',
      '--ring': 'oklch(0.84 0.13 190)',
      '--accent': 'oklch(0.3 0.04 190)',
      '--accent-foreground': 'oklch(0.84 0.13 190)',
      '--secondary': 'oklch(0.3 0.02 260)',
      '--sidebar-primary': 'oklch(0.84 0.13 190)',
      '--sidebar-ring': 'oklch(0.84 0.13 190)',
      '--chart-1': 'oklch(0.84 0.13 190)',
      '--wow-emerald-rgb': '45 212 191',
    },
  },
  green: {
    light: {
      '--primary': 'oklch(0.64 0.18 145)',
      '--primary-foreground': 'oklch(0.98 0.01 145)',
      '--ring': 'oklch(0.64 0.18 145)',
      '--accent': 'oklch(0.97 0.03 145)',
      '--accent-foreground': 'oklch(0.37 0.12 145)',
      '--secondary': 'oklch(0.97 0.015 145)',
      '--sidebar-primary': 'oklch(0.64 0.18 145)',
      '--sidebar-ring': 'oklch(0.64 0.18 145)',
      '--chart-1': 'oklch(0.64 0.18 145)',
      '--wow-emerald-rgb': '22 163 74',
    },
    dark: {
      '--primary': 'oklch(0.84 0.16 145)',
      '--primary-foreground': 'oklch(0.17 0.02 264)',
      '--ring': 'oklch(0.84 0.16 145)',
      '--accent': 'oklch(0.3 0.04 145)',
      '--accent-foreground': 'oklch(0.84 0.16 145)',
      '--secondary': 'oklch(0.3 0.02 260)',
      '--sidebar-primary': 'oklch(0.84 0.16 145)',
      '--sidebar-ring': 'oklch(0.84 0.16 145)',
      '--chart-1': 'oklch(0.84 0.16 145)',
      '--wow-emerald-rgb': '74 222 128',
    },
  },
  amber: {
    light: {
      '--primary': 'oklch(0.7 0.16 75)',
      '--primary-foreground': 'oklch(0.2 0.03 70)',
      '--ring': 'oklch(0.7 0.16 75)',
      '--accent': 'oklch(0.97 0.04 80)',
      '--accent-foreground': 'oklch(0.4 0.11 70)',
      '--secondary': 'oklch(0.97 0.02 80)',
      '--sidebar-primary': 'oklch(0.7 0.16 75)',
      '--sidebar-ring': 'oklch(0.7 0.16 75)',
      '--chart-1': 'oklch(0.7 0.16 75)',
      '--wow-emerald-rgb': '217 119 6',
    },
    dark: {
      '--primary': 'oklch(0.82 0.15 80)',
      '--primary-foreground': 'oklch(0.17 0.02 264)',
      '--ring': 'oklch(0.82 0.15 80)',
      '--accent': 'oklch(0.32 0.05 75)',
      '--accent-foreground': 'oklch(0.86 0.14 80)',
      '--secondary': 'oklch(0.3 0.02 260)',
      '--sidebar-primary': 'oklch(0.82 0.15 80)',
      '--sidebar-ring': 'oklch(0.82 0.15 80)',
      '--chart-1': 'oklch(0.82 0.15 80)',
      '--wow-emerald-rgb': '245 158 11',
    },
  },
}

interface AppearanceContextValue {
  theme: AppearanceTheme
  accent: AccentColor
  savedTheme: AppearanceTheme
  savedAccent: AccentColor
  fontSize: FontSizePreference
  savedFontSize: FontSizePreference
  isHydrated: boolean
  previewTheme: (theme: AppearanceTheme) => void
  previewAccent: (accent: AccentColor) => void
  previewFontSize: (
    fontSize: FontSizePreference,
  ) => void
  commitAppearance: (
    theme?: AppearanceTheme,
    accent?: AccentColor,
    fontSize?: FontSizePreference,
  ) => void
  revertAppearance: () => void
  reloadAppearance: () => Promise<void>
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

function normalizeTheme(value: unknown): AppearanceTheme {
  return value === 'dark' ? 'dark' : 'light'
}

function normalizeAccent(value: unknown): AccentColor {
  return value === 'teal' ||
    value === 'green' ||
    value === 'amber' ||
    value === 'emerald'
    ? value
    : 'emerald'
}

function normalizeFontSize(
  value: unknown,
): FontSizePreference {
  return value === 'small' ||
    value === 'large' ||
    value === 'medium'
    ? value
    : 'medium'
}

function readCachedTheme(): AppearanceTheme {
  if (typeof window === 'undefined') return 'light'
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
}

function readCachedAccent(): AccentColor {
  if (typeof window === 'undefined') return 'emerald'
  return normalizeAccent(window.localStorage.getItem(ACCENT_STORAGE_KEY))
}

function readCachedFontSize(): FontSizePreference {
  if (typeof window === 'undefined') return 'medium'

  return normalizeFontSize(
    window.localStorage.getItem(
      FONT_SIZE_STORAGE_KEY,
    ),
  )
}

function cacheAppearance(
  theme: AppearanceTheme,
  accent: AccentColor,
  fontSize: FontSizePreference,
) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  window.localStorage.setItem(ACCENT_STORAGE_KEY, accent)
  window.localStorage.setItem(
    FONT_SIZE_STORAGE_KEY,
    fontSize,
  )
}

function applyAppearance(
  theme: AppearanceTheme,
  accent: AccentColor,
  fontSize: FontSizePreference,
) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const variables = ACCENT_VARS[accent][theme]

  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  root.dataset.theme = theme
  root.dataset.accent = accent
  root.dataset.fontSize = fontSize
  root.style.fontSize =
    FONT_ROOT_SIZES[fontSize]

  for (const [property, value] of Object.entries(variables)) {
    root.style.setProperty(property, value)
  }
}

export function useAppearance() {
  const context = useContext(AppearanceContext)

  if (!context) {
    throw new Error(
      'useAppearance must be used inside AccentProvider',
    )
  }

  return context
}

/**
 * Kept for compatibility with existing imports.
 * New code should prefer useAppearance().
 */
export function useAccent() {
  const appearance = useAppearance()

  return {
    accent: appearance.accent,
    savedAccent: appearance.savedAccent,
    setAccent: appearance.previewAccent,
    commitAccent: (accent?: AccentColor) =>
      appearance.commitAppearance(
        appearance.theme,
        accent ?? appearance.accent,
      ),
    resetAccent: appearance.revertAppearance,
  }
}

export function AccentProvider({
  children,
}: {
  children: ReactNode
}) {
  const { setTheme: setNextTheme } = useTheme()

  const [theme, setThemeState] =
    useState<AppearanceTheme>('light')
  const [accent, setAccentState] =
    useState<AccentColor>('emerald')
  const [savedTheme, setSavedTheme] =
    useState<AppearanceTheme>('light')
  const [savedAccent, setSavedAccent] =
    useState<AccentColor>('emerald')
  const [fontSize, setFontSizeState] =
    useState<FontSizePreference>('medium')
  const [savedFontSize, setSavedFontSize] =
    useState<FontSizePreference>('medium')
  const [isHydrated, setIsHydrated] = useState(false)

  const syncRequestRef = useRef(0)
  const currentRef = useRef({
    theme: 'light' as AppearanceTheme,
    accent: 'emerald' as AccentColor,
    fontSize: 'medium' as FontSizePreference,
  })
  const savedRef = useRef({
    theme: 'light' as AppearanceTheme,
    accent: 'emerald' as AccentColor,
  })

  const setCurrentAppearance = useCallback(
    (
      nextTheme: AppearanceTheme,
      nextAccent: AccentColor,
      nextFontSize: FontSizePreference,
    ) => {
      currentRef.current = {
        theme: nextTheme,
        accent: nextAccent,
        fontSize: nextFontSize,
      }

      setThemeState(nextTheme)
      setAccentState(nextAccent)
      setFontSizeState(nextFontSize)
      applyAppearance(
        nextTheme,
        nextAccent,
        nextFontSize,
      )
    },
    [],
  )

  const setSavedAppearance = useCallback(
    (
      nextTheme: AppearanceTheme,
      nextAccent: AccentColor,
      nextFontSize: FontSizePreference,
    ) => {
      savedRef.current = {
        theme: nextTheme,
        accent: nextAccent,
        fontSize: nextFontSize,
      }

      setSavedTheme(nextTheme)
      setSavedAccent(nextAccent)
      setSavedFontSize(nextFontSize)
    },
    [],
  )

  const commitAppearance = useCallback(
    (
      nextTheme = currentRef.current.theme,
      nextAccent = currentRef.current.accent,
      nextFontSize =
        currentRef.current.fontSize,
    ) => {
      setCurrentAppearance(
        nextTheme,
        nextAccent,
        nextFontSize,
      )
      setSavedAppearance(
        nextTheme,
        nextAccent,
        nextFontSize,
      )
      cacheAppearance(
        nextTheme,
        nextAccent,
        nextFontSize,
      )

      // next-themes controls its own cache and document class.
      // We also call applyAppearance synchronously above so the
      // dashboard changes before React navigation occurs.
      setNextTheme(nextTheme)
    },
    [setCurrentAppearance, setNextTheme, setSavedAppearance],
  )

  const revertAppearance = useCallback(() => {
    const saved = savedRef.current

    setCurrentAppearance(
      saved.theme,
      saved.accent,
      saved.fontSize,
    )
    cacheAppearance(
      saved.theme,
      saved.accent,
      saved.fontSize,
    )
    setNextTheme(saved.theme)
  }, [setCurrentAppearance, setNextTheme])

  const previewTheme = useCallback(
    (nextTheme: AppearanceTheme) => {
      setCurrentAppearance(
        nextTheme,
        currentRef.current.accent,
        currentRef.current.fontSize,
      )
    },
    [setCurrentAppearance],
  )

  const previewAccent = useCallback(
    (nextAccent: AccentColor) => {
      setCurrentAppearance(
        currentRef.current.theme,
        nextAccent,
        currentRef.current.fontSize,
      )
    },
    [setCurrentAppearance],
  )

  const previewFontSize = useCallback(
    (
      nextFontSize: FontSizePreference,
    ) => {
      setCurrentAppearance(
        currentRef.current.theme,
        currentRef.current.accent,
        nextFontSize,
      )
    },
    [setCurrentAppearance],
  )

  const reloadAppearance = useCallback(async () => {
    const requestId = ++syncRequestRef.current
    const storedUser = getStoredUser()

    // Guests always use the system default. This also prevents
    // one user's cached accent leaking into another login screen.
    if (!storedUser?.id) {
      if (requestId !== syncRequestRef.current) return

      commitAppearance(
        'light',
        'emerald',
        'medium',
      )
      setIsHydrated(true)
      return
    }

    try {
      const data = await apiFetch<SettingsResponse>(
        '/api/user/settings',
        {
          method: 'GET',
          useUserHeader: true,
          cache: 'no-store',
        },
      )

      if (requestId !== syncRequestRef.current) return

      const serverTheme = normalizeTheme(data.user?.theme)
      const serverAccent = normalizeAccent(data.user?.accent)
      const serverFontSize =
        normalizeFontSize(
          data.user?.fontSize,
        )

      // The database is authoritative. Any stale cached amber
      // value is overwritten here on every login and hard refresh.
      commitAppearance(
        serverTheme,
        serverAccent,
        serverFontSize,
      )
    } catch (error) {
      if (requestId !== syncRequestRef.current) return

      // Keep the cached appearance only when the server cannot
      // be reached. Do not overwrite the user's database settings.
      const cachedTheme = readCachedTheme()
      const cachedAccent = readCachedAccent()
      const cachedFontSize =
        readCachedFontSize()

      setCurrentAppearance(
        cachedTheme,
        cachedAccent,
        cachedFontSize,
      )
      setSavedAppearance(
        cachedTheme,
        cachedAccent,
        cachedFontSize,
      )
      setNextTheme(cachedTheme)

      console.error(
        'Unable to load saved appearance from the server:',
        error,
      )
    } finally {
      if (requestId === syncRequestRef.current) {
        setIsHydrated(true)
      }
    }
  }, [
    commitAppearance,
    setCurrentAppearance,
    setNextTheme,
    setSavedAppearance,
  ])

  useEffect(() => {
    // Apply the local cache immediately to avoid a white/default
    // flash, then replace it with the database preference.
    const cachedTheme = readCachedTheme()
    const cachedAccent = readCachedAccent()
    const cachedFontSize =
      readCachedFontSize()

    setCurrentAppearance(
      cachedTheme,
      cachedAccent,
      cachedFontSize,
    )
    setSavedAppearance(
      cachedTheme,
      cachedAccent,
      cachedFontSize,
    )
    setNextTheme(cachedTheme)

    void reloadAppearance()

    const handleAuthChanged = () => {
      void reloadAppearance()
    }

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === THEME_STORAGE_KEY ||
        event.key === ACCENT_STORAGE_KEY ||
        event.key === FONT_SIZE_STORAGE_KEY ||
        event.key === 'crms_user' ||
        event.key === 'user'
      ) {
        void reloadAppearance()
      }
    }

    window.addEventListener(
      AUTH_CHANGED_EVENT,
      handleAuthChanged,
    )
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        handleAuthChanged,
      )
      window.removeEventListener('storage', handleStorage)
    }
  }, [
    reloadAppearance,
    setCurrentAppearance,
    setNextTheme,
    setSavedAppearance,
  ])

  const value = useMemo<AppearanceContextValue>(
    () => ({
      theme,
      accent,
      savedTheme,
      savedAccent,
      fontSize,
      savedFontSize,
      isHydrated,
      previewTheme,
      previewAccent,
      previewFontSize,
      commitAppearance,
      revertAppearance,
      reloadAppearance,
    }),
    [
      accent,
      commitAppearance,
      fontSize,
      isHydrated,
      previewAccent,
      previewFontSize,
      previewTheme,
      reloadAppearance,
      revertAppearance,
      savedAccent,
      savedFontSize,
      savedTheme,
      theme,
    ],
  )

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}
