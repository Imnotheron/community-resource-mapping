export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  SAN_POLICARPO_BARANGAY_REFERENCE_POINTS,
  isWithinSanPolicarpoServiceEnvelope,
  matchSanPolicarpoBarangay,
} from '@/lib/san-policarpo-geography'

type TokenPayload = {
  userId?: string
  role?: string
}

function normalizeRole(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

function readToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''

  return bearerToken || request.cookies.get('token')?.value || ''
}

function decodeToken(token: string): TokenPayload | null {
  if (!token) return null

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const payload = JSON.parse(decoded) as TokenPayload
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

async function requireMapViewer(request: NextRequest) {
  const payload = decodeToken(readToken(request))
  const tokenUserId = String(payload?.userId || '').trim()

  if (!tokenUserId) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Authentication is required to view live vulnerable map data.' },
        { status: 401 },
      ),
    }
  }

  const requestedUserId = String(
    request.nextUrl.searchParams.get('userId') ||
      request.headers.get('x-user-id') ||
      '',
  ).trim()

  if (requestedUserId && requestedUserId !== tokenUserId) {
    return {
      error: NextResponse.json(
        { success: false, message: 'The requested user does not match the current session.' },
        { status: 403 },
      ),
    }
  }

  const user = await db.user.findUnique({
    where: { id: tokenUserId },
    select: { id: true, role: true },
  })

  const role = normalizeRole(user?.role)
  if (!user || (role !== 'ADMIN' && role !== 'WORKER')) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Administrator or field-worker access is required.' },
        { status: 403 },
      ),
    }
  }

  return { user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMapViewer(request)
    if ('error' in auth) return auth.error

    // Every approved vulnerable profile belongs on the operational map.
    // Prefer verified profile coordinates, then household coordinates.
    // If neither exists, use a clearly-labelled barangay reference point so
    // imported/legacy registrations are not silently omitted from the map.
    const profiles = await db.vulnerableProfile.findMany({
      where: {
        registrationStatus: 'APPROVED',
      },
      include: {
        household: {
          select: {
            id: true,
            totalMembers: true,
            vulnerableMembers: true,
            latitude: true,
            longitude: true,
          },
        },
        reliefDistributions: {
          where: {
            status: {
              in: ['APPROVED', 'DISTRIBUTED'],
            },
          },
          select: {
            id: true,
            distributionDate: true,
            distributionType: true,
            itemsProvided: true,
            status: true,
          },
          orderBy: {
            distributionDate: 'desc',
          },
          take: 1,
        },
      },
    })

    const mapData = profiles
      .map((profile) => {
      const matchedBarangay =
        matchSanPolicarpoBarangay(
          profile.barangay,
        )
      const barangayReference =
        matchedBarangay
          ? SAN_POLICARPO_BARANGAY_REFERENCE_POINTS[
              matchedBarangay
            ]
          : null

      const hasProfileCoordinates =
        isWithinSanPolicarpoServiceEnvelope(
          Number(profile.latitude),
          Number(profile.longitude),
        )
      const hasHouseholdCoordinates =
        isWithinSanPolicarpoServiceEnvelope(
          Number(
            profile.household?.latitude,
          ),
          Number(
            profile.household?.longitude,
          ),
        )

      const latitude =
        hasProfileCoordinates
          ? profile.latitude
          : hasHouseholdCoordinates
            ? profile.household?.latitude
            : barangayReference?.lat ?? null
      const longitude =
        hasProfileCoordinates
          ? profile.longitude
          : hasHouseholdCoordinates
            ? profile.household?.longitude
            : barangayReference?.lng ?? null

      if (
        latitude == null ||
        longitude == null
      ) {
        return null
      }

      const locationPrecision =
        hasProfileCoordinates ||
        hasHouseholdCoordinates
          ? 'VERIFIED'
          : 'BARANGAY_REFERENCE'

      const latestRelief = profile.reliefDistributions[0]
      const hasReceivedRelief = Boolean(latestRelief)
      const lastDistributionDate = latestRelief?.distributionDate
      const resetAfterDays = 30
      const reliefAgeDays = lastDistributionDate
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - lastDistributionDate.getTime()) /
                (24 * 60 * 60 * 1000),
            ),
          )
        : null

      const markerStatus =
        hasReceivedRelief &&
        reliefAgeDays !== null &&
        reliefAgeDays < resetAfterDays
          ? 'GIVEN'
          : profile.needsAssistance || hasReceivedRelief
            ? 'NEEDS_ASSISTANCE'
            : 'NO_RELIEF'

      let vulnerabilityTypes: string[] = []
      try {
        const parsed = JSON.parse(profile.vulnerabilityTypes || '[]')
        vulnerabilityTypes = Array.isArray(parsed) ? parsed : []
      } catch {
        vulnerabilityTypes = []
      }

      return {
        id: profile.id,
        name: `${profile.lastName}, ${profile.firstName} ${profile.middleName || ''} ${profile.suffix || ''}`
          .replace(/\s+/g, ' ')
          .trim(),
        email: profile.emailAddress,
        mobileNumber: profile.mobileNumber || 'Not recorded',
        latitude,
        longitude,
        locationPrecision,
        locationLabel:
          locationPrecision ===
          'VERIFIED'
            ? 'Verified registered location'
            : `Approximate barangay location — ${matchedBarangay || profile.barangay || 'barangay'}`,
        barangay: profile.barangay,
        address: `${profile.houseNumber || ''} ${profile.street || ''}, ${profile.barangay || ''}`
          .replace(/\s+/g, ' ')
          .replace(/^\s*,|,\s*$/g, '')
          .trim(),
        vulnerabilityTypes,
        disabilityType: profile.disabilityType,
        disabilityCause: profile.disabilityCause || null,
        hasReceivedRelief,
        lastDistributionDate,
        lastDistributionType: latestRelief?.distributionType || null,
        lastItemsReceived: latestRelief?.itemsProvided || null,
        lastReliefStatus: latestRelief?.status || null,
        reliefAgeDays,
        reliefResetAfterDays: resetAfterDays,
        markerStatus,
        totalMembers: profile.household?.totalMembers,
        vulnerableMembers: profile.household?.vulnerableMembers,
        needsAssistance: profile.needsAssistance,
      }
    })
      .filter(
        (
          point,
        ): point is NonNullable<
          typeof point
        > => point !== null,
      )

    return NextResponse.json({
      success: true,
      points: mapData,
      approvedProfiles:
        profiles.length,
      mappedProfiles:
        mapData.length,
      approximateProfiles:
        mapData.filter(
          (point) =>
            point.locationPrecision ===
            'BARANGAY_REFERENCE',
        ).length,
    })
  } catch (error) {
    console.error('Error fetching map data:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch map data' },
      { status: 500 },
    )
  }
}
