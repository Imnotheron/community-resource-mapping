'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, CheckCircle, XCircle, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface VulnerablePoint {
  id: string
  name: string
  latitude: number
  longitude: number
  barangay: string
  address: string
  vulnerabilityTypes: string[]
  hasReceivedRelief: boolean
  lastDistributionDate?: string
  totalMembers?: number
  vulnerableMembers?: number
}

interface VulnerableMapProps {
  points: VulnerablePoint[]
  center?: [number, number]
  zoom?: number
  showHeatmap?: boolean
}

// Memoized custom icons
function useCustomIcons() {
  return useMemo(() => ({
    receivedIcon: new L.DivIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: #10b981;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    }),
    notReceivedIcon: new L.DivIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: #ef4444;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }), [])
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
      // Enable all map interactions
      map.dragging.enable()
      map.scrollWheelZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoom.enable()
      map.boxZoom.enable()
      map.keyboard.enable()
    } else {
      // Disable all map interactions
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

export default function VulnerableMap({
  points,
  center = [12.1792, 125.5072], // Municipal Center of San Policarpo
  zoom = 12,
  showHeatmap = true
}: VulnerableMapProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isMapInteractive, setIsMapInteractive] = useState(false) // Blur is on by default
  const { receivedIcon, notReceivedIcon } = useCustomIcons()

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

  const receivedPoints = points.filter(p => p.hasReceivedRelief)
  const notReceivedPoints = points.filter(p => !p.hasReceivedRelief)

  // Calculate center if points exist
  const mapCenter = points.length > 0
    ? [
        points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
        points.reduce((sum, p) => sum + p.longitude, 0) / points.length
      ] as [number, number]
    : center

  return (
    <div className="relative w-full h-full min-h-[600px]">
      {!isOnline && (
        <div className="absolute top-2 right-2 z-30 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg text-sm font-medium border border-yellow-300 dark:border-yellow-700">
          <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
          Offline Mode - Showing cached data
        </div>
      )}

      <div className="absolute top-2 left-2 z-30 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-lg text-sm space-y-1">
        <div className="font-medium mb-2">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
          <span>Received ({receivedPoints.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span>Not Received ({notReceivedPoints.length})</span>
        </div>
      </div>

      {/* Blur Overlay when locked - properly contained */}
      {!isMapInteractive && (
        <div className="absolute inset-0 z-20 backdrop-blur-sm bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center rounded-lg">
          <div className="text-center space-y-4 p-8 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center shadow-lg mb-4">
              <MapPin className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              View Vulnerable Groups Map
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
              Click the button below to interact with the map and explore the distribution data
            </p>
            <Button
              onClick={() => setIsMapInteractive(true)}
              size="lg"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white w-full"
            >
              <Maximize2 className="w-5 h-5" />
              Enter Map
            </Button>
          </div>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '600px', width: '100%', zIndex: 0 }}
        className="rounded-lg"
      >
        <MapView center={mapCenter} zoom={zoom} />
        <MapInteractivity isInteractive={isMapInteractive} />

        {/* Offline tile layer or OpenStreetMap */}
        {isOnline ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution=''
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* Heatmap for received (green areas) */}
        {showHeatmap && receivedPoints.length > 0 && (
          <>
            {receivedPoints.map((point) => (
              <CircleMarker
                key={`heat-green-${point.id}`}
                center={[point.latitude, point.longitude]}
                radius={30}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.2,
                  weight: 0
                }}
              />
            ))}
          </>
        )}

        {/* Heatmap for not received (red areas) */}
        {showHeatmap && notReceivedPoints.length > 0 && (
          <>
            {notReceivedPoints.map((point) => (
              <CircleMarker
                key={`heat-red-${point.id}`}
                center={[point.latitude, point.longitude]}
                radius={30}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.2,
                  weight: 0
                }}
              />
            ))}
          </>
        )}

        {/* Markers for received relief */}
        {receivedPoints.map((point) => (
          <Marker
            key={`marker-${point.id}`}
            position={[point.latitude, point.longitude]}
            icon={receivedIcon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold">{point.name}</h3>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Barangay:</strong> {point.barangay}</p>
                  <p><strong>Address:</strong> {point.address}</p>
                  {point.totalMembers && (
                    <p><strong>Household:</strong> {point.totalMembers} members</p>
                  )}
                  {point.lastDistributionDate && (
                    <p className="text-emerald-600">
                      <strong>Last Relief:</strong> {new Date(point.lastDistributionDate).toLocaleDateString()}
                    </p>
                  )}
                  <div className="mt-2">
                    <strong>Vulnerability:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {point.vulnerabilityTypes.map((type, i) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Markers for not received relief */}
        {notReceivedPoints.map((point) => (
          <Marker
            key={`marker-${point.id}`}
            position={[point.latitude, point.longitude]}
            icon={notReceivedIcon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <h3 className="font-bold">{point.name}</h3>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Barangay:</strong> {point.barangay}</p>
                  <p><strong>Address:</strong> {point.address}</p>
                  {point.totalMembers && (
                    <p><strong>Household:</strong> {point.totalMembers} members</p>
                  )}
                  <p className="text-red-600 font-medium">
                    ⚠️ Has not received relief yet
                  </p>
                  <div className="mt-2">
                    <strong>Vulnerability:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {point.vulnerabilityTypes.map((type, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Exit Map Button (only shown when interactive) */}
      {isMapInteractive && (
        <div className="absolute top-2 right-2 z-30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMapInteractive(false)}
            className="gap-2 shadow-lg bg-white dark:bg-slate-800"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Map</span>
          </Button>
        </div>
      )}
    </div>
  )
}
