'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  const [refreshSeconds, setRefreshSeconds] = useState(30)
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

  useEffect(() => {
    if (refreshSeconds <= 0) return

    const interval = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        navigator.onLine
      ) {
        loadMap(false)
      }
    }, refreshSeconds * 1000)

    return () => window.clearInterval(interval)
  }, [loadMap, refreshSeconds])

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
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString('en-PH')}`
              : 'Waiting for the first server refresh'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(refreshSeconds)}
            onValueChange={(value) =>
              setRefreshSeconds(Number(value))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">
                Auto refresh off
              </SelectItem>
              <SelectItem value="15">
                Every 15 seconds
              </SelectItem>
              <SelectItem value="30">
                Every 30 seconds
              </SelectItem>
              <SelectItem value="60">
                Every minute
              </SelectItem>
              <SelectItem value="120">
                Every 2 minutes
              </SelectItem>
            </SelectContent>
          </Select>

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
              points={points}
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
