'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

/**
 * Carousel — a reusable, accessible carousel primitive.
 *
 * Manages: current index, direction, paused state, auto-advance,
 * keyboard navigation (← → space), animated counter (01 / N),
 * prev/next/pause controls, progress dots, and AnimatePresence
 * slide transitions with directional x-offset.
 *
 * The consumer provides:
 *  - `slides`: array of slide descriptors (must have `id` + `index` + `total`)
 *  - `renderSlide`: content for the active slide
 *  - `renderHeader`: optional per-slide header (above the content)
 *  - `accentColor`: drives the progress dot + glow tint
 *  - `ariaLabel`: for the carousel region
 */
export interface CarouselSlide {
  id: string
  index: number
  total: number
}

interface CarouselProps<T extends CarouselSlide> {
  slides: T[]
  renderSlide: (slide: T) => ReactNode
  renderHeader?: (slide: T) => ReactNode
  accentColor?: string
  autoAdvanceMs?: number
  ariaLabel?: string
  /** When true, disables auto-advance (e.g. if only 1 slide). */
  disableAutoAdvance?: boolean
  /** Optional className for the outer container. */
  className?: string
}

export function Carousel<T extends CarouselSlide>({
  slides,
  renderSlide,
  renderHeader,
  accentColor = '#34d399',
  autoAdvanceMs = 6500,
  ariaLabel = 'Carousel',
  disableAutoAdvance = false,
  className = '',
}: CarouselProps<T>) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [direction, setDirection] = useState(1)

  // Guard against empty slides
  const safeCurrent = slides.length === 0 ? 0 : Math.min(current, slides.length - 1)
  const slide = slides[safeCurrent]

  const goTo = useCallback(
    (idx: number, dir = 1) => {
      if (slides.length === 0) return
      setDirection(dir)
      setCurrent((idx + slides.length) % slides.length)
    },
    [slides.length]
  )

  const next = useCallback(() => goTo(safeCurrent + 1, 1), [safeCurrent, goTo])
  const prev = useCallback(() => goTo(safeCurrent - 1, -1), [safeCurrent, goTo])

  // Auto-advance
  useEffect(() => {
    if (isPaused || disableAutoAdvance || slides.length <= 1) return
    const id = setInterval(() => {
      setDirection(1)
      setCurrent((c) => (c + 1) % slides.length)
    }, autoAdvanceMs)
    return () => clearInterval(id)
  }, [isPaused, disableAutoAdvance, slides.length, autoAdvanceMs])

  // Keyboard navigation
  useEffect(() => {
    if (slides.length <= 1) return
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      if (e.key === ' ') { e.preventDefault(); setIsPaused((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, slides.length])

  // Note: we intentionally do NOT reset to slide 0 when the slides array
  // changes. Instead, `safeCurrent` clamps the index to a valid range,
  // which gives smoother UX when live data refreshes in the background.

  if (!slide) {
    return (
      <div className={`rounded-3xl border border-emerald-500/15 bg-emerald-950/30 p-12 text-center text-sm text-emerald-100/50 ${className}`}>
        No slides to display.
      </div>
    )
  }

  const showCounter = slides.length > 1

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-gradient-to-b from-emerald-950/50 to-[#061410]/80 p-6 backdrop-blur-sm md:p-8 ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      {/* Accent glow */}
      <div
        key={`glow-${slide.id}`}
        className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full opacity-30 blur-[100px] transition-colors duration-700"
        style={{ background: accentColor }}
        aria-hidden="true"
      />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={slide.id}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {renderHeader?.(slide)}
          {renderSlide(slide)}
        </motion.div>
      </AnimatePresence>

      {/* Controls row — only when more than 1 slide */}
      {showCounter && (
        <div className="mt-6 flex items-center justify-between">
          {/* Counter */}
          <div className="flex items-baseline gap-1 font-mono">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={slide.index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-2xl font-bold text-emerald-300 md:text-3xl"
              >
                {String(slide.index).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
            <span className="text-sm text-emerald-500/50 md:text-base">
              / {String(slide.total).padStart(2, '0')}
            </span>
          </div>

          {/* Dots + buttons */}
          <div className="flex items-center gap-3">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i, i > safeCurrent ? 1 : -1)}
                  aria-label={`Go to slide ${s.index}`}
                  aria-current={i === safeCurrent}
                  className="group relative h-1.5 overflow-hidden rounded-full transition-all"
                  style={{ width: i === safeCurrent ? 32 : 12 }}
                >
                  <span className="absolute inset-0 bg-emerald-500/20" />
                  {i === safeCurrent && (
                    <motion.span
                      className="absolute inset-0 origin-left"
                      style={{ backgroundColor: accentColor }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isPaused ? 1 : [0, 1] }}
                      transition={{
                        duration: isPaused ? 0.2 : autoAdvanceMs / 1000,
                        ease: 'linear',
                      }}
                    />
                  )}
                  {i !== safeCurrent && (
                    <span className="absolute inset-0 bg-emerald-500/30 transition-colors group-hover:bg-emerald-400/50" />
                  )}
                </button>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={prev}
                aria-label="Previous slide"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-950/40 text-emerald-200 transition-all hover:border-emerald-400/60 hover:bg-emerald-900/40 hover:text-emerald-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsPaused((p) => !p)}
                aria-label={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-950/40 text-emerald-200 transition-all hover:border-emerald-400/60 hover:bg-emerald-900/40 hover:text-emerald-50"
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={next}
                aria-label="Next slide"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-950/40 text-emerald-200 transition-all hover:border-emerald-400/60 hover:bg-emerald-900/40 hover:text-emerald-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
