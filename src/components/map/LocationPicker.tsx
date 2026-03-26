'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Crosshair } from 'lucide-react'

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

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function LocationPicker({ center, onLocationSelect, initialPosition }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition || null)

  const handleLocationSelect = (lat: number, lng: number) => {
    setPosition([lat, lng])
    onLocationSelect(lat, lng)
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
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
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
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
