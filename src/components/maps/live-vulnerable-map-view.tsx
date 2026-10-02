'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

type RecapMode = 'DAY' | 'WEEK' | 'MONTH' | 'DATE'

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  )
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  )
}

function getRecapRange(
  mode: RecapMode,
  selectedDate: string,
) {
  const now = new Date()

  if (mode === 'DATE') {
    const [year, month, day] = selectedDate
      .split('-')
      .map(Number)

    if (!year || !month || !day) {
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      }
    }

    const date = new Date(year, month - 1, day)
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    }
  }

  if (mode === 'WEEK') {
    const start = startOfDay(now)
    const weekday = start.getDay()
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1
    start.setDate(start.getDate() - daysFromMonday)

    const end = endOfDay(new Date(start))
    end.setDate(end.getDate() + 6)

    return { start, end }
  }

  if (mode === 'MONTH') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    }
  }

  return {
    start: startOfDay(now),
    end: endOfDay(now),
  }
}

function getRecapLabel(
  mode: RecapMode,
  selectedDate: string,
) {
  if (mode === 'WEEK') return 'This week'
  if (mode === 'MONTH') return 'This month'
  if (mode === 'DATE') {
    const [year, month, day] = selectedDate
      .split('-')
      .map(Number)

    if (year && month && day) {
      return new Date(year, month - 1, day).toLocaleDateString(
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

  return 'Today'
}

export function LiveVulnerableMapView({
  title = 'Vulnerable Citizens Map',
  description = 'Live operational map of approved active vulnerable citizen records.',
  onViewProfile,
}: {
  title?: string
  description?: string
  onViewProfile?: (
    profileId: string,
    point: VulnerablePoint,
  ) => void
}) {
  const [points, setPoints] = useState<VulnerablePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [recapMode, setRecapMode] = useState<RecapMode>('DAY')
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateInputValue(new Date()),
  )
  const [resetVersion, setResetVersion] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadMap = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)

    try {
      const data = await apiFetch<{
        points?: VulnerablePoint[]
      }>(`/api/map/data?fresh=${Date.now()}`, {
        cache: 'no-store',
      })

      setPoints(data.points || [])
      setLastUpdated(new Date())
    } catch (error: any) {
      toast.error('Failed to refresh vulnerable map', {
        description:
          error?.message || 'Unable to load current map data.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMap(true)
  }, [loadMap])

  // Keep the map fresh automatically without exposing a seconds-based
  // refresh selector. The visible control is reserved for record recaps.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        navigator.onLine
      ) {
        loadMap(false)
      }
    }, 60 * 1000)

    return () => window.clearInterval(interval)
  }, [loadMap])

  const filteredPoints = useMemo(() => {
    const { start, end } = getRecapRange(
      recapMode,
      selectedDate,
    )

    return points.filter((point) => {
      if (!point.registrationDate) return false

      const registered = new Date(point.registrationDate)
      if (Number.isNaN(registered.getTime())) return false

      return registered >= start && registered <= end
    })
  }, [points, recapMode, selectedDate])

  const recapLabel = getRecapLabel(
    recapMode,
    selectedDate,
  )

  async function resetMap() {
    setResetVersion((version) => version + 1)
    await loadMap(false)
    toast.success('Map reset using the latest server data')
  }

  return (
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
            {recapLabel} · Showing {filteredPoints.length} of {points.length} active record{points.length === 1 ? '' : 's'}
            {lastUpdated
              ? ` · Last synced ${lastUpdated.toLocaleTimeString('en-PH')}`
              : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={recapMode}
            onValueChange={(value) =>
              setRecapMode(value as RecapMode)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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

          {recapMode === 'DATE' ? (
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={selectedDate}
                max={toDateInputValue(new Date())}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                className="w-[175px] pl-9"
                aria-label="Select recap date"
              />
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={resetMap}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Reset map
          </Button>
        </div>
      </div>

      {loading ? (
        <WowLoader
          compact
          label="Loading map data"
          description="Fetching active vulnerable records..."
          className="h-[420px]"
        />
      ) : (
        <Card>
          <CardContent className="p-2">
            <VulnerableMap
              points={filteredPoints}
              height={500}
              resetVersion={resetVersion}
              onViewProfile={onViewProfile}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
