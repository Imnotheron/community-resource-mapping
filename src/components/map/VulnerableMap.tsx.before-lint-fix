'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CheckCircle, XCircle, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export interface VulnerablePoint {
  id: string
  name: string
  latitude: number
  longitude: number
  barangay: string
  address: string
  vulnerabilityTypes: string[]
  hasReceivedRelief: boolean
  needsAssistance?: boolean
  lastDistributionDate?: string | null
  lastDistributionType?: string | null
  lastItemsReceived?: string | null
  missingNeeds?: string[] | string | null
  assistanceType?: string | null
  mobileNumber?: string | null
  totalMembers?: number
  vulnerableMembers?: number

  profilePhoto?: string | null
  profilePicture?: string | null
  image?: string | null
  avatarUrl?: string | null
}

interface VulnerableMapProps {
  points: VulnerablePoint[]
  center?: [number, number]
  zoom?: number
  showHeatmap?: boolean
  height?: number
  onViewProfile?: (profileId: string, point?: VulnerablePoint) => void
}

function formatVulnerability(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function normalizeMissingNeeds(value: VulnerablePoint['missingNeeds']) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getProfilePhoto(point: VulnerablePoint) {
  return (
    point.profilePhoto ||
    point.profilePicture ||
    point.image ||
    point.avatarUrl ||
    null
  )
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'VC'
  )
}

function useCustomIcons() {
  return useMemo(
    () => ({
      receivedIcon: new L.DivIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: #10b981;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 10px 24px rgba(15,23,42,0.28);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),

      notReceivedIcon: new L.DivIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: #ef4444;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 10px 24px rgba(15,23,42,0.28);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    }),
    []
  )
}

function MapView({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])

  return null
}

function MapInteractivity({ isInteractive }: { isInteractive: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (isInteractive) {
      map.dragging.enable()
      map.scrollWheelZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoom.enable()
      map.boxZoom.enable()
      map.keyboard.enable()
    } else {
      map.dragging.disable()
      map.scrollWheelZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()
    }
  }, [map, isInteractive])

  return null
}

function ProfileAvatar({ point }: { point: VulnerablePoint }) {
  const photo = getProfilePhoto(point)

  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-950 text-[0.625rem] font-black text-white ring-2 ring-white shadow-md">
      {photo ? (
        <img
          src={photo}
          alt={point.name}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <span>{getInitials(point.name)}</span>
      )}
    </div>
  )
}

function CompactPopup({
  point,
  received,
  onViewProfile,
}: {
  point: VulnerablePoint
  received: boolean
  onViewProfile?: (profileId: string, point?: VulnerablePoint) => void
}) {
  const missingNeeds = normalizeMissingNeeds(point.missingNeeds)

  const vulnerabilityTypes = point.vulnerabilityTypes?.length
    ? point.vulnerabilityTypes.slice(0, 2)
    : ['None specified']

  return (
    <div className="w-[210px] overflow-hidden text-slate-950">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 p-2 pr-6">
        <ProfileAvatar point={point} />

        <div className="min-w-0">
          <p className="text-[0.5rem] font-black uppercase tracking-[0.14em] text-slate-500">
            Citizen
          </p>
          <h3 className="truncate text-[0.6875rem] font-black leading-tight text-slate-950">
            {point.name}
          </h3>
          <p className="truncate text-[0.5625rem] font-bold text-slate-500">
            {point.barangay || 'Barangay not recorded'}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 p-2">
        <div
          className={`inline-flex rounded-full px-2 py-1 text-[0.5rem] font-black uppercase ${received
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-700'
            }`}
        >
          {received ? 'Relief received' : 'No relief yet'}
        </div>

        <div className="border-t border-slate-100 pt-1.5">
          <p className="text-[0.5rem] font-black uppercase tracking-[0.1em] text-slate-500">
            Address
          </p>
          <p className="line-clamp-2 text-[0.625rem] font-bold leading-snug text-slate-800">
            {point.address || 'Not recorded'}
          </p>
        </div>

        <div className="border-t border-slate-100 pt-1.5">
          <p className="text-[0.5rem] font-black uppercase tracking-[0.1em] text-slate-500">
            Vulnerability
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {vulnerabilityTypes.map((type, index) => (
              <span
                key={`${type}-${index}`}
                className={`rounded-full px-1.5 py-0.5 text-[0.5rem] font-black ${received
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                  }`}
              >
                {formatVulnerability(type)}
              </span>
            ))}
          </div>
        </div>

        {(point.lastDistributionDate ||
          point.lastItemsReceived ||
          point.lastDistributionType) && (
            <div className="border-t border-slate-100 pt-1.5">
              <p className="text-[0.5rem] font-black uppercase tracking-[0.1em] text-slate-500">
                Last Distribution
              </p>
              <p className="text-[0.625rem] font-black text-slate-900">
                {formatDate(point.lastDistributionDate)}
              </p>
              {(point.lastItemsReceived || point.lastDistributionType) && (
                <p className="text-[0.625rem] font-bold text-slate-600">
                  {point.lastItemsReceived || point.lastDistributionType}
                </p>
              )}
            </div>
          )}

        {missingNeeds.length > 0 && (
          <div className="border-t border-slate-100 pt-1.5">
            <p className="text-[0.5rem] font-black uppercase tracking-[0.1em] text-slate-500">
              Missing / Needed
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {missingNeeds.slice(0, 3).map((need) => (
                <span
                  key={need}
                  className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[0.5rem] font-black text-orange-700 ring-1 ring-orange-100"
                >
                  {need}
                </span>
              ))}
            </div>
          </div>
        )}

        {point.mobileNumber && (
          <div className="border-t border-slate-100 pt-1.5">
            <p className="text-[0.5rem] font-black uppercase tracking-[0.1em] text-slate-500">
              Mobile
            </p>
            <p className="text-[0.625rem] font-black text-slate-900">
              {point.mobileNumber}
            </p>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          className="mt-1 h-7 w-full rounded-lg bg-emerald-600 text-[0.625rem] font-black text-white hover:bg-emerald-700"
          onClick={() => onViewProfile?.(point.id, point)}
        >
          <UserRound className="mr-1 h-3 w-3" />
          View full profile
        </Button>
      </div>
    </div>
  )
}

export function VulnerableMap({
  points,
  center = [12.1792, 125.5072],
  zoom = 12,
  showHeatmap = true,
  height = 500,
  onViewProfile,
}: VulnerableMapProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isMapInteractive] = useState(true)
  const { receivedIcon, notReceivedIcon } = useCustomIcons()

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const validPoints = useMemo(() => {
    return points.filter((point) => {
      return Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    })
  }, [points])

  const receivedPoints = useMemo(() => {
    return validPoints.filter((point) => point.hasReceivedRelief)
  }, [validPoints])

  const notReceivedPoints = useMemo(() => {
    return validPoints.filter((point) => !point.hasReceivedRelief)
  }, [validPoints])

  const mapCenter = useMemo<[number, number]>(() => {
    if (validPoints.length === 0) {
      return center
    }

    return [
      validPoints.reduce((sum, point) => sum + point.latitude, 0) /
      validPoints.length,
      validPoints.reduce((sum, point) => sum + point.longitude, 0) /
      validPoints.length,
    ]
  }, [validPoints, center])

  return (
    <div className="relative h-full w-full min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <style>{`
        .leaflet-popup-content-wrapper {
          overflow: hidden;
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.24);
        }

        .leaflet-popup-content {
          width: 210px !important;
          margin: 0 !important;
        }

        .leaflet-popup-close-button {
          top: 7px !important;
          right: 7px !important;
          width: 20px !important;
          height: 20px !important;
          border-radius: 999px !important;
          background: white !important;
          color: #475569 !important;
          font-size: 15px !important;
          font-weight: 900 !important;
          line-height: 19px !important;
        }

        .leaflet-popup-tip {
          background: white;
        }

        .custom-marker {
          background: transparent;
          border: none;
        }
      `}</style>

      {!isOnline && (
        <div className="absolute right-3 top-3 z-[500] rounded-xl border border-yellow-300 bg-yellow-100 px-3 py-2 text-xs font-bold text-yellow-800 shadow-sm">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          Offline Mode
        </div>
      )}

      <div className="absolute left-3 top-3 z-[500] rounded-xl border border-white/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-[0.5625rem] font-black uppercase tracking-[0.18em] text-slate-500">
          Vulnerable Map
        </p>
        <p className="text-xs font-black text-slate-950">
          {validPoints.length} recorded location
          {validPoints.length === 1 ? '' : 's'}
        </p>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: `${height}px`, width: '100%', zIndex: 0 }}
        className="rounded-2xl"
      >
        <MapView center={mapCenter} zoom={zoom} />
        <MapInteractivity isInteractive={isMapInteractive} />

        <TileLayer
          attribution={
            isOnline
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              : ''
          }
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showHeatmap &&
          receivedPoints.map((point) => (
            <Circle
              key={`heat-green-${point.id}`}
              center={[point.latitude, point.longitude]}
              radius={220}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.22,
                weight: 0,
              }}
            />
          ))}

        {showHeatmap &&
          notReceivedPoints.map((point) => (
            <Circle
              key={`heat-red-${point.id}`}
              center={[point.latitude, point.longitude]}
              radius={220}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.22,
                weight: 0,
              }}
            />
          ))}

        {receivedPoints.map((point) => (
          <Marker
            key={`marker-${point.id}`}
            position={[point.latitude, point.longitude]}
            icon={receivedIcon}
          >
            <Popup>
              <CompactPopup
                point={point}
                received
                onViewProfile={onViewProfile}
              />
            </Popup>
          </Marker>
        ))}

        {notReceivedPoints.map((point) => (
          <Marker
            key={`marker-${point.id}`}
            position={[point.latitude, point.longitude]}
            icon={notReceivedIcon}
          >
            <Popup>
              <CompactPopup
                point={point}
                received={false}
                onViewProfile={onViewProfile}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {validPoints.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[600] grid place-items-center bg-white/50 backdrop-blur-[2px]">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center shadow-xl">
            <p className="text-sm font-black text-slate-950">
              No recorded map locations
            </p>
            <p className="mt-1 max-w-xs text-xs font-medium text-slate-500">
              The map will display citizens only when valid latitude and
              longitude are available.
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-[500] hidden rounded-xl border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur md:block">
        <div className="space-y-1.5 text-[0.6875rem] font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>Relief received</span>
            <span className="ml-auto text-slate-400">
              {receivedPoints.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-red-600" />
            <span>No relief yet</span>
            <span className="ml-auto text-slate-400">
              {notReceivedPoints.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VulnerableMap