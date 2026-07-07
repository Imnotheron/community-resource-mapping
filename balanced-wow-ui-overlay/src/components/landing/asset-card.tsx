'use client'

import { motion } from 'framer-motion'
import {
  Users, Package, Building2, AlertTriangle, MapPin, Clock,
  CheckCircle2, HeartHandshake, Activity,
} from 'lucide-react'
import type { CommunityAsset } from '@/lib/types/community-asset'
import { CATEGORY_META } from '@/lib/mock-data'

interface AssetCardProps {
  asset: CommunityAsset
  index: number
}

/** Picks the right icon for an asset kind. */
const ASSET_ICONS: Record<CommunityAsset['kind'], React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  VULNERABLE_CITIZEN: Users,
  RELIEF_DISTRIBUTION: Package,
  COMMUNITY_FACILITY: Building2,
  EMERGENCY_ALERT: AlertTriangle,
}

/** Renders a small status pill appropriate to the asset kind. */
function StatusPill({ asset }: { asset: CommunityAsset }) {
  let label = ''
  let color = '#34d399'
  switch (asset.kind) {
    case 'VULNERABLE_CITIZEN':
      if (asset.registrationStatus === 'APPROVED') { label = 'Approved'; color = '#34d399' }
      else if (asset.registrationStatus === 'PENDING') { label = 'Pending'; color = '#f59e0b' }
      else { label = 'Rejected'; color = '#ef4444' }
      break
    case 'RELIEF_DISTRIBUTION':
      label = asset.status.charAt(0) + asset.status.slice(1).toLowerCase()
      color = asset.status === 'APPROVED' || asset.status === 'DISTRIBUTED' ? '#34d399' : asset.status === 'PENDING' ? '#f59e0b' : '#ef4444'
      break
    case 'COMMUNITY_FACILITY':
      label = asset.isOpen ? 'Open' : 'Closed'
      color = asset.isOpen ? '#34d399' : '#94a3b8'
      break
    case 'EMERGENCY_ALERT':
      label = asset.priority
      color = asset.priority === 'URGENT' ? '#ef4444' : asset.priority === 'HIGH' ? '#f59e0b' : '#6ee7b7'
      break
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

export function AssetCard({ asset, index }: AssetCardProps) {
  const Icon = ASSET_ICONS[asset.kind]
  const meta = CATEGORY_META[asset.category]

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.08, ease: 'easeOut' }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-emerald-950/60 to-emerald-950/30 p-5 backdrop-blur-sm transition-all hover:border-emerald-400/40 hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]"
    >
      {/* Accent top bar */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.accentColor}, transparent)` }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{
              borderColor: `${meta.accentColor}40`,
              backgroundColor: `${meta.accentColor}14`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: meta.accentColor }} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-emerald-50">
              {asset.name}
            </h3>
            <p className="truncate text-xs text-emerald-300/60">{asset.subtitle}</p>
          </div>
        </div>
        <StatusPill asset={asset} />
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-emerald-100/60">
        {asset.description}
      </p>

      {/* Footer meta */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-[10px] text-emerald-400/50">
        <span className="flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{asset.barangay}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(asset.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Hover sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${meta.glowColor}, transparent 70%)`,
        }}
      />
    </motion.article>
  )
}

/** Compact stat variant shown in the slider header. */
export function CategoryStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/15 bg-emerald-950/40 px-3 py-2">
      <Icon className="h-4 w-4" style={{ color }} />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-emerald-400/60">{label}</span>
        <span className="text-sm font-semibold text-emerald-50">{value}</span>
      </div>
    </div>
  )
}

// Re-export commonly used icons for convenience
export { CheckCircle2, HeartHandshake, Activity }
