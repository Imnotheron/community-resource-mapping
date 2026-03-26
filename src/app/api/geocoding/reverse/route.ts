import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)

  if (isNaN(latNum) || isNaN(lonNum)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lonNum}&zoom=14&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Community-Resource-Mapping-System'
      }
    })

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const data = await response.json()

    // Extract relevant address components
    const address = data.address || {}
    const result = {
      display_name: data.display_name || '',
      municipality: address.municipality || address.city || address.town || '',
      barangay: address.barangay || address.suburb || address.village || address.district || address.neighbourhood || '',
      province: address.state || address.province || '',
      country: address.country || '',
      // More detailed street information
      street: address.road || address.street || address.pedestrian || address.footway || address.residential || '',
      // Additional address details
      house_number: address.house_number || address.building || '',
      postcode: address.postcode || '',
      lat: latNum,
      lon: lonNum
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return NextResponse.json(
      { error: 'Failed to get location details', result: null },
      { status: 500 }
    )
  }
}
