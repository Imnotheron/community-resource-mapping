'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const SAN_POLICARPO_CENTER: [number, number] = [12.1792, 125.5072]

const SAN_POLICARPO_LIMITS = {
  // Expanded practical boundary for all 17 San Policarpo barangays.
  // Wider east/south edge lets users reach Natividad and Tabo while staying within the municipal map area.
  south: 12.125,
  west: 125.375,
  north: 12.285,
  east: 125.625,
}

const SAN_POLICARPO_BOUNDS = L.latLngBounds(
  [SAN_POLICARPO_LIMITS.south, SAN_POLICARPO_LIMITS.west],
  [SAN_POLICARPO_LIMITS.north, SAN_POLICARPO_LIMITS.east],
)

function isWithinSanPolicarpo(lat: number, lng: number) {
  return (
    lat >= SAN_POLICARPO_LIMITS.south &&
    lat <= SAN_POLICARPO_LIMITS.north &&
    lng >= SAN_POLICARPO_LIMITS.west &&
    lng <= SAN_POLICARPO_LIMITS.east
  )
}

interface SingleLocationMapProps {
  latitude: number
  longitude: number
  label?: string
  height?: number
}

export function SingleLocationMap({
  latitude,
  longitude,
  label = 'Location',
  height = 240,
}: SingleLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }
    const safePosition: [number, number] = isWithinSanPolicarpo(latitude, longitude)
      ? [latitude, longitude]
      : SAN_POLICARPO_CENTER

    const map = L.map(containerRef.current, {
      center: safePosition,
      zoom: 14,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: SAN_POLICARPO_BOUNDS,
      maxBoundsViscosity: 0.85,
      scrollWheelZoom: false,
    })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)
    const icon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:var(--primary);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
    L.marker(safePosition, { icon })
      .addTo(map)
      .bindPopup(isWithinSanPolicarpo(latitude, longitude) ? label : 'San Policarpo, Eastern Samar')
    setTimeout(() => map.invalidateSize(), 100)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [latitude, longitude, label])

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px`, width: '100%' }}
      className="rounded-md border border-border"
    />
  )
}
