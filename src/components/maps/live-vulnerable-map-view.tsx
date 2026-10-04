'use client'

import dynamic from 'next/dynamic'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  CalendarClock,
  CalendarDays,
  RefreshCw,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
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

function toManilaDateInputValue(
  value: string | Date | null,
) {
  if (!value) return ''

  const date =
    value instanceof Date
      ? value
      : new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return ''
  }

  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(date)
}

function buildMapQuery(
  selectedDate: string,
) {
  const params =
    new URLSearchParams()

  params.set(
    'fresh',
    String(Date.now()),
  )

  if (selectedDate) {
    params.set(
      'asOf',
      selectedDate,
    )
  }

  return params.toString()
}

function historicalLabel(
  selectedDate: string,
) {
  if (!selectedDate) {
    return 'Current relief cycle'
  }

  const [year, month, day] =
    selectedDate
      .split('-')
      .map(Number)

  if (!year || !month || !day) {
    return 'Selected date'
  }

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

  const [
    selectedDate,
    setSelectedDate,
  ] = useState('')

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
    autoResetDate,
    setAutoResetDate,
  ] = useState('')

  const [
    savedAutoResetDate,
    setSavedAutoResetDate,
  ] = useState('')

  const [
    scheduleDirty,
    setScheduleDirty,
  ] = useState(false)

  const [
    savingSchedule,
    setSavingSchedule,
  ] = useState(false)

  const [
    scheduleDialogOpen,
    setScheduleDialogOpen,
  ] = useState(false)

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
      dateOverride?: string,
    ) => {
      if (showLoader) {
        setLoading(true)
      }

      const date =
        dateOverride !== undefined
          ? dateOverride
          : selectedDate

      try {
        const query =
          buildMapQuery(date)

        const data =
          await apiFetch<{
            points?: VulnerablePoint[]
            cycleStartedAt?: string | null
            autoResetAt?: string | null
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

        const scheduledDate =
          toManilaDateInputValue(
            data.autoResetAt ||
              null,
          )

        setSavedAutoResetDate(
          scheduledDate,
        )

        if (!scheduleDirty) {
          setAutoResetDate(
            scheduledDate,
          )
        }

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
      scheduleDirty,
      selectedDate,
    ],
  )

  useEffect(() => {
    loadMap(true)
  }, [loadMap])

  useEffect(() => {
    if (selectedDate) {
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
  }, [loadMap, selectedDate])

  function requestSaveAutoResetDate() {
    if (
      autoResetDate &&
      autoResetDate <
        toDateInputValue(
          new Date(),
        )
    ) {
      toast.error(
        'Choose today or a future date',
      )
      return
    }

    setScheduleDialogOpen(true)
  }

  async function saveAutoResetDate() {
    setSavingSchedule(true)

    try {
      const data =
        await apiFetch<{
          autoResetDate?: string | null
          autoResetAt?: string | null
        }>(
          '/api/map/settings',
          {
            method: 'PUT',
            body: JSON.stringify({
              autoResetDate:
                autoResetDate ||
                null,
            }),
          },
        )

      const nextDate =
        data.autoResetDate ||
        ''

      setAutoResetDate(
        nextDate,
      )
      setSavedAutoResetDate(
        nextDate,
      )
      setScheduleDirty(false)

      await loadMap(
        false,
        selectedDate,
      )

      toast.success(
        nextDate
          ? `Automatic map reset scheduled for ${new Date(`${nextDate}T00:00:00+08:00`).toLocaleDateString('en-PH', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}`
          : 'Automatic map reset schedule cleared',
      )
    } catch (error: any) {
      toast.error(
        'Unable to save automatic reset date',
        {
          description:
            error?.message ||
            'Please try again.',
        },
      )
    } finally {
      setSavingSchedule(false)
      setScheduleDialogOpen(false)
    }
  }

  async function resetCycle() {
    setResettingCycle(true)

    try {
      await apiFetch(
        '/api/map/reset',
        {
          method: 'POST',
        },
      )

      setSelectedDate('')
      setResetVersion(
        (version) =>
          version + 1,
      )

      await loadMap(
        false,
        '',
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
    historicalLabel(
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
              {savedAutoResetDate && !selectedDate
                ? ` · Auto reset scheduled ${new Date(`${savedAutoResetDate}T00:00:00+08:00`).toLocaleDateString('en-PH', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : ''}
              {lastUpdated
                ? ` · Last synced ${lastUpdated.toLocaleTimeString('en-PH')}`
                : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                View map date
              </p>

              <div className="flex items-center gap-1">
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
                    ) => {
                      setSelectedDate(
                        event.target
                          .value,
                      )
                    }}
                    className="w-[175px] pl-9"
                    aria-label="Select historical map date"
                  />
                </div>

                {selectedDate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() =>
                      setSelectedDate('')
                    }
                    title="Return to current cycle"
                    aria-label="Clear selected historical date"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            {allowCycleReset ? (
              <div className="space-y-1">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Auto reset date
                </p>

                <div className="flex items-center gap-1">
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <Input
                      type="date"
                      value={
                        autoResetDate
                      }
                      min={toDateInputValue(
                        new Date(),
                      )}
                      onChange={(
                        event,
                      ) => {
                        setAutoResetDate(
                          event.target
                            .value,
                        )
                        setScheduleDirty(
                          true,
                        )
                      }}
                      className="w-[175px] pl-9"
                      aria-label="Select automatic map reset date"
                    />
                  </div>

                  {autoResetDate ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => {
                        setAutoResetDate('')
                        setScheduleDirty(true)
                      }}
                      title="Clear automatic reset date"
                      aria-label="Clear automatic reset date"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={
                      requestSaveAutoResetDate
                    }
                    disabled={
                      savingSchedule ||
                      !scheduleDirty
                    }
                  >
                    {savingSchedule
                      ? 'Saving…'
                      : 'Save'}
                  </Button>
                </div>
              </div>
            ) : null}

            {allowCycleReset ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
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
        open={scheduleDialogOpen}
        onClose={() =>
          setScheduleDialogOpen(false)
        }
        onConfirm={() => {
          void saveAutoResetDate()
        }}
        title={
          autoResetDate
            ? 'Schedule automatic map reset?'
            : 'Clear automatic reset schedule?'
        }
        description={
          autoResetDate
            ? `The map will automatically start a new relief cycle on ${new Date(`${autoResetDate}T00:00:00+08:00`).toLocaleDateString('en-PH', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}. All active markers will return to red while previous distribution history remains available.`
            : 'This will remove the scheduled automatic reset date. The map will only reset when an Admin manually starts a new relief cycle or schedules another date.'
        }
        confirmLabel={
          autoResetDate
            ? 'Schedule reset'
            : 'Clear schedule'
        }
        cancelLabel="Cancel"
      />

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
