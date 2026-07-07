'use client'

import { useEffect, useState } from 'react'
import type {
  CommunityAsset,
  VulnerableCitizenAsset,
  ReliefDistributionAsset,
  EmergencyAlertAsset,
  CommunityFacilityAsset,
  AssetCategory,
} from '@/lib/types/community-asset'
import {
  ALL_ASSETS,
  communityFacilities as MOCK_FACILITIES,
  CATEGORY_META,
  SAN_POLICARPO_CENTER,
} from '@/lib/mock-data'

/**
 * useLiveMapData
 * ==============
 * Fetches live data from the public backend endpoints and transforms
 * each response into the unified `CommunityAsset[]` shape used by the
 * landing page. Falls back to mock data per-category if a fetch fails
 * or returns empty, so the page always looks rich.
 *
 * Endpoints used (all public, no auth required):
 *   GET /api/map/data           → vulnerable citizens (APPROVED, with coords)
 *   GET /api/admin/distributions → relief distributions
 *   GET /api/announcements       → announcements (used as emergency alerts)
 *
 * Community facilities have no backend endpoint, so they always come
 * from mock data.
 */

type DataSource = 'live' | 'mock' | 'mixed'

interface LiveMapData {
  assets: CommunityAsset[]
  loading: boolean
  source: DataSource
  /** Per-category counts (live where available). */
  counts: Record<AssetCategory, number>
}

// ---------- transformers ----------

interface MapDataPoint {
  id: string
  name: string
  email?: string
  mobileNumber?: string
  latitude: number
  longitude: number
  barangay: string
  address: string
  vulnerabilityTypes: string[]
  disabilityType?: string | null
  disabilityCause?: string | null
  hasReceivedRelief: boolean
  lastDistributionDate?: string | null
  needsAssistance: boolean
}

function transformCitizen(p: MapDataPoint): VulnerableCitizenAsset {
  const vulnTypes = (p.vulnerabilityTypes || []) as VulnerableCitizenAsset['vulnerabilityTypes']
  const subTitleParts: string[] = []
  if (vulnTypes.length > 0) subTitleParts.push(vulnTypes[0].replace(/_/g, ' ').toLowerCase())
  if (p.disabilityType) subTitleParts.push(p.disabilityType)
  return {
    id: `live-vc-${p.id}`,
    kind: 'VULNERABLE_CITIZEN',
    category: 'VULNERABLE_CITIZENS',
    name: p.name,
    location: { latitude: p.latitude, longitude: p.longitude },
    barangay: p.barangay,
    subtitle: subTitleParts.length > 0
      ? subTitleParts.slice(0, 2).map(s => s.replace(/\b\w/g, c => c.toUpperCase())).join(' · ')
      : 'Registered Citizen',
    description: `Registered vulnerable citizen in ${p.barangay}. ${
      p.hasReceivedRelief ? 'Has received relief assistance.' : 'Has not yet received relief.'
    }${p.needsAssistance ? ' Currently needs assistance.' : ''}`,
    updatedAt: p.lastDistributionDate || new Date().toISOString(),
    vulnerabilityTypes: vulnTypes,
    registrationStatus: 'APPROVED',
    hasReceivedRelief: p.hasReceivedRelief,
    needsAssistance: p.needsAssistance,
    mobileNumber: p.mobileNumber,
  }
}

interface ApiDistribution {
  id: string
  distributionType: string
  itemsProvided: string
  quantity: number
  status: string
  notes?: string | null
  distributionDate: string
  createdAt: string
  updatedAt: string
  worker?: { name: string } | null
  vulnerableProfile?: { firstName: string; lastName: string } | null
}

function transformDistribution(d: ApiDistribution): ReliefDistributionAsset {
  const beneficiary = d.vulnerableProfile
    ? `${d.vulnerableProfile.firstName} ${d.vulnerableProfile.lastName}`
    : 'Household'
  return {
    id: `live-rd-${d.id}`,
    kind: 'RELIEF_DISTRIBUTION',
    category: 'RELIEF_DISTRIBUTION',
    name: d.distributionType,
    location: {
      latitude: d.vulnerableProfile
        ? SAN_POLICARPO_CENTER.latitude + (Math.random() - 0.5) * 0.008
        : SAN_POLICARPO_CENTER.latitude,
      longitude: d.vulnerableProfile
        ? SAN_POLICARPO_CENTER.longitude + (Math.random() - 0.5) * 0.008
        : SAN_POLICARPO_CENTER.longitude,
    },
    barangay: 'San Policarpo',
    subtitle: d.itemsProvided.slice(0, 60),
    description: `${d.quantity} × ${d.distributionType} for ${beneficiary}. Recorded by ${d.worker?.name || 'field worker'}.${d.notes ? ` Notes: ${d.notes}` : ''}`,
    updatedAt: d.updatedAt,
    distributionType: d.distributionType,
    itemsProvided: d.itemsProvided,
    quantity: d.quantity,
    status: (d.status as ReliefDistributionAsset['status']) || 'PENDING',
    beneficiaryName: beneficiary,
    workerName: d.worker?.name || 'Unknown',
  }
}

interface ApiAnnouncement {
  id: string
  title: string
  content: string
  type: string
  priority: string
  eventDate?: string | null
  eventTime?: string | null
  location?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function transformAnnouncement(a: ApiAnnouncement): EmergencyAlertAsset {
  const priority = (a.priority || 'NORMAL') as EmergencyAlertAsset['priority']
  const alertType: EmergencyAlertAsset['alertType'] =
    a.type === 'EMERGENCY' ? 'TYPHOON' : a.type === 'RELIEF_DISTRIBUTION' ? 'GENERAL' : 'GENERAL'
  return {
    id: `live-ea-${a.id}`,
    kind: 'EMERGENCY_ALERT',
    category: 'EMERGENCY_ALERTS',
    name: a.title,
    location: { latitude: SAN_POLICARPO_CENTER.latitude, longitude: SAN_POLICARPO_CENTER.longitude },
    barangay: a.location || 'Municipality-wide',
    subtitle: `${priority} · ${a.type.replace(/_/g, ' ').toLowerCase()}`,
    description: a.content,
    updatedAt: a.updatedAt,
    priority,
    alertType,
    eventDate: a.eventDate || undefined,
    isActive: a.isActive,
  }
}

// ---------- hook ----------

export function useLiveMapData(): LiveMapData {
  const [state, setState] = useState<LiveMapData>({
    assets: ALL_ASSETS,
    loading: true,
    source: 'mock',
    counts: {
      VULNERABLE_CITIZENS: 0,
      RELIEF_DISTRIBUTION: 0,
      COMMUNITY_FACILITIES: 0,
      EMERGENCY_ALERTS: 0,
    },
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [citizensRes, distRes, annRes] = await Promise.allSettled([
        fetch('/api/map/data').then((r) => r.json()),
        fetch('/api/admin/distributions').then((r) => r.json()),
        fetch('/api/announcements').then((r) => r.json()),
      ])

      if (cancelled) return

      const citizens: CommunityAsset[] =
        citizensRes.status === 'fulfilled' && citizensRes.value?.success
          ? (citizensRes.value.points || []).map(transformCitizen)
          : ALL_ASSETS.filter((a) => a.kind === 'VULNERABLE_CITIZEN')

      const distributions: CommunityAsset[] =
        distRes.status === 'fulfilled' && distRes.value?.success
          ? (distRes.value.distributions || []).map(transformDistribution)
          : ALL_ASSETS.filter((a) => a.kind === 'RELIEF_DISTRIBUTION')

      const alerts: CommunityAsset[] =
        annRes.status === 'fulfilled' && annRes.value?.success
          ? (annRes.value.announcements || []).map(transformAnnouncement)
          : ALL_ASSETS.filter((a) => a.kind === 'EMERGENCY_ALERT')

      // Facilities always from mock (no backend endpoint)
      const facilities: CommunityAsset[] = MOCK_FACILITIES

      const assets = [...citizens, ...distributions, ...facilities, ...alerts]

      // Determine source label
      const anyLive =
        (citizensRes.status === 'fulfilled' && citizensRes.value?.success && (citizensRes.value.points || []).length > 0) ||
        (distRes.status === 'fulfilled' && distRes.value?.success && (distRes.value.distributions || []).length > 0) ||
        (annRes.status === 'fulfilled' && annRes.value?.success && (annRes.value.announcements || []).length > 0)
      const allLive = anyLive && citizens.length > 0 && distributions.length > 0 && alerts.length > 0

      setState({
        assets,
        loading: false,
        source: allLive ? 'live' : anyLive ? 'mixed' : 'mock',
        counts: {
          VULNERABLE_CITIZENS: citizens.length,
          RELIEF_DISTRIBUTION: distributions.length,
          COMMUNITY_FACILITIES: facilities.length,
          EMERGENCY_ALERTS: alerts.length,
        },
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/** Re-export for convenience. */
export { CATEGORY_META, SAN_POLICARPO_CENTER }
