'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, CheckCircle, XCircle, Maximize2, Users, User, Map as MapIcon } from 'lucide-react'
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
      <style>{`
        .leaflet-layer {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
      `}</style>
      
      {!isOnline && (
        <div className="absolute top-2 right-2 z-40 bg-yellow-100/95 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium border border-yellow-300">
          <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
          Offline Mode
        </div>
      )}

      {/* Map Filters Panel (Top Left) */}
      <div className="absolute top-6 left-6 z-[1000] w-[320px] bg-[#f0f0f0]/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden flex flex-col pointer-events-auto border border-white/40 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Map Filters</h3>
          <button className="text-gray-500 hover:text-gray-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Distribution Status */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Distribution Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#00c853]"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Received Relief</span>
                </div>
                <div className="w-6 h-6 rounded-md bg-[#422bc0] text-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#d32f2f]"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Not Received</span>
                </div>
                <div className="w-6 h-6 rounded-md bg-[#422bc0] text-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Vulnerable Groups */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Vulnerable Groups</h4>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 py-2 px-3 bg-[#422bc0] text-white text-xs font-semibold rounded-lg shadow-sm">
                <Users className="w-3.5 h-3.5" /> Seniors
              </button>
              <button className="flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg shadow-sm border border-gray-200">
                <Users className="w-3.5 h-3.5 text-gray-400" /> PWDs
              </button>
              <button className="flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg shadow-sm border border-gray-200">
                <User className="w-3.5 h-3.5 text-gray-400" /> 4Ps
              </button>
              <button className="flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg shadow-sm border border-gray-200">
                <span className="w-3 h-3 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span> Indigent
              </button>
            </div>
          </div>

          {/* Geographic Scope */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Geographic Scope</h4>
            <div className="relative">
              <select className="appearance-none w-full bg-white border border-gray-200 text-gray-700 py-2.5 px-4 pr-8 rounded-lg outline-none text-sm font-medium shadow-sm cursor-pointer">
                <option>All Barangays</option>
                <option>Poblacion</option>
                <option>Others</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
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

      {/* Active Cluster Detail Panel (Bottom Right) */}
      <div className="absolute bottom-10 right-10 z-[1000] w-[340px] bg-[#e1e2e6]/95 dark:bg-slate-800/95 backdrop-blur-md rounded-[24px] shadow-2xl p-6 pointer-events-auto border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#d0d3de] dark:bg-[#422bc0]/30 flex items-center justify-center text-[#422bc0]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white leading-tight text-lg">Barangay Poblacion</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Active Cluster Detail</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 mb-6">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#e4ebfc] dark:bg-slate-700/50 p-4 rounded-xl border border-white/40">
            <p className="text-[11px] font-bold text-gray-600 mb-1">Vulnerable Count</p>
            <p className="text-2xl font-bold text-[#422bc0]">1,248</p>
          </div>
          <div className="bg-[#bcebcf] dark:bg-emerald-900/20 p-4 rounded-xl border border-white/40">
            <p className="text-[11px] font-bold text-gray-800 mb-1">Distributed</p>
            <p className="text-2xl font-bold text-[#00604a]">842</p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Recent Distribution Activity</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-[#00c853]"></div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-gray-200">Medical Kits Delivered</p>
                <p className="text-[10px] text-gray-500 font-medium">Zone 4 • 24 mins ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-[#422bc0]"></div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-gray-200">New Registration Verified</p>
                <p className="text-[10px] text-gray-500 font-medium">Sector B • 2 hours ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-8">
          <button className="flex-1 bg-[#422bc0] hover:bg-[#3421a1] text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            View Detailed Statistics
          </button>
          <button className="min-w-[48px] w-12 h-12 bg-[#8c3efa] hover:bg-[#7b36de] rounded-xl flex items-center justify-center text-white shadow-md">
            <MapIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Exit Map Button (only shown when interactive) */}
      {isMapInteractive && (
        <div className="absolute top-2 right-2 z-[2000]">
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
