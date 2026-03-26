'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, Maximize2, Phone, Mail, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface SingleLocationMapProps {
  name: string
  latitude: number
  longitude: number
  address: string
  barangay: string
  vulnerabilityTypes?: string[]
  phone?: string
  email?: string
  status?: string
}

// Memoized custom icon
function useTealIcon() {
  return useMemo(() => {
    return new L.DivIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: #0d9488;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    })
  }, [])
}

function MapView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

function MapInteractivity({ isInteractive }: { isInteractive: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (isInteractive) {
      map.dragging.enable()
      map.scrollWheelZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoom.enable()
      map.boxZoom.enable()
      map.keyboard.enable()
    } else {
      map.dragging.disable()
      map.scrollWheelZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()
    }
  }, [map, isInteractive])

  return null
}

export default function SingleLocationMap({
  name,
  latitude,
  longitude,
  address,
  barangay,
  vulnerabilityTypes = [],
  phone,
  email,
  status
}: SingleLocationMapProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isMapInteractive, setIsMapInteractive] = useState(false)
  const tealIcon = useTealIcon()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {!isOnline && (
        <div className="absolute top-2 right-2 z-30 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg text-sm font-medium border border-yellow-300 dark:border-yellow-700">
          <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
          Offline Mode
        </div>
      )}

      {/* Blur Overlay when locked */}
      {!isMapInteractive && (
        <div className="absolute inset-0 z-20 backdrop-blur-sm bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center rounded-lg">
          <div className="text-center space-y-4 p-8 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm">
            <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center shadow-lg mb-4">
              <MapPin className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              View Location
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
              Click the button below to view the location on the map
            </p>
            <Button
              onClick={() => setIsMapInteractive(true)}
              size="lg"
              className="gap-2 bg-teal-600 hover:bg-teal-700 text-white w-full"
            >
              <Maximize2 className="w-5 h-5" />
              View Map
            </Button>
          </div>
        </div>
      )}

      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height: '500px', width: '100%', zIndex: 0 }}
        className="rounded-lg"
      >
        <MapView center={[latitude, longitude]} zoom={16} />
        <MapInteractivity isInteractive={isMapInteractive} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[latitude, longitude]} icon={tealIcon}>
          <Popup>
            <div className="p-3 min-w-[250px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-teal-600" />
                </div>
                <h3 className="font-bold text-slate-900">{name}</h3>
              </div>

              {status && (
                <div className="mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {status}
                  </span>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700">{address}</p>
                    <p className="text-slate-600">{barangay}</p>
                  </div>
                </div>

                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-teal-600" />
                    <p className="text-slate-700">{phone}</p>
                  </div>
                )}

                {email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-teal-600" />
                    <p className="text-slate-700 truncate">{email}</p>
                  </div>
                )}

                {vulnerabilityTypes && vulnerabilityTypes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-1 mb-2">
                      <Shield className="w-4 h-4 text-teal-600" />
                      <span className="font-medium text-slate-700 text-xs">Vulnerability:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {vulnerabilityTypes.map((type, i) => (
                        <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">
                          {type.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Exit Map Button */}
      {isMapInteractive && (
        <div className="absolute top-2 right-2 z-30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMapInteractive(false)}
            className="gap-2 shadow-lg bg-white dark:bg-slate-800"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Close Map</span>
          </Button>
        </div>
      )}
    </div>
  )
}
