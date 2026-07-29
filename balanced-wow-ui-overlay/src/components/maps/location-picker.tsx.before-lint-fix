'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface LocationPickerProps {
  initialLatitude?: number
  initialLongitude?: number
  onChange: (lat: number, lng: number, address?: string) => void
  height?: number
}

interface SearchResult {
  lat: number
  lon: number
  display_name: string
}

export function LocationPicker({
  initialLatitude,
  initialLongitude,
  onChange,
  height = 320,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const DEFAULT_LAT = initialLatitude ?? 12.1792
  const DEFAULT_LNG = initialLongitude ?? 125.5072

  // Init map
  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 14,
    })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    const icon = L.divIcon({
      html: `<div style="width:20px;height:20px;border-radius:50%;background:var(--primary);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
    const marker = L.marker([DEFAULT_LAT, DEFAULT_LNG], { icon, draggable: true }).addTo(map)
    markerRef.current = marker
    marker.on('dragend', () => {
      const ll = marker.getLatLng()
      onChange(ll.lat, ll.lng)
    })
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      onChange(e.latlng.lat, e.latlng.lng)
    })
    setTimeout(() => map.invalidateSize(), 100)
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Search
  const handleSearch = async () => {
    if (query.trim().length < 3) return
    setSearching(true)
    setShowResults(true)
    try {
      const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectResult = (r: SearchResult) => {
    if (!mapRef.current || !markerRef.current) return
    mapRef.current.setView([r.lat, r.lon], 16)
    markerRef.current.setLatLng([r.lat, r.lon])
    onChange(r.lat, r.lon, r.display_name)
    setShowResults(false)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search address in San Policarpo..."
              className="pl-9"
            />
          </div>
          <Button type="button" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>
        {showResults && (
          <div className="absolute z-[1000] mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg scroll-area-thin">
            {results.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No results found</div>
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectResult(r)}
                  className="flex w-full items-start gap-2 border-b border-border p-3 text-left text-sm last:border-0 hover:bg-muted"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        style={{ height: `${height}px`, width: '100%' }}
        className="rounded-md border border-border"
      />
      <p className="text-xs text-muted-foreground">
        Drag the marker or click on the map to set the location.
      </p>
    </div>
  )
}
