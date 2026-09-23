'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { SAN_POLICARPO_VIEW_BOUNDS } from '@/lib/san-policarpo-geography'

const SAN_POLICARPO_BOUNDS = SAN_POLICARPO_VIEW_BOUNDS

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
