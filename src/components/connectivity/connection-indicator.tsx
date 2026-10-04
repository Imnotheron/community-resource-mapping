'use client'

import { Wifi, WifiOff } from 'lucide-react'

import { useConnectionQuality } from '@/hooks/use-connection-quality'
import { cn } from '@/lib/utils'

const labels = {
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  OFFLINE: 'Offline',
  CHECKING: 'Checking',
} as const

export function ConnectionIndicator({
  className,
  compactOnMobile = false,
}: {
  className?: string
  compactOnMobile?: boolean
}) {
  const { latency, quality } = useConnectionQuality()
  const offline = quality === 'OFFLINE'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur',
        className,
      )}
      title={
        latency == null
          ? `Network: ${labels[quality]}`
          : `CRMS latency: ${latency} ms`
      }
      aria-live="polite"
    >
      {offline ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : (
        <Wifi className="h-3.5 w-3.5" />
      )}
      <span className={cn(compactOnMobile && 'hidden min-[430px]:inline')}>
        {labels[quality]}
      </span>
      {latency != null ? (
        <span className="text-muted-foreground">
          {latency} ms
        </span>
      ) : null}
    </div>
  )
}
