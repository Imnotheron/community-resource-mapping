'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  SAN_POLICARPO_CENTER,
  SAN_POLICARPO_LEAFLET_BOUNDS,
  SAN_POLICARPO_MAP_POLYGON,
  isWithinSanPolicarpoServiceEnvelope,
} from '@/lib/san-policarpo-geography'

const SAN_POLICARPO_BOUNDS = L.latLngBounds(
  SAN_POLICARPO_LEAFLET_BOUNDS,
)

const WORLD_MASK_RING: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
]

function addSanPolicarpoCoverageLayer(map: L.Map) {
  L.polygon(
    [
      WORLD_MASK_RING,
      SAN_POLICARPO_MAP_POLYGON,
    ],
    {
      interactive: false,
      stroke: false,
      fillColor: '#0f172a',
      fillOpacity: 0.46,
      fillRule: 'evenodd',
    },
  ).addTo(map)

  L.polygon(SAN_POLICARPO_MAP_POLYGON, {
    interactive: false,
    color: '#059669',
    weight: 2,
    opacity: 0.9,
    fill: false,
  }).addTo(map)
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
    const safePosition: [number, number] = isWithinSanPolicarpoServiceEnvelope(latitude, longitude)
      ? [latitude, longitude]
      : SAN_POLICARPO_CENTER

    const map = L.map(containerRef.current, {
      center: safePosition,
      zoom: 14,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: SAN_POLICARPO_BOUNDS,
      maxBoundsViscosity: 1,
      scrollWheelZoom: false,
    })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    addSanPolicarpoCoverageLayer(map)
    map.setMaxBounds(SAN_POLICARPO_BOUNDS)
    const icon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:var(--primary);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
    L.marker(safePosition, { icon })
      .addTo(map)
      .bindPopup(isWithinSanPolicarpoServiceEnvelope(latitude, longitude) ? label : 'San Policarpo, Eastern Samar')
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
