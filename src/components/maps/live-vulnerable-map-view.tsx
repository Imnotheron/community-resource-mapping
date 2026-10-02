'use client'

import dynamic from 'next/dynamic'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  CalendarDays,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WowLoader } from '@/components/ui/wow-loader'
import { apiFetch } from '@/lib/api-client'
import type { VulnerablePoint } from '@/components/maps/vulnerable-map'

const VulnerableMap = dynamic(
  () =>
    import('@/components/maps/vulnerable-map').then(
      (module) => module.VulnerableMap,
    ),
  {
    ssr: false,
    loading: () => (
      <WowLoader
        compact
        label="Loading vulnerable map"
        description="Preparing San Policarpo map markers..."
        className="h-[420px]"
      />
    ),
  },
)

type RecapMode =
  | 'ALL'
  | 'DAY'
  | 'WEEK'
  | 'MONTH'
  | 'DATE'

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function startOfWeek(date: Date) {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  const weekday = start.getDay()
  const daysFromMonday =
    weekday === 0 ? 6 : weekday - 1

  start.setDate(
    start.getDate() -
      daysFromMonday,
  )

  return start
}

function buildMapQuery(
  mode: RecapMode,
  selectedDate: string,
) {
  const params =
    new URLSearchParams()

  params.set(
    'fresh',
    String(Date.now()),
  )

  const today = new Date()

  if (mode === 'DAY') {
    const date =
      toDateInputValue(today)

    params.set('from', date)
    params.set('asOf', date)
  } else if (mode === 'WEEK') {
    params.set(
      'from',
      toDateInputValue(
        startOfWeek(today),
      ),
    )
    params.set(
      'asOf',
      toDateInputValue(today),
    )
  } else if (mode === 'MONTH') {
    params.set(
      'from',
      toDateInputValue(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        ),
      ),
    )
    params.set(
      'asOf',
      toDateInputValue(today),
    )
  } else if (
    mode === 'DATE' &&
    selectedDate
  ) {
    // A selected historical date reconstructs the relief cycle
    // that was active on that date rather than filtering out
    // citizens who had no activity that day.
    params.set(
      'asOf',
      selectedDate,
    )
  }

  return params.toString()
}

function getRecapLabel(
  mode: RecapMode,
  selectedDate: string,
) {
  if (mode === 'ALL') {
    return 'Current relief cycle'
  }

  if (mode === 'DAY') {
    return 'Today'
  }

  if (mode === 'WEEK') {
    return 'This week'
  }

  if (mode === 'MONTH') {
    return 'This month'
  }

  const [year, month, day] =
    selectedDate
      .split('-')
      .map(Number)

  if (year && month && day) {
    return new Date(
      year,
      month - 1,
      day,
    ).toLocaleDateString(
      'en-PH',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      },
    )
  }

  return 'Selected date'
}

export function LiveVulnerableMapView({
  title = 'Vulnerable Citizens Map',
  description = 'Live operational map of approved active vulnerable citizen records.',
  onViewProfile,
  allowCycleReset = false,
}: {
  title?: string
  description?: string
  onViewProfile?: (
    profileId: string,
    point: VulnerablePoint,
  ) => void
  allowCycleReset?: boolean
}) {
  const [points, setPoints] =
    useState<VulnerablePoint[]>([])
  const [loading, setLoading] =
    useState(true)
  const [recapMode, setRecapMode] =
    useState<RecapMode>('ALL')
  const [
    selectedDate,
    setSelectedDate,
  ] = useState(() =>
    toDateInputValue(
      new Date(),
    ),
  )
  const [
    resetVersion,
    setResetVersion,
  ] = useState(0)
  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(null)
  const [
    cycleStartedAt,
    setCycleStartedAt,
  ] = useState<string | null>(null)
  const [
    resetDialogOpen,
    setResetDialogOpen,
  ] = useState(false)
  const [
    resettingCycle,
    setResettingCycle,
  ] = useState(false)

  const loadMap = useCallback(
    async (
      showLoader = false,
      modeOverride?: RecapMode,
    ) => {
      if (showLoader) {
        setLoading(true)
      }

      const mode =
        modeOverride ||
        recapMode

      try {
        const query =
          buildMapQuery(
            mode,
            selectedDate,
          )

        const data =
          await apiFetch<{
            points?: VulnerablePoint[]
            cycleStartedAt?: string | null
          }>(
            `/api/map/data?${query}`,
            {
              cache: 'no-store',
            },
          )

        setPoints(
          data.points || [],
        )
        setCycleStartedAt(
          data.cycleStartedAt ||
            null,
        )
        setLastUpdated(
          new Date(),
        )
      } catch (error: any) {
        toast.error(
          'Failed to refresh vulnerable map',
          {
            description:
              error?.message ||
              'Unable to load current map data.',
          },
        )
      } finally {
        setLoading(false)
      }
    },
    [
      recapMode,
      selectedDate,
    ],
  )

  useEffect(() => {
    loadMap(true)
  }, [loadMap])

  useEffect(() => {
    if (recapMode === 'DATE') {
      return
    }

    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
              'visible' &&
            navigator.onLine
          ) {
            loadMap(false)
          }
        },
        60 * 1000,
      )

    return () =>
      window.clearInterval(
        interval,
      )
  }, [loadMap, recapMode])

  async function resetCycle() {
    setResettingCycle(true)

    try {
      await apiFetch(
        '/api/map/reset',
        {
          method: 'POST',
        },
      )

      setRecapMode('ALL')
      setResetVersion(
        (version) =>
          version + 1,
      )

      await loadMap(
        false,
        'ALL',
      )

      toast.success(
        'New relief cycle started',
        {
          description:
            'All active vulnerable markers are red again until a new approved distribution is recorded.',
        },
      )
    } catch (error: any) {
      toast.error(
        'Unable to reset relief cycle',
        {
          description:
            error?.message ||
            'Please try again.',
        },
      )
    } finally {
      setResettingCycle(false)
      setResetDialogOpen(false)
    }
  }

  const recapLabel =
    getRecapLabel(
      recapMode,
      selectedDate,
    )

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {recapLabel} · Showing {points.length} active vulnerable record{points.length === 1 ? '' : 's'}
              {cycleStartedAt
                ? ` · Cycle began ${new Date(cycleStartedAt).toLocaleString('en-PH')}`
                : ''}
              {lastUpdated
                ? ` · Last synced ${lastUpdated.toLocaleTimeString('en-PH')}`
                : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={recapMode}
              onValueChange={(
                value,
              ) =>
                setRecapMode(
                  value as RecapMode,
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  Current cycle
                </SelectItem>
                <SelectItem value="DAY">
                  By day
                </SelectItem>
                <SelectItem value="WEEK">
                  By week
                </SelectItem>
                <SelectItem value="MONTH">
                  By month
                </SelectItem>
                <SelectItem value="DATE">
                  Select date
                </SelectItem>
              </SelectContent>
            </Select>

            {recapMode ===
            'DATE' ? (
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={
                    selectedDate
                  }
                  max={toDateInputValue(
                    new Date(),
                  )}
                  onChange={(
                    event,
                  ) =>
                    setSelectedDate(
                      event.target
                        .value,
                    )
                  }
                  className="w-[175px] pl-9"
                  aria-label="Select historical map date"
                />
              </div>
            ) : null}

            {allowCycleReset ? (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() =>
                  setResetDialogOpen(
                    true,
                  )
                }
                disabled={
                  loading ||
                  resettingCycle
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${resettingCycle ? 'animate-spin' : ''}`}
                />
                Reset map
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <WowLoader
            compact
            label="Loading map data"
            description="Reconstructing vulnerable records and relief status..."
            className="h-[420px]"
          />
        ) : (
          <Card>
            <CardContent className="p-2">
              <VulnerableMap
                points={points}
                height={500}
                resetVersion={
                  resetVersion
                }
                onViewProfile={
                  onViewProfile
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        onClose={() =>
          setResetDialogOpen(false)
        }
        onConfirm={() => {
          void resetCycle()
        }}
        title="Start a new relief cycle?"
        description="This will make every active vulnerable marker red again. Existing distribution history will not be deleted. As new distributions are approved, those markers will turn green again."
        confirmLabel={
          resettingCycle
            ? 'Resetting…'
            : 'Start new cycle'
        }
        cancelLabel="Cancel"
      />
    </>
  )
}
