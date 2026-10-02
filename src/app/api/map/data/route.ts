export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  SAN_POLICARPO_BARANGAY_REFERENCE_POINTS,
  isWithinSanPolicarpoServiceEnvelope,
  matchSanPolicarpoBarangay,
} from '@/lib/san-policarpo-geography'

import { requireRequestUser } from '@/lib/request-user-session'
import { getVulnerableStatuses } from '@/lib/vulnerable-status'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN', 'WORKER'],
    })
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

    const profileStatuses = await getVulnerableStatuses(
      profiles.map((profile) => profile.id),
    )

    const mapData = profiles
      .map((profile) => {
      const profileStatus = profileStatuses.get(profile.id)?.status || 'ACTIVE'
      if (profileStatus !== 'ACTIVE') return null

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
        registrationDate: profile.createdAt,
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
        profileStatus,
      }
    })
      .filter(
        (
          point,
        ): point is NonNullable<
          typeof point
        > => point !== null,
      )

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching map data:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch map data' },
      { status: 500 },
    )
  }
}
