'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polygon, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Search, Loader2, AlertTriangle, Info, Home, Map as MapIcon, CheckCircle2, Lock, Unlock, Maximize2, Minimize2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface LocationPickerMapProps {
  onLocationSelect: (lat: number, lng: number, address?: {
    display_name: string
    municipality: string
    barangay: string
    province: string
    country: string
    street?: string
  }) => void
  initialLat?: number | null
  initialLng?: number | null
  className?: string
}

// San Policarpo, Eastern Samar barangays with coordinates
const BARANGAYS = [
  { name: 'Alugan', lat: 12.18, lng: 125.48, type: 'most populous' },
  { name: 'Bahay', lat: 12.17, lng: 125.45, type: 'rural coastal', estimated: true },
  { name: 'Bangon', lat: 12.17, lng: 125.49, type: 'inland rural', estimated: true },
  { name: 'Baras (Lipata)', lat: 12.1847, lng: 125.4970, type: 'coastal' },
  { name: 'Binogawan', lat: 12.20, lng: 125.50, type: 'coastal rural', estimated: true },
  { name: 'Cajagwayan', lat: 12.19, lng: 125.47, type: 'rural', estimated: true },
  { name: 'Japunan', lat: 12.22, lng: 125.47, type: 'rural', estimated: true },
  { name: 'Natividad', lat: 12.20, lng: 125.52, type: 'rural', estimated: true },
  { name: 'Pangpang', lat: 12.2316, lng: 125.4542, type: 'coastal' },
  { name: 'Barangay No. 1 (Poblacion)', lat: 12.1786, lng: 125.5083, type: 'town center' },
  { name: 'Barangay No. 2 (Poblacion)', lat: 12.1795, lng: 125.5081, type: 'town center' },
  { name: 'Barangay No. 3 (Poblacion)', lat: 12.1803, lng: 125.5076, type: 'town center' },
  { name: 'Barangay No. 4 (Poblacion)', lat: 12.1815, lng: 125.5059, type: 'town center' },
  { name: 'Barangay No. 5 (Poblacion)', lat: 12.1824, lng: 125.5074, type: 'town center' },
  { name: 'Santa Cruz', lat: 12.2106, lng: 125.4413, type: 'high elevation' },
  { name: 'Tabo', lat: 12.17, lng: 125.51, type: 'rural', estimated: true },
  { name: 'Tan-awan', lat: 12.24, lng: 125.48, type: 'rural', estimated: true },
]

// San Policarpo, Eastern Samar bounds (based on actual barangay coordinates)
const SAN_POLICARPO_BOUNDS = {
  north: 12.25,   // Pangpang (12.2316) + buffer
  south: 12.16,   // Southern barangays + buffer
  east: 125.52,   // Poblacion (125.5083) + buffer
  west: 125.43    // Santa Cruz (125.4413) - buffer
}

// Municipal Center: 12°10′45″N, 125°30′26″E
const SAN_POLICARPO_CENTER: [number, number] = [12.1792, 125.5072]

// Check if coordinates are within San Policarpo bounds
function isWithinSanPolicarpo(lat: number, lng: number): boolean {
  return lat >= SAN_POLICARPO_BOUNDS.south &&
         lat <= SAN_POLICARPO_BOUNDS.north &&
         lng >= SAN_POLICARPO_BOUNDS.west &&
         lng <= SAN_POLICARPO_BOUNDS.east
}

// Find the nearest barangay to given coordinates
function findNearestBarangay(lat: number, lng: number): typeof BARANGAYS[0] | null {
  if (!isWithinSanPolicarpo(lat, lng)) return null
  
  let nearest: typeof BARANGAYS[0] | null = null
  let minDistance = Infinity
  
  for (const barangay of BARANGAYS) {
    const distance = Math.sqrt(
      Math.pow(lat - barangay.lat, 2) + Math.pow(lng - barangay.lng, 2)
    )
    if (distance < minDistance) {
      minDistance = distance
      nearest = barangay
    }
  }
  
  // Only return if within reasonable distance (approx 5km)
  if (minDistance < 0.05) {
    return nearest
  }
  return null
}

// Calculate approximate barangay boundaries (simplified as circles around centers)
function getBarangayBoundaries() {
  return BARANGAYS.map(barangay => {
    const radius = barangay.type === 'town center' ? 0.008 : 0.012 // ~1km for town centers, ~1.3km for rural
    return {
      name: barangay.name,
      center: [barangay.lat, barangay.lng] as [number, number],
      radius: radius
    }
  })
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

function SetBounds() {
  const map = useMap()
  useEffect(() => {
    // Set zoom limits but allow free exploration
    map.setMinZoom(10)
    map.setMaxZoom(18)
    // Don't set maxBounds to allow free exploration
  }, [map])
  return null
}

function LocationMarker({
  position,
  onLocationSelect,
  isInteractive
}: {
  position: [number, number] | null
  onLocationSelect: (lat: number, lng: number) => void
  isInteractive: boolean
}) {
  const map = useMapEvents({
    click(e) {
      // Only allow clicking to select location when map is interactive
      if (isInteractive) {
        const { lat, lng } = e.latlng
        onLocationSelect(lat, lng)
      }
    },
  })

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 })
    }
  }, [position, map])

  return position === null ? null : (
    <Marker position={position} />
  )
}

function MapView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

// Nominatim geocoding for address search - using backend API to avoid CORS
async function searchAddress(query: string): Promise<Array<{lat: number, lon: number, display_name: string}>> {
  if (!query || query.length < 3) return []

  try {
    const response = await fetch(
      `/api/geocoding/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )

    // Always try to get the response, even for non-200 status codes
    const data = await response.json()

    // Handle both response formats: { results: [] } or direct array
    const results = data.results || data
    return Array.isArray(results) ? results.map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      display_name: item.display_name
    })) : []
  } catch (error) {
    console.error('Geocoding error:', error)
    return []
  }
}

// Reverse geocoding to get accurate location details (barangay, municipality, street)
async function reverseGeocode(lat: number, lon: number): Promise<{
  display_name: string
  municipality: string
  barangay: string
  province: string
  country: string
  street?: string
} | null> {
  try {
    console.log('Fetching reverse geocoding from API for:', { lat, lon })
    const response = await fetch(
      `/api/geocoding/reverse?lat=${lat}&lon=${lon}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )

    console.log('Reverse geocoding API response status:', response.status)

    if (!response.ok) {
      console.error('Reverse geocoding API error:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    console.log('Reverse geocoding API data:', data)

    const result = data.result || null

    if (result) {
      // Extract street information from address components
      const address = data.address || {}
      const street = address.road || address.street || address.pedestrian || address.footway || ''

      const finalAddress = {
        display_name: result.display_name || '',
        municipality: result.municipality || '',
        barangay: result.barangay || '',
        province: result.province || '',
        country: result.country || '',
        street: street
      }

      console.log('Final processed address:', finalAddress)
      return finalAddress
    }

    console.log('No result in API response')
    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

export default function LocationPickerMap({
  onLocationSelect,
  initialLat = null,
  initialLng = null,
  className = ''
}: LocationPickerMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    (initialLat && initialLng) ? [initialLat, initialLng] : null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{lat: number, lon: number, display_name: string}>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isMapInteractive, setIsMapInteractive] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)

  useEffect(() => {
    setPosition((initialLat && initialLng) ? [initialLat, initialLng] : null)
  }, [initialLat, initialLng])

  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng])
    onLocationSelect(lat, lng)
    // Perform reverse geocoding to get address details
    await handleReverseGeocode(lat, lng)
    setShowResults(false)
    setSearchQuery('')
  }

  const handleReverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true)
    console.log('Starting reverse geocoding for:', { lat, lng })
    try {
      const address = await reverseGeocode(lat, lng)
      console.log('Reverse geocoding result:', address)
      if (address) {
        // Call onLocationSelect with address information
        console.log('Calling onLocationSelect with address:', address)
        onLocationSelect(lat, lng, address)
      } else {
        console.log('No address data returned from reverse geocoding')
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 3) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      const results = await searchAddress(query)
      // Show all search results (no bounds filtering)
      setSearchResults(results)
      setShowResults(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleUseCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          // Accept any location (no bounds checking)
          setPosition([latitude, longitude])
          onLocationSelect(latitude, longitude)
          // Perform reverse geocoding to get address details
          await handleReverseGeocode(latitude, longitude)
        },
        (error) => {
          console.error('Geolocation error:', error)
          alert('Unable to get your current location. Please click on the map or search for your address.')
        }
      )
    } else {
      alert('Geolocation is not supported by your browser')
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search address in San Policarpo..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            className="gap-2 whitespace-nowrap"
          >
            <MapPin className="w-4 h-4" />
            Use Current Location
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-[2000] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleLocationSelect(result.lat, result.lon)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {result.display_name.split(',').slice(0, 3).join(',')}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {result.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative h-[400px] w-full rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700">
        {/* Blur Overlay when locked */}
        {!isMapInteractive && (
          <div className="absolute inset-0 z-50 backdrop-blur-md bg-slate-100/40 dark:bg-slate-900/40 flex items-center justify-center">
            <div className="text-center space-y-4 p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shadow-lg mb-4">
                <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Select Your Location
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                Click the button below to interact with the map and select your location
              </p>
              <Button
                onClick={() => setIsMapInteractive(true)}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                <Maximize2 className="w-5 h-5" />
                Enter Map
              </Button>
            </div>
          </div>
        )}

        <MapContainer
          center={position || SAN_POLICARPO_CENTER}
          zoom={position ? 15 : 13}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          className="rounded-lg"
        >
          <MapView center={position || SAN_POLICARPO_CENTER} zoom={position ? 15 : 13} />
          <SetBounds />
          <MapInteractivity isInteractive={isMapInteractive} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Barangay Boundaries (Visual Reference) */}
          {getBarangayBoundaries().map((boundary) => (
            <Circle
              key={boundary.name}
              center={boundary.center}
              radius={boundary.radius}
              pathOptions={{
                color: '#94a3b8',
                fillColor: '#94a3b810',
                weight: 1,
                fillOpacity: 0.1
              }}
            />
          ))}
          
          <LocationMarker
            position={position}
            onLocationSelect={handleLocationSelect}
            isInteractive={isMapInteractive}
          />
        </MapContainer>

        {/* Exit Map Button (only shown when interactive) */}
        {isMapInteractive && (
          <div className="absolute top-3 right-3 z-40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMapInteractive(false)}
              className="gap-2 shadow-lg bg-white dark:bg-slate-800"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Exit Map</span>
            </Button>
          </div>
        )}
      </div>

      {/* Coordinates Display */}
      <div className="space-y-2">
        {position && (
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center">
            <strong>Coordinates:</strong> {position[0].toFixed(6)}°N, {position[1].toFixed(6)}°E
          </div>
        )}
        {isGeocoding && (
          <div className="flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Detecting address...</span>
          </div>
        )}
      </div>
    </div>
  )
}
