'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { AuthUser } from '@/lib/api-client'

interface LoginWelcomeProps {
  user: AuthUser
  onComplete: () => void
}

function getRoleLabel(role: AuthUser['role']) {
  if (role === 'admin') return 'Administrator'
  if (role === 'worker') return 'Field Worker'
  return 'Vulnerable Citizen'
}

function getInitials(name?: string | null) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

export function LoginWelcome({ user, onComplete }: LoginWelcomeProps) {
  const prefersReducedMotion = useReducedMotion()
  const [imageFailed, setImageFailed] = useState(false)

  const firstName = useMemo(() => {
    const trimmed = String(user.name || '').trim()
    return trimmed ? trimmed.split(/\s+/)[0] : 'there'
  }, [user.name])

  useEffect(() => {
    const timeout = window.setTimeout(
      onComplete,
      prefersReducedMotion ? 1000 : 3000,
    )

    return () => window.clearTimeout(timeout)
  }, [onComplete, prefersReducedMotion])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,253,250,0.92))] dark:bg-[radial-gradient(circle_at_50%_42%,rgba(16,185,129,0.16),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(4,47,46,0.88))]" />

      <motion.div
        className="relative z-10 flex max-w-lg flex-col items-center text-center"
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0.2 : 0.45 }}
      >
        <motion.div
          className="relative grid h-36 w-36 place-items-center overflow-hidden rounded-full border-4 border-white bg-emerald-100 shadow-[0_26px_70px_rgba(5,150,105,0.28)] ring-4 ring-emerald-500/15 sm:h-44 sm:w-44"
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.5 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.2 }
              : {
                  duration: 0.8,
                  delay: 0.5,
                  ease: [0, 0.71, 0.2, 1.01],
                }
          }
        >
          {user.profilePicture && !imageFailed ? (
            <img
              src={user.profilePicture}
              alt={`${user.name || 'User'} profile`}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="text-4xl font-black tracking-tight text-emerald-700 sm:text-5xl">
              {getInitials(user.name)}
            </span>
          )}

          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-300/70"
            animate={
              prefersReducedMotion
                ? undefined
                : { scale: [1, 1.12, 1], opacity: [0.65, 0, 0.65] }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          />
        </motion.div>

        <motion.p
          className="mt-7 text-xs font-bold uppercase tracking-[0.24em] text-emerald-600"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: prefersReducedMotion ? 0 : 0.85 }}
        >
          {getRoleLabel(user.role)}
        </motion.p>

        <motion.h1
          className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.95 }}
        >
          Welcome, {firstName}
        </motion.h1>

        <motion.p
          className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: prefersReducedMotion ? 0 : 1.05 }}
        >
          Your Community Resource Mapping System dashboard is ready.
        </motion.p>
      </motion.div>
    </div>
  )
}
