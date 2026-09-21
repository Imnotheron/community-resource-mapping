'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const SAN_POLICARPO_BOUNDS: [[number, number], [number, number]] = [
  [12.125, 125.445],
  [12.275, 125.575],
]

export function StaticSanPolicarpoMapPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <MapContainer
        bounds={SAN_POLICARPO_BOUNDS}
        boundsOptions={{ padding: [0, 0] }}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        touchZoom={false}
        style={{ height: '100%', width: '100%' }}
        className="pointer-events-none h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-1 right-2 z-[400] text-[0.55rem] text-slate-500">
        © OpenStreetMap contributors
      </div>
    </div>
  )
}
