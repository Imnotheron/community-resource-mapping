'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AlertTriangle, Loader2, MapPin } from 'lucide-react'

// Keep this address picker visually synchronized with src/components/maps/vulnerable-map.tsx.
// Use the same theme name there and here.
type MapTheme = 'coolGray' | 'blueprint' | 'emeraldMist' | 'darkMode' | 'satellite'
const MAP_THEME: MapTheme = 'blueprint'

const SAN_POLICARPO_CENTER = {
  lat: 12.1792,
  lng: 125.5072,
}

const SAN_POLICARPO_LIMITS = {
  // Expanded practical boundary for all 17 San Policarpo barangays,
  // including Natividad and Tabo.
  south: 12.125,
  west: 125.375,
  north: 12.285,
  east: 125.625,
}

const SAN_POLICARPO_BOUNDS: [[number, number], [number, number]] = [
  [SAN_POLICARPO_LIMITS.west, SAN_POLICARPO_LIMITS.south],
  [SAN_POLICARPO_LIMITS.east, SAN_POLICARPO_LIMITS.north],
]

const SAN_POLICARPO_BARANGAYS = [
  'Alugan',
  'Bahay',
  'Bangon',
  'Baras (Lipata)',
  'Binogawan',
  'Cajagwayan',
  'Japunan',
  'Natividad',
  'Pangpang',
  'Santa Cruz',
  'Tabo',
  'Tan-awan (Tanauawan)',
  'Barangay No. 1 (Poblacion)',
  'Barangay No. 2 (Poblacion)',
  'Barangay No. 3 (Poblacion)',
  'Barangay No. 4 (Poblacion)',
  'Barangay No. 5 (Poblacion)',
]

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

const MAP_THEMES: Record<
  MapTheme,
  {
    sourceId: string
    layerId: string
    tiles: string[]
    attribution: string
    paint: Record<string, number>
  }
> = {
  coolGray: {
    sourceId: 'cartoLight',
    layerId: 'carto-light-base',
    tiles: [
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    paint: {
      'raster-opacity': 1,
      'raster-saturation': -0.55,
      'raster-contrast': 0.06,
      'raster-brightness-min': 0.04,
      'raster-brightness-max': 0.98,
    },
  },
  blueprint: {
    sourceId: 'cartoVoyager',
    layerId: 'carto-voyager-blueprint',
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    paint: {
      'raster-opacity': 1,
      'raster-saturation': -0.25,
      'raster-contrast': 0.02,
      'raster-brightness-min': 0.02,
      'raster-brightness-max': 0.95,
    },
  },
  emeraldMist: {
    sourceId: 'cartoLightEmerald',
    layerId: 'carto-light-emerald',
    tiles: [
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    paint: {
      'raster-opacity': 1,
      'raster-saturation': -0.35,
      'raster-contrast': 0.03,
      'raster-brightness-min': 0.06,
      'raster-brightness-max': 1,
      'raster-hue-rotate': 18,
    },
  },
  darkMode: {
    sourceId: 'cartoDark',
    layerId: 'carto-dark-base',
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    paint: {
      'raster-opacity': 0.96,
      'raster-saturation': -0.2,
      'raster-contrast': 0.06,
      'raster-brightness-min': 0.02,
      'raster-brightness-max': 0.86,
    },
  },
  satellite: {
    sourceId: 'esriWorldImagery',
    layerId: 'esri-world-imagery',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: 'Tiles &copy; Esri',
    paint: {
      'raster-opacity': 0.9,
      'raster-saturation': -0.12,
      'raster-contrast': 0.02,
      'raster-brightness-min': 0.04,
      'raster-brightness-max': 0.94,
    },
  },
}

function createMapStyle(themeName: MapTheme) {
  const theme = MAP_THEMES[themeName]

  return {
    version: 8,
    sources: {
      [theme.sourceId]: {
        type: 'raster',
        tiles: theme.tiles,
        tileSize: 256,
        attribution: theme.attribution,
      },
    },
    layers: [
      {
        id: theme.layerId,
        type: 'raster',
        source: theme.sourceId,
        paint: theme.paint,
      },
    ],
  } as any
}

function isWithinSanPolicarpo(lat: number, lng: number) {
  return (
    lat >= SAN_POLICARPO_LIMITS.south &&
    lat <= SAN_POLICARPO_LIMITS.north &&
    lng >= SAN_POLICARPO_LIMITS.west &&
    lng <= SAN_POLICARPO_LIMITS.east
  )
}

function getSafePosition(lat?: number | null, lng?: number | null): MarkerPosition {
  if (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    isWithinSanPolicarpo(lat, lng)
  ) {
    return { lat, lng }
  }

  return SAN_POLICARPO_CENTER
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/barangay|brgy\.?|poblacion|\(|\)|\.|-|_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getBarangayFromAddress(address: any, displayName: string) {
  const directCandidates = [
    address.village,
    address.hamlet,
    address.suburb,
    address.neighbourhood,
    address.quarter,
    address.city_district,
    address.locality,
  ].filter(Boolean)

  const displayParts = String(displayName || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const candidates = [...directCandidates, ...displayParts]

  for (const barangay of SAN_POLICARPO_BARANGAYS) {
    const normalizedBarangay = normalize(barangay)

    for (const candidate of candidates) {
      const normalizedCandidate = normalize(String(candidate))

      if (!normalizedCandidate) continue
      if (normalizedCandidate === normalizedBarangay) return barangay
      if (normalizedCandidate.includes(normalizedBarangay)) return barangay
      if (normalizedBarangay.includes(normalizedCandidate)) return barangay
    }
  }

  const firstUsefulDisplayPart = displayParts.find((part) => {
    const cleaned = normalize(part)
    return (
      cleaned &&
      !cleaned.includes('san policarpo') &&
      !cleaned.includes('eastern samar') &&
      !cleaned.includes('philippines') &&
      !cleaned.includes('region') &&
      !cleaned.match(/^\d+$/)
    )
  })

  return firstUsefulDisplayPart ? toTitleCase(firstUsefulDisplayPart.replace(/^brgy\.\s*/i, '')) : ''
}

function normalizeAddress(raw: any, lat: number, lng: number): PickedAddress {
  const address = raw?.address || raw || {}
  const displayName = raw?.display_name || raw?.displayName || ''

  const roadLike =
    address.road ||
    address.pedestrian ||
    address.path ||
    address.footway ||
    address.residential ||
    address.street ||
    ''

  const street = roadLike ? toTitleCase(String(roadLike)) : ''
  const barangay = getBarangayFromAddress(address, displayName)

  const municipality =
    address.municipality ||
    address.town ||
    address.city ||
    address.county ||
    'San Policarpo'

  const province =
    address.state ||
    address.province ||
    address.region ||
    'Eastern Samar'

  return {
    latitude: String(lat),
    longitude: String(lng),
    houseNumber: address.house_number || '',
    street,
    barangay,
    municipality: toTitleCase(String(municipality || 'San Policarpo')),
    province: toTitleCase(String(province || 'Eastern Samar')),
    displayName,
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<PickedAddress> {
  const response = await fetch(
    `/api/geocoding/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    { cache: 'no-store' }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Unable to get address from map')
  }

  if (data.address) {
    return normalizeAddress(data.address, lat, lng)
  }

  return normalizeAddress(data.result, lat, lng)
}

function createPickerMarkerElement() {
  const el = document.createElement('div')
  el.className = 'crms-address-picker-marker'
  el.innerHTML = `
    <div class="crms-address-picker-marker__pin">
      <div class="crms-address-picker-marker__dot"></div>
    </div>
    <div class="crms-address-picker-marker__shadow"></div>
  `
  return el
}

export default function AddressPickerMap({ lat, lng, onSelect }: AddressPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const onSelectRef = useRef(onSelect)

  const initialPosition = useMemo(() => getSafePosition(lat, lng), [lat, lng])

  const [position, setPosition] = useState<MarkerPosition>(initialPosition)
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [lastAddress, setLastAddress] = useState('')
  const [lastError, setLastError] = useState('')

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const pickPosition = useCallback(async (nextPosition: MarkerPosition) => {
    if (!isWithinSanPolicarpo(nextPosition.lat, nextPosition.lng)) {
      setLastAddress('')
      setLastError('Please select a location inside San Policarpo, Eastern Samar only.')

      const map = mapRef.current
      const marker = markerRef.current
      marker?.setLngLat([SAN_POLICARPO_CENTER.lng, SAN_POLICARPO_CENTER.lat])
      map?.easeTo({
        center: [SAN_POLICARPO_CENTER.lng, SAN_POLICARPO_CENTER.lat],
        zoom: Math.max(map.getZoom(), 13),
        duration: 360,
        essential: true,
      })
      setPosition(SAN_POLICARPO_CENTER)
      return
    }

    setPosition(nextPosition)
    setLoadingAddress(true)
    setLastAddress('')
    setLastError('')

    markerRef.current?.setLngLat([nextPosition.lng, nextPosition.lat])

    const map = mapRef.current
    map?.stop()
    map?.easeTo({
      center: [nextPosition.lng, nextPosition.lat],
      zoom: Math.max(map.getZoom(), 15),
      duration: 420,
      essential: true,
    })

    try {
      const result = await reverseGeocode(nextPosition.lat, nextPosition.lng)
      setLastAddress(result.displayName || `${result.barangay}, ${result.municipality}, ${result.province}`)
      onSelectRef.current(result)
    } catch (error: any) {
      setLastError(error?.message || 'Unable to auto-fill address. You can still type it manually.')
      onSelectRef.current({
        latitude: String(nextPosition.lat),
        longitude: String(nextPosition.lng),
        houseNumber: '',
        street: '',
        barangay: '',
        municipality: 'San Policarpo',
        province: 'Eastern Samar',
        displayName: '',
      })
    } finally {
      setLoadingAddress(false)
    }
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createMapStyle(MAP_THEME),
      center: [initialPosition.lng, initialPosition.lat],
      zoom: 14.4,
      minZoom: 11.2,
      maxZoom: 18,
      maxBounds: SAN_POLICARPO_BOUNDS,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 0,
    })

    mapRef.current = map

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      'bottom-right'
    )

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-left'
    )

    const marker = new maplibregl.Marker({
      element: createPickerMarkerElement(),
      draggable: true,
      anchor: 'bottom',
    })
      .setLngLat([initialPosition.lng, initialPosition.lat])
      .addTo(map)

    markerRef.current = marker

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat()
      pickPosition({ lat: lngLat.lat, lng: lngLat.lng })
    })

    map.on('click', (event) => {
      pickPosition({ lat: event.lngLat.lat, lng: event.lngLat.lng })
    })

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        map.resize()
      })
    })

    resizeObserver.observe(mapContainerRef.current)

    map.once('load', () => {
      map.resize()
      map.fitBounds(SAN_POLICARPO_BOUNDS, {
        padding: 36,
        duration: 0,
      })
      window.setTimeout(() => {
        map.easeTo({
          center: [initialPosition.lng, initialPosition.lat],
          zoom: 14.4,
          duration: 420,
          essential: true,
        })
      }, 120)
    })

    const timers = [80, 250, 650].map((delay) => window.setTimeout(() => map.resize(), delay))

    return () => {
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

    markerRef.current?.setLngLat([safePosition.lng, safePosition.lat])
    mapRef.current?.easeTo({
      center: [safePosition.lng, safePosition.lat],
      zoom: Math.max(mapRef.current.getZoom(), 14.4),
      duration: 360,
      essential: true,
    })
  }, [lat, lng])

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
      <style>{`
        .crms-address-picker-map .maplibregl-canvas {
          outline: none;
        }

        .crms-address-picker-map .maplibregl-control-container {
          font-family: "Inter", "Geist Sans", "SF Pro Display", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
        }

        .crms-address-picker-map .maplibregl-ctrl-group {
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.32);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
          backdrop-filter: blur(16px);
        }

        .crms-address-picker-map .maplibregl-ctrl-group button {
          width: 34px;
          height: 34px;
        }

        .crms-address-picker-map .maplibregl-ctrl-attrib {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          color: #64748b;
          font-size: 10px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.10);
          backdrop-filter: blur(12px);
        }

        .crms-address-picker-marker {
          position: relative;
          width: 38px;
          height: 48px;
          pointer-events: auto;
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
          box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.08);
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
        <div ref={mapContainerRef} className="crms-address-picker-map h-full w-full" />

        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-white/75 bg-white/[0.92] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.13)] backdrop-blur-xl">
          <p className="text-[9px] font-medium uppercase leading-none tracking-[0.18em] text-slate-500">
            San Policarpo Map Picker
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-snug tracking-tight text-slate-950">
            Click or drag marker to select address
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-gradient-to-r from-white via-emerald-50/35 to-sky-50/35 px-4 py-3 text-sm text-slate-600">
        {loadingAddress ? (
          <span className="inline-flex items-center gap-2 font-medium text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Getting address from selected map point...
          </span>
        ) : lastError ? (
          <span className="inline-flex items-center gap-2 font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            {lastError}
          </span>
        ) : lastAddress ? (
          <span className="inline-flex items-start gap-2 font-medium text-slate-700">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{lastAddress}</span>
          </span>
        ) : (
          <span className="inline-flex items-start gap-2 font-medium text-slate-500">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>Click the map or drag the marker. Address fields will auto-fill, but you can still edit them manually.</span>
          </span>
        )}
      </div>
    </div>
  )
}
