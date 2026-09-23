'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
} from 'lucide-react'

import {
  SAN_POLICARPO_CENTER,
  SAN_POLICARPO_MIN_VIEW_ZOOM,
  SAN_POLICARPO_VIEW_BOUNDS,
  isWithinSanPolicarpoServiceEnvelope,
} from '@/lib/san-policarpo-geography'

type PickedAddress = {
  latitude: string
  longitude: string
  houseNumber: string
  street: string
  barangay: string
  municipality: string
  province: string
  displayName: string
}

interface AddressPickerMapProps {
  lat?: number | null
  lng?: number | null
  onSelect: (address: PickedAddress) => void
}

type MarkerPosition = {
  lat: number
  lng: number
}

type ReverseGeocodePayload = {
  success: boolean
  code?: string
  message?: string
  warning?: string
  verified?: boolean
  address?: PickedAddress
}

class AddressLookupError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AddressLookupError'
    this.code = code
  }
}

const LEAFLET_BOUNDS = L.latLngBounds(
  SAN_POLICARPO_VIEW_BOUNDS,
)

function getSafePosition(
  lat?: number | null,
  lng?: number | null,
): MarkerPosition {
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    isWithinSanPolicarpoServiceEnvelope(lat, lng)
  ) {
    return { lat, lng }
  }

  return {
    ...SAN_POLICARPO_CENTER,
  }
}

async function reverseGeocode(
  lat: number,
  lng: number,
  signal: AbortSignal,
) {
  const response = await fetch(
    `/api/geocoding/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    {
      cache: 'no-store',
      signal,
    },
  )

  const data = (await response.json().catch(() => null)) as
    | ReverseGeocodePayload
    | null

  if (!response.ok || !data?.success || !data.address) {
    throw new AddressLookupError(
      data?.message || 'Unable to verify this map location.',
      data?.code,
    )
  }

  return {
    address: data.address,
    warning: data.warning || '',
  }
}

function createPickerIcon() {
  return L.divIcon({
    className: 'crms-address-picker-marker-wrap',
    html: `
      <div class="crms-address-picker-marker">
        <div class="crms-address-picker-marker__pin">
          <div class="crms-address-picker-marker__dot"></div>
        </div>
        <div class="crms-address-picker-marker__shadow"></div>
      </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [19, 48],
  })
}

export default function AddressPickerMap({
  lat,
  lng,
  onSelect,
}: AddressPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  const requestNumberRef = useRef(0)
  const activeRequestRef = useRef<AbortController | null>(null)

  const initialPosition = useMemo(
    () => getSafePosition(lat, lng),
    [lat, lng],
  )

  const lastValidPositionRef = useRef<MarkerPosition>(initialPosition)

  const [, setPosition] = useState<MarkerPosition>(initialPosition)
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [lastAddress, setLastAddress] = useState('')
  const [lastError, setLastError] = useState('')
  const [lastWarning, setLastWarning] = useState('')

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const restoreLastValidPosition = useCallback(() => {
    const previous = lastValidPositionRef.current

    setPosition(previous)
    markerRef.current?.setLatLng([previous.lat, previous.lng])

    const map = mapRef.current
    if (map) {
      map.setView(
        [previous.lat, previous.lng],
        Math.max(map.getZoom(), 13),
        { animate: true },
      )
    }
  }, [])

  const pickPosition = useCallback(
    async (nextPosition: MarkerPosition) => {
      if (
        !isWithinSanPolicarpoServiceEnvelope(
          nextPosition.lat,
          nextPosition.lng,
        )
      ) {
        setLastAddress('')
        setLastWarning('')
        setLastError(
          'Please select a location inside San Policarpo, Eastern Samar.',
        )
        restoreLastValidPosition()
        return
      }

      activeRequestRef.current?.abort()

      const controller = new AbortController()
      activeRequestRef.current = controller
      const requestNumber = ++requestNumberRef.current

      setPosition(nextPosition)
      setLoadingAddress(true)
      setLastAddress('')
      setLastError('')
      setLastWarning('')

      markerRef.current?.setLatLng([
        nextPosition.lat,
        nextPosition.lng,
      ])

      const map = mapRef.current
      if (map) {
        map.setView(
          [nextPosition.lat, nextPosition.lng],
          Math.max(map.getZoom(), 14),
          { animate: true },
        )
      }

      try {
        const result = await reverseGeocode(
          nextPosition.lat,
          nextPosition.lng,
          controller.signal,
        )

        if (requestNumber !== requestNumberRef.current) return

        lastValidPositionRef.current = nextPosition
        setLastAddress(result.address.displayName)
        setLastWarning(result.warning)
        setLastError('')
        onSelectRef.current(result.address)
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        if (requestNumber !== requestNumberRef.current) return

        setLastAddress('')
        setLastWarning('')
        setLastError(
          error?.message ||
            'Unable to verify this address. Move the marker or enter it manually.',
        )
        restoreLastValidPosition()
      } finally {
        if (requestNumber === requestNumberRef.current) {
          setLoadingAddress(false)
        }
      }
    },
    [restoreLastValidPosition],
  )

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [initialPosition.lat, initialPosition.lng],
      zoom: 13,
      minZoom: SAN_POLICARPO_MIN_VIEW_ZOOM,
      maxZoom: 18,
      maxBounds: LEAFLET_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    })

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      },
    ).addTo(map)

    mapRef.current = map

    const marker = L.marker(
      [initialPosition.lat, initialPosition.lng],
      {
        icon: createPickerIcon(),
        draggable: true,
        keyboard: true,
      },
    ).addTo(map)

    markerRef.current = marker

    marker.on('dragend', () => {
      const position = marker.getLatLng()
      void pickPosition({
        lat: position.lat,
        lng: position.lng,
      })
    })

    map.on('click', (event) => {
      void pickPosition({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      })
    })

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => map.invalidateSize(false))
    })

    resizeObserver.observe(mapContainerRef.current)

    map.whenReady(() => {
      map.invalidateSize(false)
      map.fitBounds(LEAFLET_BOUNDS, {
        padding: [28, 28],
        animate: false,
      })

      window.setTimeout(() => {
        map.setView(
          [initialPosition.lat, initialPosition.lng],
          13,
          { animate: false },
        )
      }, 100)
    })

    const timers = [80, 250, 650].map((delay) =>
      window.setTimeout(() => map.invalidateSize(false), delay),
    )

    return () => {
      activeRequestRef.current?.abort()
      timers.forEach((timer) => window.clearTimeout(timer))
      resizeObserver.disconnect()
      marker.remove()
      map.remove()
      markerRef.current = null
      mapRef.current = null
    }
  }, [initialPosition.lat, initialPosition.lng, pickPosition])

  useEffect(() => {
    const safePosition = getSafePosition(lat, lng)

    setPosition(safePosition)
    lastValidPositionRef.current = safePosition
    markerRef.current?.setLatLng([
      safePosition.lat,
      safePosition.lng,
    ])

    const map = mapRef.current
    if (map) {
      map.setView(
        [safePosition.lat, safePosition.lng],
        Math.max(map.getZoom(), 13),
        { animate: true },
      )
    }
  }, [lat, lng])

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
      <style>{`
        .crms-address-picker-map.leaflet-container {
          width: 100%;
          height: 100%;
          background: #e2e8f0;
          font-family: inherit;
          z-index: 0;
        }

        .crms-address-picker-map .leaflet-control-zoom {
          overflow: hidden;
          border: 1px solid rgba(148,163,184,.35) !important;
          border-radius: 14px !important;
          box-shadow: 0 14px 36px rgba(15,23,42,.14) !important;
        }

        .crms-address-picker-map .leaflet-control-zoom a {
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          color: #334155 !important;
        }

        .crms-address-picker-map .leaflet-control-attribution {
          background: rgba(255,255,255,.86) !important;
          font-size: 10px !important;
        }

        .crms-address-picker-marker-wrap {
          background: transparent !important;
          border: 0 !important;
        }

        .crms-address-picker-marker {
          position: relative;
          width: 38px;
          height: 48px;
          cursor: grab;
        }

        .crms-address-picker-marker:active {
          cursor: grabbing;
        }

        .crms-address-picker-marker__pin {
          position: absolute;
          left: 50%;
          top: 0;
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 3px solid white;
          border-radius: 999px 999px 999px 8px;
          background: linear-gradient(135deg, #059669, #06b6d4);
          box-shadow:
            0 18px 34px rgba(15, 23, 42, 0.28),
            0 0 0 7px rgba(16, 185, 129, 0.16),
            0 0 0 13px rgba(255, 255, 255, 0.70);
          transform: translateX(-50%) rotate(-45deg);
        }

        .crms-address-picker-marker__dot {
          width: 11px;
          height: 11px;
          border-radius: 999px;
          background: white;
        }

        .crms-address-picker-marker__shadow {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 26px;
          height: 8px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.24);
          filter: blur(4px);
          transform: translateX(-50%);
        }
      `}</style>

      <div className="relative h-[340px] w-full overflow-hidden bg-slate-100">
        <div
          ref={mapContainerRef}
          className="crms-address-picker-map h-full w-full"
        />

        <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-[calc(100%-2rem)] rounded-2xl border border-white/75 bg-white/[0.92] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.13)] backdrop-blur-xl">
          <p className="text-[0.5625rem] font-medium uppercase leading-none tracking-[0.18em] text-slate-500">
            San Policarpo Map Picker
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-snug tracking-tight text-slate-950">
            Click or drag the marker to verify an address
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-gradient-to-r from-white via-emerald-50/35 to-sky-50/35 px-4 py-3 text-sm">
        {loadingAddress ? (
          <span className="inline-flex items-center gap-2 font-medium text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Verifying municipality and barangay...
          </span>
        ) : lastError ? (
          <span className="inline-flex items-start gap-2 font-medium text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{lastError}</span>
          </span>
        ) : lastAddress ? (
          <div className="space-y-1.5">
            <span className="inline-flex items-start gap-2 font-medium text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{lastAddress}</span>
            </span>

            {lastWarning && (
              <p className="pl-6 text-xs font-medium text-amber-700">
                {lastWarning}
              </p>
            )}
          </div>
        ) : (
          <span className="inline-flex items-start gap-2 font-medium text-slate-500">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Select a point. Only a location verified for San Policarpo will update the form.
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
