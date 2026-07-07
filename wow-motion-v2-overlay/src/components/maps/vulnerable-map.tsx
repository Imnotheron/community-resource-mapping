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
      zoomControl: true,
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
      const label = p.needsAssistance ? 'Needs assistance' : p.hasReceivedRelief ? 'Relief received' : 'No relief yet'
      const icon = L.divIcon({
        html: `
          <span class="wow-map-marker" style="--marker-color:${color}" title="${label}">
            <span class="wow-map-marker__pulse"></span>
            <span class="wow-map-marker__core"></span>
          </span>
        `,
        className: 'wow-map-marker-wrapper',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      const marker = L.marker([p.latitude, p.longitude], { icon })
      const vulnList = p.vulnerabilityTypes.length
        ? p.vulnerabilityTypes.map((v) => v.replace(/_/g, ' ').toLowerCase()).join(', ')
        : 'None specified'
      marker.bindPopup(
        `<div class="wow-map-popup" style="min-width:220px;">
          <div style="font-weight:700;margin-bottom:4px;">${p.name}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${p.address}</div>
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
    setTimeout(() => map.invalidateSize(), 120)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [points])

  return (
    <div className="map-wow-shell relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-emerald-950/5 p-2 shadow-[0_30px_100px_rgba(15,118,110,0.22)] [perspective:1400px]">
      <div className="map-wow-shell__scan" aria-hidden="true" />
      <div
        ref={containerRef}
        style={{ height: `${height}px`, width: '100%' }}
        className="map-wow-canvas rounded-2xl border border-border transition-transform duration-500 hover:[transform:rotateX(1.2deg)_rotateY(-1deg)_scale(1.004)]"
      />
      <div className="pointer-events-none absolute bottom-5 left-5 rounded-full border border-white/50 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-emerald-950 shadow-lg backdrop-blur">
        Live vulnerability layer · San Policarpo
      </div>
      <div className="pointer-events-none absolute right-5 top-5 hidden rounded-2xl border border-white/40 bg-white/75 px-3 py-2 text-[11px] font-medium text-slate-700 shadow-lg backdrop-blur md:block">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-600" />needs assistance
        <span className="mx-2 inline-block h-2 w-2 rounded-full bg-amber-500" />no relief yet
        <span className="mx-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />relief received
      </div>
    </div>
  )
}
