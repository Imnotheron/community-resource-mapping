export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

function clean(value: string | null) {
  return value ? value.trim() : ''
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/barangay|brgy\.?|\(|\)|\.|-|_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SAN_POLICARPO_BARANGAYS = [
  'Barangay No. 1 (Poblacion)',
  'Barangay No. 2 (Poblacion)',
  'Aurog',
  'Bahay',
  'Baras',
  'Bingay',
  'Barobaybay',
  'Cabugawan',
  'Camanhagay',
  'Canaptan',
  'Capiñahan',
  'Jangtud',
  'Japunan',
  'Mabini',
  'Maragano',
  'Oleras',
  'Pangpang',
  'Sukailang',
  'Tan-awan',
]

function pickBarangay(result: any) {
  const address = result?.address || {}
  const displayParts = String(result?.display_name || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const candidates = [
    address.village,
    address.hamlet,
    address.suburb,
    address.neighbourhood,
    address.quarter,
    address.city_district,
    address.locality,
    ...displayParts,
  ].filter(Boolean)

  for (const barangay of SAN_POLICARPO_BARANGAYS) {
    const normalizedBarangay = normalizeText(barangay)

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeText(String(candidate))

      if (normalizedCandidate === normalizedBarangay) return barangay
      if (normalizedCandidate.includes(normalizedBarangay)) return barangay
      if (normalizedBarangay.includes(normalizedCandidate)) return barangay
    }
  }

  return ''
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = clean(searchParams.get('lat'))
    const lng = clean(searchParams.get('lng') || searchParams.get('lon'))

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, message: 'Latitude and longitude are required.' },
        { status: 400 }
      )
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', lat)
    url.searchParams.set('lon', lng)
    url.searchParams.set('zoom', '18')
    url.searchParams.set('addressdetails', '1')

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CommunityResourceMappingSystem/1.0 (San Policarpo LGU)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result) {
      return NextResponse.json(
        { success: false, message: 'Failed to reverse geocode map location.' },
        { status: 502 }
      )
    }

    const rawAddress = result.address || {}
    const barangay = pickBarangay(result)

    return NextResponse.json({
      success: true,
      result,
      address: {
        ...rawAddress,
        barangay,
        latitude: lat,
        longitude: lng,
        displayName: result.display_name || '',
      },
    })
  } catch (error: any) {
    console.error('Reverse geocode failed:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to reverse geocode map location.',
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
