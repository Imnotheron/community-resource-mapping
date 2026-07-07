'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface VulnerablePoint {
  id: string
  name: string
  latitude: number
  longitude: number
  barangay: string
  address: string
  vulnerabilityTypes: string[]
  hasReceivedRelief: boolean
  needsAssistance: boolean
  mobileNumber?: string
}

interface VulnerableMapProps {
  points: VulnerablePoint[]
  height?: number
}

export function VulnerableMap({ points, height = 420 }: VulnerableMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }
    const map = L.map(containerRef.current, {
      center: [12.1792, 125.5072],
      zoom: 13,
      scrollWheelZoom: true,
    })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const markerGroup = L.featureGroup()

    points.forEach((p) => {
      if (!p.latitude || !p.longitude) return
      const color = p.needsAssistance ? '#dc2626' : p.hasReceivedRelief ? '#10b981' : '#f59e0b'
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      const marker = L.marker([p.latitude, p.longitude], { icon })
      const vulnList = p.vulnerabilityTypes.length
        ? p.vulnerabilityTypes.map((v) => v.replace(/_/g, ' ').toLowerCase()).join(', ')
        : 'None specified'
      marker.bindPopup(
        `<div style="min-width:200px;">
          <div style="font-weight:600;margin-bottom:4px;">${p.name}</div>
          <div style="font-size:12px;color:#666;margin-bottom:6px;">${p.address}</div>
          <div style="font-size:12px;"><b>Barangay:</b> ${p.barangay}</div>
          <div style="font-size:12px;"><b>Vulnerabilities:</b> ${vulnList}</div>
          <div style="font-size:12px;"><b>Relief:</b> ${p.hasReceivedRelief ? 'Received' : 'Not yet'}</div>
          <div style="font-size:12px;"><b>Needs assistance:</b> ${p.needsAssistance ? 'Yes' : 'No'}</div>
          ${p.mobileNumber ? `<div style="font-size:12px;"><b>Mobile:</b> ${p.mobileNumber}</div>` : ''}
        </div>`
      )
      markerGroup.addLayer(marker)
    })
    markerGroup.addTo(map)

    if (points.length > 0) {
      const bounds = markerGroup.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.1))
    }
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [points])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-950/5 p-1 shadow-[0_24px_80px_rgba(15,118,110,0.18)] [perspective:1200px]">
      <div
        ref={containerRef}
        style={{ height: `${height}px`, width: '100%' }}
        className="rounded-xl border border-border transition-transform duration-500 hover:[transform:rotateX(1.2deg)_rotateY(-1deg)_scale(1.005)]"
      />
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/40 bg-white/80 px-3 py-1 text-[11px] font-medium text-emerald-950 shadow-sm backdrop-blur">
        Live vulnerability layer · San Policarpo
      </div>
    </div>
  )
}
