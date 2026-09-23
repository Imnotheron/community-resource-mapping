'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import {
  SAN_POLICARPO_LEAFLET_BOUNDS,
  SAN_POLICARPO_MAP_POLYGON,
} from '@/lib/san-policarpo-geography'

const WORLD_MASK_RING: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
]

function CoverageMask() {
  const map = useMap()

  useEffect(() => {
    map.setMaxBounds(
      L.latLngBounds(
        SAN_POLICARPO_LEAFLET_BOUNDS,
      ),
    )
    map.options.maxBoundsViscosity = 1

    const mask = L.polygon(
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

    const outline = L.polygon(
      SAN_POLICARPO_MAP_POLYGON,
      {
        interactive: false,
        color: '#059669',
        weight: 2,
        opacity: 0.9,
        fill: false,
      },
    ).addTo(map)

    return () => {
      mask.remove()
      outline.remove()
    }
  }, [map])

  return null
}

export function StaticSanPolicarpoMapPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <MapContainer
        bounds={SAN_POLICARPO_LEAFLET_BOUNDS}
        boundsOptions={{ padding: [0, 0] }}
        maxBounds={SAN_POLICARPO_LEAFLET_BOUNDS}
        maxBoundsViscosity={1}
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
        <CoverageMask />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-1 right-2 z-[400] text-[0.55rem] text-slate-500">
        © OpenStreetMap contributors
      </div>
    </div>
  )
}
