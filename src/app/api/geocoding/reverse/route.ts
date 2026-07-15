export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  isEasternSamarName,
  isSanPolicarpoName,
  isWithinSanPolicarpoServiceEnvelope,
  matchSanPolicarpoBarangay,
} from '@/lib/san-policarpo-geography'

const NOMINATIM_REVERSE_URL =
  'https://nominatim.openstreetmap.org/reverse'

function clean(value: string | null) {
  return value ? value.trim() : ''
}

function toTitleCase(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(' ')
}

function uniqueValues(
  values: unknown[],
) {
  return [
    ...new Set(
      values
        .map((value) =>
          String(value || '').trim(),
        )
        .filter(Boolean),
    ),
  ]
}

function displayParts(result: any) {
  return String(
    result?.display_name || '',
  )
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function municipalityCandidates(
  address: any,
  result: any,
) {
  return uniqueValues([
    address.municipality,
    address.town,
    address.city,
    ...displayParts(result).filter(
      (part) =>
        isSanPolicarpoName(part),
    ),
  ])
}

function provinceCandidates(
  address: any,
  result: any,
) {
  return uniqueValues([
    address.state,
    address.province,
    address.state_district,
    ...displayParts(result).filter(
      (part) =>
        isEasternSamarName(part),
    ),
  ])
}

function pickBarangay(
  result: any,
) {
  const address =
    result?.address || {}

  /**
   * Priority matters. A detailed result may contain:
   *   hamlet/sitio: Tanauan
   *   village/barangay: Natividad
   *
   * The village/barangay must win. A sitio must never replace the barangay.
   */
  const candidates = uniqueValues([
    address.village,
    address.city_district,
    address.quarter,
    address.suburb,
    address.neighbourhood,
    address.hamlet,
    address.locality,
    ...displayParts(result),
  ])

  for (const candidate of candidates) {
    const barangay =
      matchSanPolicarpoBarangay(
        candidate,
      )

    if (barangay) {
      return barangay
    }
  }

  return ''
}

function isSamePlace(
  left: unknown,
  right: unknown,
) {
  const normalize = (value: unknown) =>
    String(value || '')
      .toLowerCase()
      .replace(/[()[\].,_/-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const a = normalize(left)
  const b = normalize(right)

  return Boolean(
    a &&
    b &&
    (a === b ||
      a.includes(b) ||
      b.includes(a)),
  )
}

function buildStreetOrSitio(
  address: any,
  barangay: string,
) {
  const road = uniqueValues([
    address.road,
    address.pedestrian,
    address.residential,
    address.street,
    address.path,
    address.footway,
  ])[0] || ''

  const sitio = uniqueValues([
    address.neighbourhood,
    address.hamlet,
    address.locality,
    address.suburb,
  ]).find(
    (candidate) =>
      !isSamePlace(
        candidate,
        barangay,
      ) &&
      !isSanPolicarpoName(candidate) &&
      !isEasternSamarName(candidate),
  ) || ''

  const formattedRoad =
    toTitleCase(road)
  const formattedSitio =
    toTitleCase(sitio)

  if (
    formattedRoad &&
    formattedSitio &&
    !isSamePlace(
      formattedRoad,
      formattedSitio,
    )
  ) {
    return `${formattedRoad}, ${formattedSitio}`
  }

  return (
    formattedRoad ||
    formattedSitio
  )
}

function constructDisplayName({
  houseNumber,
  street,
  barangay,
}: {
  houseNumber: string
  street: string
  barangay: string
}) {
  return uniqueValues([
    [houseNumber, street]
      .filter(Boolean)
      .join(' '),
    barangay,
    'San Policarpo',
    'Eastern Samar',
    'Philippines',
  ]).join(', ')
}

async function fetchNominatim(
  lat: number,
  lng: number,
) {
  const url = new URL(
    NOMINATIM_REVERSE_URL,
  )

  url.searchParams.set(
    'format',
    'jsonv2',
  )
  url.searchParams.set(
    'lat',
    String(lat),
  )
  url.searchParams.set(
    'lon',
    String(lng),
  )
  url.searchParams.set('zoom', '18')
  url.searchParams.set(
    'addressdetails',
    '1',
  )
  url.searchParams.set(
    'accept-language',
    'en',
  )

  const controller =
    new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    10_000,
  )

  try {
    const response = await fetch(
      url.toString(),
      {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'CommunityResourceMappingSystem/1.0 (San Policarpo LGU)',
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    )

    const result = await response
      .json()
      .catch(() => null)

    if (!response.ok || !result) {
      throw new Error(
        'The map service could not identify this point.',
      )
    }

    return result
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    const { searchParams } =
      new URL(request.url)

    const latText = clean(
      searchParams.get('lat'),
    )
    const lngText = clean(
      searchParams.get('lng') ||
        searchParams.get('lon'),
    )

    const lat = Number(latText)
    const lng = Number(lngText)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_COORDINATES',
          message:
            'Valid latitude and longitude are required.',
        },
        { status: 400 },
      )
    }

    if (
      !isWithinSanPolicarpoServiceEnvelope(
        lat,
        lng,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            'OUTSIDE_SAN_POLICARPO',
          message:
            'That point is outside the San Policarpo registration area.',
        },
        { status: 422 },
      )
    }

    const result =
      await fetchNominatim(lat, lng)

    const rawAddress =
      result.address || {}

    const municipalities =
      municipalityCandidates(
        rawAddress,
        result,
      )
    const provinces =
      provinceCandidates(
        rawAddress,
        result,
      )

    const municipalityVerified =
      municipalities.some(
        isSanPolicarpoName,
      )
    const provinceVerified =
      provinces.some(
        isEasternSamarName,
      ) ||
      displayParts(result).some(
        isEasternSamarName,
      )

    const explicitOtherMunicipality =
      municipalities.find(
        (candidate) =>
          candidate &&
          !isSanPolicarpoName(
            candidate,
          ),
      )

    const barangay =
      pickBarangay(result)

    /**
     * Reject a point when Nominatim explicitly identifies another
     * municipality. Do not overwrite that result with "San Policarpo".
     */
    if (
      explicitOtherMunicipality &&
      !municipalityVerified
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            'OUTSIDE_SAN_POLICARPO',
          message:
            `The selected point was identified as ${explicitOtherMunicipality}, not San Policarpo.`,
          detectedLocation:
            result.display_name || '',
        },
        { status: 422 },
      )
    }

    /**
     * Some rural OSM records omit the municipality but still contain a valid
     * San Policarpo barangay. Accept only when Eastern Samar and an official
     * barangay are both confirmed.
     */
    const ruralBarangayFallback =
      provinceVerified &&
      Boolean(barangay)

    if (
      !provinceVerified ||
      (!municipalityVerified &&
        !ruralBarangayFallback)
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            'LOCATION_NOT_VERIFIED',
          message:
            'The map service could not verify that this point belongs to San Policarpo, Eastern Samar. Move the marker or enter the address manually.',
          detectedLocation:
            result.display_name || '',
        },
        { status: 422 },
      )
    }

    const houseNumber =
      String(
        rawAddress.house_number ||
          '',
      ).trim()

    const street =
      buildStreetOrSitio(
        rawAddress,
        barangay,
      )

    const warning = barangay
      ? ''
      : 'The municipality was verified, but the barangay could not be identified automatically. Select the barangay manually.'

    return NextResponse.json({
      success: true,
      verified: true,
      warning,
      rawDisplayName:
        result.display_name || '',
      address: {
        latitude: String(lat),
        longitude: String(lng),
        houseNumber,
        street,
        barangay,
        municipality:
          'San Policarpo',
        province: 'Eastern Samar',
        displayName:
          constructDisplayName({
            houseNumber,
            street,
            barangay,
          }),
      },
    })
  } catch (error: any) {
    const timedOut =
      error?.name === 'AbortError'

    console.error(
      'Reverse geocode failed:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        code: timedOut
          ? 'GEOCODING_TIMEOUT'
          : 'GEOCODING_FAILED',
        message: timedOut
          ? 'The map service took too long to respond. Try again.'
          : 'The map service could not verify this address. You can still enter it manually.',
      },
      { status: 502 },
    )
  }
}
