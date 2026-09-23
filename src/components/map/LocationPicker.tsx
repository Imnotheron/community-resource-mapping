'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Crosshair } from 'lucide-react'
import {
  SAN_POLICARPO_LEAFLET_BOUNDS,
  SAN_POLICARPO_MAP_POLYGON,
  isWithinSanPolicarpoServiceEnvelope,
} from '@/lib/san-policarpo-geography'

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LocationPickerProps {
  center: [number, number]
  onLocationSelect: (lat: number, lng: number) => void
  initialPosition?: [number, number]
}

const STRICT_BOUNDS = L.latLngBounds(
  SAN_POLICARPO_LEAFLET_BOUNDS,
)

const WORLD_MASK_RING: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
]

function MapCoverageLock() {
  const map = useMap()

  useEffect(() => {
    map.setMaxBounds(STRICT_BOUNDS)
    map.options.maxBoundsViscosity = 1
    map.setMinZoom(11)
    map.setMaxZoom(18)

    const mask = L.polygon(
      [WORLD_MASK_RING, SAN_POLICARPO_MAP_POLYGON],
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

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (
        !isWithinSanPolicarpoServiceEnvelope(
          e.latlng.lat,
          e.latlng.lng,
        )
      ) {
        alert('Please select a location inside the San Policarpo map area.')
        return
      }

      onLocationSelect(
        e.latlng.lat,
        e.latlng.lng,
      )
    },
  })
  return null
}

export default function LocationPicker({ center, onLocationSelect, initialPosition }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialPosition &&
      isWithinSanPolicarpoServiceEnvelope(
        initialPosition[0],
        initialPosition[1],
      )
      ? initialPosition
      : null,
  )

  const handleLocationSelect = (lat: number, lng: number) => {
    if (
      !isWithinSanPolicarpoServiceEnvelope(
        lat,
        lng,
      )
    ) {
      alert('Please select a location inside the San Policarpo map area.')
      return
    }

    setPosition([lat, lng])
    onLocationSelect(lat, lng)
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords

          if (
            !isWithinSanPolicarpoServiceEnvelope(
              latitude,
              longitude,
            )
          ) {
            alert('Your current location is outside the San Policarpo map area.')
            return
          }

          setPosition([latitude, longitude])
          onLocationSelect(latitude, longitude)
        },
        (err) => {
          console.error('Error getting location:', err)
          alert('Unable to get your current location. Please try again or click on the map.')
        }
      )
    } else {
      alert('Geolocation is not supported by your browser. Please click on the map to select your location.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400 flex-1">
          {position ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Location selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </span>
          ) : (
            <span>Click on the map to select your house location</span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleGetCurrentLocation}
          className="gap-2 text-xs ml-2 flex-shrink-0"
        >
          <Crosshair className="w-3 h-3" />
          Use My Location
        </Button>
      </div>
      <div className="h-[300px] rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
        <MapContainer
          center={center}
          zoom={14}
          minZoom={11}
          maxZoom={18}
          maxBounds={SAN_POLICARPO_LEAFLET_BOUNDS}
          maxBoundsViscosity={1}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <MapCoverageLock />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          {position && (
            <Marker position={position}>
              <Popup>
                <div className="text-sm font-medium">
                  Selected Location<br />
                  <span className="text-slate-600">
                    {position[0].toFixed(6)}, {position[1].toFixed(6)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  )
}
