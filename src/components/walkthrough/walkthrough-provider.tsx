'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type {
  WalkthroughProgressRecord,
  WalkthroughProgressStore,
  WalkthroughStep,
  WalkthroughTour,
} from './types'

const STORAGE_KEY = 'crms-walkthrough-progress-v1'
const POPOVER_WIDTH = 380
const VIEWPORT_GAP = 16

type TargetRect = {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

type StartOptions = {
  force?: boolean
}

type WalkthroughContextValue = {
  hydrated: boolean
  activeTourId: string | null
  registerTour: (tour: WalkthroughTour) => void
  unregisterTour: (tourId: string) => void
  startTour: (tourId: string, options?: StartOptions) => boolean
  restartTour: (tourId: string) => boolean
  closeTour: () => void
  getProgress: (tourId: string) => WalkthroughProgressRecord | null
  isCurrentVersionComplete: (tour: WalkthroughTour) => boolean
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null)

function readProgress(): WalkthroughProgressStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? (parsed as WalkthroughProgressStore)
      : {}
  } catch {
    return {}
  }
}

function normalizeRect(rect: DOMRect, padding: number): TargetRect {
  const left = Math.max(VIEWPORT_GAP, rect.left - padding)
  const top = Math.max(VIEWPORT_GAP, rect.top - padding)
  const right = Math.min(window.innerWidth - VIEWPORT_GAP, rect.right + padding)
  const bottom = Math.min(window.innerHeight - VIEWPORT_GAP, rect.bottom + padding)

  return {
    top,
    right,
    bottom,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

function resolvePopoverPosition(
  step: WalkthroughStep,
  target: TargetRect | null,
): CSSProperties {
  const maxWidth = Math.min(
    POPOVER_WIDTH,
    Math.max(280, window.innerWidth - VIEWPORT_GAP * 2),
  )

  if (!target || step.placement === 'center') {
    return {
      width: maxWidth,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  const estimatedHeight = 300
  const requested = step.placement ?? 'auto'
  let placement = requested

  if (placement === 'auto') {
    const spaces = {
      bottom: window.innerHeight - target.bottom,
      top: target.top,
      right: window.innerWidth - target.right,
      left: target.left,
    }

    placement =
      spaces.bottom >= estimatedHeight + VIEWPORT_GAP
        ? 'bottom'
        : spaces.top >= estimatedHeight + VIEWPORT_GAP
          ? 'top'
          : spaces.right >= maxWidth + VIEWPORT_GAP
            ? 'right'
            : spaces.left >= maxWidth + VIEWPORT_GAP
              ? 'left'
              : 'bottom'
  }

  let left = target.left + target.width / 2 - maxWidth / 2
  let top = target.bottom + VIEWPORT_GAP

  if (placement === 'top') {
    top = target.top - estimatedHeight - VIEWPORT_GAP
  } else if (placement === 'right') {
    left = target.right + VIEWPORT_GAP
    top = target.top + target.height / 2 - estimatedHeight / 2
  } else if (placement === 'left') {
    left = target.left - maxWidth - VIEWPORT_GAP
    top = target.top + target.height / 2 - estimatedHeight / 2
  }

  left = Math.max(
    VIEWPORT_GAP,
    Math.min(left, window.innerWidth - maxWidth - VIEWPORT_GAP),
  )
  top = Math.max(
    VIEWPORT_GAP,
    Math.min(top, window.innerHeight - estimatedHeight - VIEWPORT_GAP),
  )

  return { width: maxWidth, left, top }
}

function TourOverlay({
  tour,
  stepIndex,
  onBack,
  onNext,
  onSkip,
  onFinish,
}: {
  tour: WalkthroughTour
  stepIndex: number
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  onFinish: () => void
}) {
  const step = tour.steps[stepIndex]
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [stepReady, setStepReady] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const isLast = stepIndex === tour.steps.length - 1

  useEffect(() => {
    let cancelled = false
    let resizeObserver: ResizeObserver | null = null
    let target: Element | null = null
    const timers: number[] = []

    async function prepareStep() {
      setStepReady(false)
      setTargetRect(null)

      try {
        await step.beforeEnter?.()
      } catch {
        // A tour remains usable even when an optional preparation action fails.
      }

      if (cancelled) return

      const updateTarget = () => {
        if (cancelled || !step.target) {
          setTargetRect(null)
          setStepReady(true)
          return
        }

        target = document.querySelector(step.target)
        if (!target) {
          setTargetRect(null)
          setStepReady(true)
          return
        }

        const rect = target.getBoundingClientRect()
        const outsideViewport =
          rect.top < VIEWPORT_GAP ||
          rect.bottom > window.innerHeight - VIEWPORT_GAP ||
          rect.left < VIEWPORT_GAP ||
          rect.right > window.innerWidth - VIEWPORT_GAP

        if (outsideViewport) {
          target.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
            block: 'center',
            inline: 'center',
          })
        }

        const refreshedRect = target.getBoundingClientRect()
        setTargetRect(normalizeRect(refreshedRect, step.padding ?? 8))
        setStepReady(true)
      }

      updateTarget()
      timers.push(window.setTimeout(updateTarget, 250))
      timers.push(window.setTimeout(updateTarget, 600))

      if (target && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(updateTarget)
        resizeObserver.observe(target)
      }

      window.addEventListener('resize', updateTarget)
      window.addEventListener('scroll', updateTarget, true)

      return () => {
        window.removeEventListener('resize', updateTarget)
        window.removeEventListener('scroll', updateTarget, true)
      }
    }

    let removeListeners: (() => void) | undefined
    void prepareStep().then((cleanup) => {
      removeListeners = cleanup
    })

    return () => {
      cancelled = true
      removeListeners?.()
      resizeObserver?.disconnect()
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [step])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [stepIndex, stepReady])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onSkip()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        isLast ? onFinish() : onNext()
      } else if (event.key === 'ArrowLeft' && stepIndex > 0) {
        event.preventDefault()
        onBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLast, onBack, onFinish, onNext, onSkip, stepIndex])

  if (!stepReady) return null

  const popoverStyle = resolvePopoverPosition(step, targetRect)
  const progress = ((stepIndex + 1) / tour.steps.length) * 100

  return createPortal(
    <div className="fixed inset-0 z-[10000]" aria-live="polite">
      {targetRect ? (
        <>
          <div
            className="fixed left-0 right-0 top-0 bg-slate-950/70 backdrop-blur-[1px]"
            style={{ height: targetRect.top }}
          />
          <div
            className="fixed bottom-0 left-0 right-0 bg-slate-950/70 backdrop-blur-[1px]"
            style={{ top: targetRect.bottom }}
          />
          <div
            className="fixed left-0 bg-slate-950/70 backdrop-blur-[1px]"
            style={{
              top: targetRect.top,
              width: targetRect.left,
              height: targetRect.height,
            }}
          />
          <div
            className="fixed right-0 bg-slate-950/70 backdrop-blur-[1px]"
            style={{
              top: targetRect.top,
              left: targetRect.right,
              height: targetRect.height,
            }}
          />
          <div
            className="pointer-events-none fixed rounded-2xl border-2 border-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.16),0_0_42px_rgba(16,185,129,0.35)]"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
      )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-step-title"
        aria-describedby="walkthrough-step-description"
        tabIndex={-1}
        className="fixed z-[10001] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-[0_30px_100px_rgba(2,6,23,0.35)] outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
        style={popoverStyle}
      >
        <div className="h-1.5 bg-slate-100 dark:bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                {step.eyebrow ?? tour.title}
              </p>
              <h2
                id="walkthrough-step-title"
                className="mt-2 text-xl font-semibold tracking-tight"
              >
                {step.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Skip walkthrough"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p
            id="walkthrough-step-description"
            className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300"
          >
            {step.description}
          </p>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Step {stepIndex + 1} of {tour.steps.length}
            </span>

            <div className="flex items-center gap-2">
              {stepIndex === 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
                  Skip
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              {isLast ? (
                <Button type="button" size="sm" onClick={onFinish}>
                  <Check className="h-4 w-4" />
                  Finish
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={onNext}>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [tours, setTours] = useState<Record<string, WalkthroughTour>>({})
  const [progress, setProgress] = useState<WalkthroughProgressStore>({})
  const [hydrated, setHydrated] = useState(false)
  const [activeTour, setActiveTour] = useState<WalkthroughTour | null>(null)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setProgress(readProgress())
    setHydrated(true)
  }, [])

  const persistProgress = useCallback(
    (tour: WalkthroughTour, status: 'completed' | 'skipped') => {
      const record: WalkthroughProgressRecord = {
        version: tour.version,
        status,
        updatedAt: new Date().toISOString(),
      }

      setProgress((current) => {
        const next = { ...current, [tour.id]: record }
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Completion persistence is helpful but should never break the app.
        }
        return next
      })
    },
    [],
  )

  const registerTour = useCallback((tour: WalkthroughTour) => {
    setTours((current) => ({ ...current, [tour.id]: tour }))
  }, [])

  const unregisterTour = useCallback((tourId: string) => {
    setTours((current) => {
      const next = { ...current }
      delete next[tourId]
      return next
    })
  }, [])

  const startTour = useCallback(
    (tourId: string, options: StartOptions = {}) => {
      const tour = tours[tourId]
      if (!tour || tour.steps.length === 0) return false

      const saved = progress[tour.id]
      const alreadySeen = saved?.version === tour.version
      if (alreadySeen && !options.force) return false

      setStepIndex(0)
      setActiveTour(tour)
      return true
    },
    [progress, tours],
  )

  const restartTour = useCallback(
    (tourId: string) => startTour(tourId, { force: true }),
    [startTour],
  )

  const closeTour = useCallback(() => {
    setActiveTour(null)
    setStepIndex(0)
  }, [])

  const skipTour = useCallback(() => {
    if (activeTour) persistProgress(activeTour, 'skipped')
    closeTour()
  }, [activeTour, closeTour, persistProgress])

  const finishTour = useCallback(() => {
    if (activeTour) persistProgress(activeTour, 'completed')
    closeTour()
  }, [activeTour, closeTour, persistProgress])

  const nextStep = useCallback(() => {
    if (!activeTour) return
    setStepIndex((current) =>
      Math.min(current + 1, activeTour.steps.length - 1),
    )
  }, [activeTour])

  const previousStep = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1))
  }, [])

  const getProgress = useCallback(
    (tourId: string) => progress[tourId] ?? null,
    [progress],
  )

  const isCurrentVersionComplete = useCallback(
    (tour: WalkthroughTour) => {
      const saved = progress[tour.id]
      return saved?.version === tour.version && saved.status === 'completed'
    },
    [progress],
  )

  const value = useMemo<WalkthroughContextValue>(
    () => ({
      hydrated,
      activeTourId: activeTour?.id ?? null,
      registerTour,
      unregisterTour,
      startTour,
      restartTour,
      closeTour,
      getProgress,
      isCurrentVersionComplete,
    }),
    [
      activeTour?.id,
      closeTour,
      getProgress,
      hydrated,
      isCurrentVersionComplete,
      registerTour,
      restartTour,
      startTour,
      unregisterTour,
    ],
  )

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
      {activeTour && (
        <TourOverlay
          tour={activeTour}
          stepIndex={stepIndex}
          onBack={previousStep}
          onNext={nextStep}
          onSkip={skipTour}
          onFinish={finishTour}
        />
      )}
    </WalkthroughContext.Provider>
  )
}

export function useWalkthrough() {
  const context = useContext(WalkthroughContext)
  if (!context) {
    throw new Error('useWalkthrough must be used inside WalkthroughProvider')
  }
  return context
}

export function useWalkthroughTour(
  tour: WalkthroughTour,
  options: { autoStart?: boolean } = {},
) {
  const {
    hydrated,
    registerTour,
    unregisterTour,
    startTour,
    restartTour,
    getProgress,
  } = useWalkthrough()

  useEffect(() => {
    registerTour(tour)
    return () => unregisterTour(tour.id)
  }, [registerTour, tour, unregisterTour])

  useEffect(() => {
    if (!hydrated || !options.autoStart) return
    const timer = window.setTimeout(() => {
      startTour(tour.id)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [hydrated, options.autoStart, startTour, tour.id])

  return {
    progress: getProgress(tour.id),
    start: () => startTour(tour.id, { force: true }),
    restart: () => restartTour(tour.id),
  }
}

export function RestartWalkthroughButton({
  tourId,
  label = 'Restart tour',
}: {
  tourId: string
  label?: string
}) {
  const { restartTour } = useWalkthrough()

  return (
    <Button type="button" variant="outline" onClick={() => restartTour(tourId)}>
      <RotateCcw className="h-4 w-4" />
      {label}
    </Button>
  )
}
