'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 14,
      scrollWheelZoom: false,
    })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    const icon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:var(--primary);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
    L.marker([latitude, longitude], { icon })
      .addTo(map)
      .bindPopup(label)
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
