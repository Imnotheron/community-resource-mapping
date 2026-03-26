import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'Query too short', results: [] }, { status: 400 })
  }

  try {
    // Search specifically in San Policarpo, Eastern Samar
    // Use a more flexible search query
    const searchQuery = `${query}, San Policarpo, Eastern Samar, Philippines`
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (compatible; CommunityResourceMapper/1.0; +https://community-resource-mapper.example)'
      }
    })

    // Handle 400 and 429 errors gracefully - return empty results instead of error
    if (response.status === 400 || response.status === 429) {
      console.log('Nominatim API returned', response.status, '- returning empty results')
      return NextResponse.json({ results: [] })
    }

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const data = await response.json()

    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.error('Unexpected API response format:', data)
      return NextResponse.json({ results: [] })
    }

    const results = data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      display_name: item.display_name,
      address: item.address
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Geocoding error:', error)
    // Return empty results instead of 500 error to prevent frontend from breaking
    return NextResponse.json({ error: 'Failed to search address', results: [] })
  }
}
