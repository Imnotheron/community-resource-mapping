'use client'

import * as React from 'react'
import {
  Check,
  ChevronDown,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type SmartDropdownPrefs = {
  counts: Record<string, number>
  hidden: string[]
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>()

  return values.filter((value) => {
    const clean = String(value || '').trim()
    if (!clean) return false

    const key = normalize(clean)
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

export function SmartEditableSelect({
  value,
  onValueChange,
  options,
  storageKey,
  placeholder = 'Select or type a value',
  disabled = false,
  className,
  learnAfter = 3,
}: {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  storageKey: string
  placeholder?: string
  disabled?: boolean
  className?: string
  learnAfter?: number
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [prefs, setPrefs] = React.useState<SmartDropdownPrefs>({
    counts: {},
    hidden: [],
  })
  const [removeTarget, setRemoveTarget] = React.useState<string | null>(null)
  const typedDuringFocusRef = React.useRef(false)
  const blurTimerRef = React.useRef<number | null>(null)

  const localStorageKey = React.useMemo(
    () => `crms-smart-dropdown:${storageKey}`,
    [storageKey],
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(localStorageKey)
      if (!raw) return

      const parsed = JSON.parse(raw)
      setPrefs({
        counts:
          parsed &&
          typeof parsed.counts === 'object' &&
          parsed.counts
            ? parsed.counts
            : {},
        hidden: Array.isArray(parsed?.hidden)
          ? parsed.hidden
          : [],
      })
    } catch {
      // Keep the default preferences if local browser storage is malformed.
    }
  }, [localStorageKey])

  const savePrefs = React.useCallback(
    (next: SmartDropdownPrefs) => {
      setPrefs(next)

      if (typeof window === 'undefined') return

      try {
        window.localStorage.setItem(
          localStorageKey,
          JSON.stringify(next),
        )
      } catch {
        // The field remains fully usable even when storage is unavailable.
      }
    },
    [localStorageKey],
  )

  const baseOptions = React.useMemo(
    () => uniqueValues(options),
    [options],
  )

  const baseKeys = React.useMemo(
    () =>
      new Set(
        baseOptions.map(normalize),
      ),
    [baseOptions],
  )

  const hiddenKeys = React.useMemo(
    () =>
      new Set(
        prefs.hidden.map(normalize),
      ),
    [prefs.hidden],
  )

  const learnedOptions = React.useMemo(
    () =>
      Object.entries(prefs.counts)
        .filter(
          ([label, count]) =>
            count >= learnAfter &&
            !baseKeys.has(normalize(label)),
        )
        .sort((a, b) => {
          const countCompare = b[1] - a[1]
          if (countCompare !== 0) return countCompare
          return a[0].localeCompare(b[0])
        })
        .map(([label]) => label),
    [baseKeys, learnAfter, prefs.counts],
  )

  const allVisibleOptions = React.useMemo(
    () =>
      uniqueValues([
        ...baseOptions,
        ...learnedOptions,
      ]).filter(
        (option) =>
          !hiddenKeys.has(normalize(option)),
      ),
    [
      baseOptions,
      hiddenKeys,
      learnedOptions,
    ],
  )

  const filteredOptions = React.useMemo(() => {
    const needle = normalize(query)
    if (!needle) return allVisibleOptions

    return allVisibleOptions.filter(
      (option) =>
        normalize(option).includes(
          needle,
        ),
    )
  }, [allVisibleOptions, query])

  const exactVisibleMatch =
    allVisibleOptions.some(
      (option) =>
        normalize(option) ===
        normalize(query),
    )

  const manualCandidate =
    query.trim() &&
    !exactVisibleMatch
      ? query.trim()
      : ''

  const hiddenCount =
    prefs.hidden.length

  const recordCustomUsage =
    React.useCallback(
      (rawValue: string) => {
        const clean = rawValue.trim()
        if (
          !clean ||
          baseKeys.has(normalize(clean))
        ) {
          return
        }

        const existingKey =
          Object.keys(prefs.counts).find(
            (candidate) =>
              normalize(candidate) ===
              normalize(clean),
          )

        const key =
          existingKey || clean

        const next = {
          ...prefs,
          counts: {
            ...prefs.counts,
            [key]:
              (prefs.counts[key] || 0) +
              1,
          },
        }

        savePrefs(next)
      },
      [
        baseKeys,
        prefs,
        savePrefs,
      ],
    )

  const commitValue = React.useCallback(
    (
      rawValue: string,
      recordUsage = true,
    ) => {
      const clean = rawValue.trim()
      if (!clean) return

      onValueChange(clean)

      if (recordUsage) {
        recordCustomUsage(clean)
      }

      typedDuringFocusRef.current = false
      setQuery('')
      setOpen(false)
    },
    [
      onValueChange,
      recordCustomUsage,
    ],
  )

  const hideOption = React.useCallback(
    (option: string) => {
      const key = normalize(option)

      const hidden = uniqueValues([
        ...prefs.hidden,
        option,
      ])

      savePrefs({
        ...prefs,
        hidden,
      })

      if (
        normalize(value) === key
      ) {
        onValueChange('')
      }
    },
    [
      onValueChange,
      prefs,
      savePrefs,
      value,
    ],
  )

  const restoreHidden =
    React.useCallback(() => {
      savePrefs({
        ...prefs,
        hidden: [],
      })
    }, [prefs, savePrefs])

  React.useEffect(() => {
    return () => {
      if (
        blurTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          blurTimerRef.current,
        )
      }
    }
  }, [])

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            'relative flex h-10 w-full items-center rounded-md border border-input bg-background shadow-xs transition focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
            disabled &&
              'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <input
            type="text"
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            onFocus={() => {
              setQuery('')
              setOpen(true)
            }}
            onChange={(event) => {
              const next =
                event.target.value
              typedDuringFocusRef.current =
                true
              setQuery(next)
              onValueChange(next)
              setOpen(true)
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter'
              ) {
                const candidate =
                  query.trim() ||
                  value.trim()

                if (candidate) {
                  event.preventDefault()
                  commitValue(candidate)
                }
              }

              if (
                event.key ===
                'ArrowDown'
              ) {
                setOpen(true)
              }

              if (
                event.key === 'Escape'
              ) {
                setOpen(false)
              }
            }}
            onBlur={() => {
              if (
                blurTimerRef.current !==
                null
              ) {
                window.clearTimeout(
                  blurTimerRef.current,
                )
              }

              blurTimerRef.current =
                window.setTimeout(() => {
                  if (
                    typedDuringFocusRef.current &&
                    value.trim()
                  ) {
                    recordCustomUsage(
                      value,
                    )
                  }

                  typedDuringFocusRef.current =
                    false
                }, 120)
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="mr-1 h-8 w-8 shrink-0"
            onMouseDown={(event) =>
              event.preventDefault()
            }
            onClick={() => {
              setQuery('')
              setOpen(
                (current) =>
                  !current,
              )
            }}
            aria-label="Open suggestions"
          >
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-anchor-width)] min-w-[280px] p-0"
      >
        <div className="border-b px-3 py-2">
          <p className="text-xs font-semibold text-slate-700">
            Type your own value or choose a suggestion
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
            Custom values become learned suggestions after {learnAfter} uses.
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5">
          {manualCandidate ? (
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-emerald-50"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                commitValue(
                  manualCandidate,
                )
              }
            >
              <Plus className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1 truncate">
                Use “{manualCandidate}”
              </span>
              <span className="text-[0.625rem] text-muted-foreground">
                {Math.min(
                  (prefs.counts[
                    Object.keys(
                      prefs.counts,
                    ).find(
                      (candidate) =>
                        normalize(
                          candidate,
                        ) ===
                        normalize(
                          manualCandidate,
                        ),
                    ) ||
                      manualCandidate
                  ] || 0) + 1,
                  learnAfter,
                )}
                /{learnAfter}
              </span>
            </button>
          ) : null}

          {filteredOptions.length ? (
            filteredOptions.map(
              (option) => {
                const selected =
                  normalize(value) ===
                  normalize(option)
                const learned =
                  !baseKeys.has(
                    normalize(option),
                  )

                return (
                  <div
                    key={option}
                    className="group flex items-center rounded-md hover:bg-accent"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm"
                      onMouseDown={(
                        event,
                      ) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        commitValue(
                          option,
                          learned,
                        )
                      }
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          selected
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {option}
                      </span>
                      {learned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[0.625rem] font-semibold text-violet-700">
                          <Sparkles className="h-3 w-3" />
                          Learned
                        </span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 opacity-70 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                      onMouseDown={(
                        event,
                      ) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setRemoveTarget(option)
                      }}
                      aria-label={`Remove ${option} from this dropdown`}
                      title="Remove from this dropdown"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              },
            )
          ) : !manualCandidate ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No visible suggestions. Type a value to enter it manually.
            </p>
          ) : null}
        </div>

        {hiddenCount > 0 ? (
          <div className="border-t p-1.5">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={
                restoreHidden
              }
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore {hiddenCount} removed choice{hiddenCount === 1 ? '' : 's'}
            </button>
          </div>
        ) : null}
      </PopoverContent>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) {
            hideOption(removeTarget)
          }
        }}
        title="Remove dropdown option?"
        description={
          removeTarget
            ? `Remove “${removeTarget}” from this dropdown on this browser? You can restore removed choices later.`
            : 'Remove this option from the dropdown?'
        }
        confirmLabel="Remove option"
        cancelLabel="Keep option"
        variant="destructive"
      />
    </Popover>
  )
}
