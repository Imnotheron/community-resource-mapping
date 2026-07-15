'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
} from 'lucide-react'

import {
  SAN_POLICARPO_BOUNDS,
  SAN_POLICARPO_CENTER,
  isWithinSanPolicarpoServiceEnvelope,
} from '@/lib/san-policarpo-geography'

type PickedAddress = {
  latitude: string
  longitude: string
  houseNumber: string
  street: string
  barangay: string
  municipality: string
  province: string
  displayName: string
}

interface AddressPickerMapProps {
  lat?: number | null
  lng?: number | null
  onSelect: (
    address: PickedAddress,
  ) => void
}

type MarkerPosition = {
  lat: number
  lng: number
}

type ReverseGeocodePayload = {
  success: boolean
  code?: string
  message?: string
  warning?: string
  verified?: boolean
  address?: PickedAddress
}

class AddressLookupError extends Error {
  code?: string

  constructor(
    message: string,
    code?: string,
  ) {
    super(message)
    this.name =
      'AddressLookupError'
    this.code = code
  }
}

const MAP_STYLE = {
  version: 8,
  sources: {
    cartoVoyager: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-voyager',
      type: 'raster',
      source: 'cartoVoyager',
      paint: {
        'raster-opacity': 1,
        'raster-saturation': -0.25,
        'raster-contrast': 0.02,
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.95,
      },
    },
  ],
} as any

function getSafePosition(
  lat?: number | null,
  lng?: number | null,
): MarkerPosition {
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    isWithinSanPolicarpoServiceEnvelope(
      lat,
      lng,
    )
  ) {
    return { lat, lng }
  }

  return {
    ...SAN_POLICARPO_CENTER,
  }
}

async function reverseGeocode(
  lat: number,
  lng: number,
  signal: AbortSignal,
) {
  const response = await fetch(
    `/api/geocoding/reverse?lat=${encodeURIComponent(
      lat,
    )}&lng=${encodeURIComponent(
      lng,
    )}`,
    {
      cache: 'no-store',
      signal,
    },
  )

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | ReverseGeocodePayload
      | null

  if (
    !response.ok ||
    !data?.success ||
    !data.address
  ) {
    throw new AddressLookupError(
      data?.message ||
        'Unable to verify this map location.',
      data?.code,
    )
  }

  return {
    address: data.address,
    warning: data.warning || '',
  }
}

function createPickerMarkerElement() {
  const element =
    document.createElement('div')

  element.className =
    'crms-address-picker-marker'
  element.innerHTML = `
    <div class="crms-address-picker-marker__pin">
      <div class="crms-address-picker-marker__dot"></div>
    </div>
    <div class="crms-address-picker-marker__shadow"></div>
  `

  return element
}

export default function AddressPickerMap({
  lat,
  lng,
  onSelect,
}: AddressPickerMapProps) {
  const mapContainerRef =
    useRef<HTMLDivElement>(null)
  const mapRef =
    useRef<maplibregl.Map | null>(
      null,
    )
  const markerRef =
    useRef<maplibregl.Marker | null>(
      null,
    )
  const onSelectRef =
    useRef(onSelect)
  const requestNumberRef =
    useRef(0)
  const activeRequestRef =
    useRef<AbortController | null>(
      null,
    )

  const initialPosition =
    useMemo(
      () =>
        getSafePosition(lat, lng),
      [lat, lng],
    )

  const lastValidPositionRef =
    useRef<MarkerPosition>(
      initialPosition,
    )

  const [
    ,
    setPosition,
  ] = useState<MarkerPosition>(
    initialPosition,
  )
  const [
    loadingAddress,
    setLoadingAddress,
  ] = useState(false)
  const [
    lastAddress,
    setLastAddress,
  ] = useState('')
  const [
    lastError,
    setLastError,
  ] = useState('')
  const [
    lastWarning,
    setLastWarning,
  ] = useState('')

  useEffect(() => {
    onSelectRef.current =
      onSelect
  }, [onSelect])

  const restoreLastValidPosition =
    useCallback(() => {
      const previous =
        lastValidPositionRef.current

      setPosition(previous)

      markerRef.current?.setLngLat([
        previous.lng,
        previous.lat,
      ])

      mapRef.current?.easeTo({
        center: [
          previous.lng,
          previous.lat,
        ],
        zoom: Math.max(
          mapRef.current.getZoom(),
          14.4,
        ),
        duration: 360,
        essential: true,
      })
    }, [])

  const pickPosition =
    useCallback(
      async (
        nextPosition: MarkerPosition,
      ) => {
        if (
          !isWithinSanPolicarpoServiceEnvelope(
            nextPosition.lat,
            nextPosition.lng,
          )
        ) {
          setLastAddress('')
          setLastWarning('')
          setLastError(
            'Please select a location inside San Policarpo, Eastern Samar.',
          )
          restoreLastValidPosition()
          return
        }

        activeRequestRef.current?.abort()

        const controller =
          new AbortController()
        activeRequestRef.current =
          controller

        const requestNumber =
          ++requestNumberRef.current

        setPosition(nextPosition)
        setLoadingAddress(true)
        setLastAddress('')
        setLastError('')
        setLastWarning('')

        markerRef.current?.setLngLat([
          nextPosition.lng,
          nextPosition.lat,
        ])

        mapRef.current?.stop()
        mapRef.current?.easeTo({
          center: [
            nextPosition.lng,
            nextPosition.lat,
          ],
          zoom: Math.max(
            mapRef.current.getZoom(),
            15,
          ),
          duration: 420,
          essential: true,
        })

        try {
          const result =
            await reverseGeocode(
              nextPosition.lat,
              nextPosition.lng,
              controller.signal,
            )

          if (
            requestNumber !==
            requestNumberRef.current
          ) {
            return
          }

          lastValidPositionRef.current =
            nextPosition

          setLastAddress(
            result.address.displayName,
          )
          setLastWarning(
            result.warning,
          )
          setLastError('')

          onSelectRef.current(
            result.address,
          )
        } catch (error: any) {
          if (
            error?.name ===
            'AbortError'
          ) {
            return
          }

          if (
            requestNumber !==
            requestNumberRef.current
          ) {
            return
          }

          setLastAddress('')
          setLastWarning('')
          setLastError(
            error?.message ||
              'Unable to verify this address. Move the marker or enter it manually.',
          )

          /**
           * Do not save rejected coordinates and do not overwrite the form
           * with the hard-coded municipality. Return the marker to the last
           * verified point.
           */
          restoreLastValidPosition()
        } finally {
          if (
            requestNumber ===
            requestNumberRef.current
          ) {
            setLoadingAddress(false)
          }
        }
      },
      [
        restoreLastValidPosition,
      ],
    )

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return
    }

    const map = new maplibregl.Map({
      container:
        mapContainerRef.current,
      style: MAP_STYLE,
      center: [
        initialPosition.lng,
        initialPosition.lat,
      ],
      zoom: 14.4,
      minZoom: 11.2,
      maxZoom: 18,
      maxBounds:
        SAN_POLICARPO_BOUNDS,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 0,
    })

    mapRef.current = map

    map.addControl(
      new maplibregl.NavigationControl(
        {
          showCompass: false,
          visualizePitch: false,
        },
      ),
      'bottom-right',
    )

    map.addControl(
      new maplibregl.AttributionControl(
        { compact: true },
      ),
      'bottom-left',
    )

    const marker =
      new maplibregl.Marker({
        element:
          createPickerMarkerElement(),
        draggable: true,
        anchor: 'bottom',
      })
        .setLngLat([
          initialPosition.lng,
          initialPosition.lat,
        ])
        .addTo(map)

    markerRef.current = marker

    marker.on('dragend', () => {
      const lngLat =
        marker.getLngLat()

      void pickPosition({
        lat: lngLat.lat,
        lng: lngLat.lng,
      })
    })

    map.on('click', (event) => {
      void pickPosition({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      })
    })

    const resizeObserver =
      new ResizeObserver(() => {
        window.requestAnimationFrame(
          () => map.resize(),
        )
      })

    resizeObserver.observe(
      mapContainerRef.current,
    )

    map.once('load', () => {
      map.resize()
      map.fitBounds(
        SAN_POLICARPO_BOUNDS,
        {
          padding: 36,
          duration: 0,
        },
      )

      window.setTimeout(() => {
        map.easeTo({
          center: [
            initialPosition.lng,
            initialPosition.lat,
          ],
          zoom: 14.4,
          duration: 420,
          essential: true,
        })
      }, 120)
    })

    const timers = [
      80,
      250,
      650,
    ].map((delay) =>
      window.setTimeout(
        () => map.resize(),
        delay,
      ),
    )

    return () => {
      activeRequestRef.current?.abort()
      timers.forEach((timer) =>
        window.clearTimeout(timer),
      )
      resizeObserver.disconnect()
      marker.remove()
      map.remove()
      markerRef.current = null
      mapRef.current = null
    }
  }, [
    initialPosition.lat,
    initialPosition.lng,
    pickPosition,
  ])

  useEffect(() => {
    const safePosition =
      getSafePosition(lat, lng)

    setPosition(safePosition)
    lastValidPositionRef.current =
      safePosition

    markerRef.current?.setLngLat([
      safePosition.lng,
      safePosition.lat,
    ])

    mapRef.current?.easeTo({
      center: [
        safePosition.lng,
        safePosition.lat,
      ],
      zoom: Math.max(
        mapRef.current.getZoom(),
        14.4,
      ),
      duration: 360,
      essential: true,
    })
  }, [lat, lng])

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
      <style>{`
        .crms-address-picker-map .maplibregl-canvas {
          outline: none;
        }

        .crms-address-picker-map .maplibregl-control-container {
          font-family: "Inter", "Geist Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
        }

        .crms-address-picker-map .maplibregl-ctrl-group {
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.32);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
          backdrop-filter: blur(16px);
        }

        .crms-address-picker-map .maplibregl-ctrl-group button {
          width: 34px;
          height: 34px;
        }

        .crms-address-picker-map .maplibregl-ctrl-attrib {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          color: #64748b;
          font-size: 10px;
        }

        .crms-address-picker-marker {
          position: relative;
          width: 38px;
          height: 48px;
          pointer-events: auto;
          cursor: grab;
        }

        .crms-address-picker-marker:active {
          cursor: grabbing;
        }

        .crms-address-picker-marker__pin {
          position: absolute;
          left: 50%;
          top: 0;
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 3px solid white;
          border-radius: 999px 999px 999px 8px;
          background: linear-gradient(135deg, #059669, #06b6d4);
          box-shadow:
            0 18px 34px rgba(15, 23, 42, 0.28),
            0 0 0 7px rgba(16, 185, 129, 0.16),
            0 0 0 13px rgba(255, 255, 255, 0.70);
          transform: translateX(-50%) rotate(-45deg);
        }

        .crms-address-picker-marker__dot {
          width: 11px;
          height: 11px;
          border-radius: 999px;
          background: white;
        }

        .crms-address-picker-marker__shadow {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 26px;
          height: 8px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.24);
          filter: blur(4px);
          transform: translateX(-50%);
        }
      `}</style>

      <div className="relative h-[340px] w-full overflow-hidden bg-slate-100">
        <div
          ref={mapContainerRef}
          className="crms-address-picker-map h-full w-full"
        />

        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-white/75 bg-white/[0.92] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.13)] backdrop-blur-xl">
          <p className="text-[0.5625rem] font-medium uppercase leading-none tracking-[0.18em] text-slate-500">
            San Policarpo Map Picker
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-snug tracking-tight text-slate-950">
            Click or drag the marker to verify an address
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-gradient-to-r from-white via-emerald-50/35 to-sky-50/35 px-4 py-3 text-sm">
        {loadingAddress ? (
          <span className="inline-flex items-center gap-2 font-medium text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Verifying municipality and barangay...
          </span>
        ) : lastError ? (
          <span className="inline-flex items-start gap-2 font-medium text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{lastError}</span>
          </span>
        ) : lastAddress ? (
          <div className="space-y-1.5">
            <span className="inline-flex items-start gap-2 font-medium text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{lastAddress}</span>
            </span>

            {lastWarning && (
              <p className="pl-6 text-xs font-medium text-amber-700">
                {lastWarning}
              </p>
            )}
          </div>
        ) : (
          <span className="inline-flex items-start gap-2 font-medium text-slate-500">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Select a point. Only a location verified for San Policarpo will update the form.
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
