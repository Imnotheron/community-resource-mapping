export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  SAN_POLICARPO_BARANGAY_REFERENCE_POINTS,
  isWithinSanPolicarpoServiceEnvelope,
  matchSanPolicarpoBarangay,
} from '@/lib/san-policarpo-geography'
import {
  getLatestMapCycleResetBefore,
  getMapReliefCycleSettings,
  maybeAutoResetMapReliefCycle,
} from '@/lib/map-relief-cycle'
import { requireRequestUser } from '@/lib/request-user-session'
import { getVulnerableStatuses } from '@/lib/vulnerable-status'

function parseDateTimeParam(
  value: string | null,
  endOfDay = false,
) {
  if (!value) return null

  const trimmed = value.trim()
  const simpleDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)

  const date = simpleDate
    ? new Date(
        `${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`,
      )
    : new Date(trimmed)

  return Number.isNaN(date.getTime()) ? null : date
}

function statusAsOf(
  statusRecord:
    | {
        status?: string | null
        updatedAt?: string | Date | null
      }
    | undefined,
  cutoff: Date,
  historical: boolean,
) {
  if (!statusRecord) return 'ACTIVE'

  const status = String(
    statusRecord.status || 'ACTIVE',
  ).toUpperCase()

  if (!historical || !statusRecord.updatedAt) {
    return status
  }

  const updatedAt = new Date(statusRecord.updatedAt)

  // The current status table stores the latest lifecycle change.
  // If that change happened after the selected historical date,
  // the profile was still active at that earlier point in time.
  if (
    !Number.isNaN(updatedAt.getTime()) &&
    updatedAt > cutoff
  ) {
    return 'ACTIVE'
  }

  return status
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN', 'WORKER'],
    })
    if ('error' in auth) return auth.error

    const asOfParam =
      request.nextUrl.searchParams.get('asOf')
    const fromParam =
      request.nextUrl.searchParams.get('from')

    const cutoff =
      parseDateTimeParam(asOfParam, true) ||
      new Date()

    const requestedPeriodStart =
      parseDateTimeParam(fromParam, false)

    const cycleReset =
      requestedPeriodStart
        ? null
        : await getLatestMapCycleResetBefore(
            cutoff,
          )

    const cycleStart =
      requestedPeriodStart ||
      cycleReset?.resetAt ||
      null

    const historical = Boolean(
      asOfParam || fromParam,
    )

    if (!historical) {
      await maybeAutoResetMapReliefCycle(
        new Date(),
      )
    }

    const profiles =
      await db.vulnerableProfile.findMany({
        where: {
          registrationStatus: 'APPROVED',
          createdAt: {
            lte: cutoff,
          },
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
                in: [
                  'APPROVED',
                  'DISTRIBUTED',
                ],
              },
              distributionDate: {
                lte: cutoff,
                ...(cycleStart
                  ? { gte: cycleStart }
                  : {}),
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

    const profileStatuses =
      await getVulnerableStatuses(
        profiles.map(
          (profile) => profile.id,
        ),
      )

    const mapData = profiles
      .map((profile) => {
        const lifecycle =
          profileStatuses.get(profile.id)

        const profileStatus = statusAsOf(
          lifecycle,
          cutoff,
          historical,
        )

        if (profileStatus !== 'ACTIVE') {
          return null
        }

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
              : barangayReference?.lat ??
                null

        const longitude =
          hasProfileCoordinates
            ? profile.longitude
            : hasHouseholdCoordinates
              ? profile.household?.longitude
              : barangayReference?.lng ??
                null

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

        const latestRelief =
          profile.reliefDistributions[0]

        const hasReceivedRelief =
          Boolean(latestRelief)

        let vulnerabilityTypes: string[] =
          []

        try {
          const parsed = JSON.parse(
            profile.vulnerabilityTypes ||
              '[]',
          )
          vulnerabilityTypes =
            Array.isArray(parsed)
              ? parsed
              : []
        } catch {
          vulnerabilityTypes = []
        }

        return {
          id: profile.id,
          name: `${profile.lastName}, ${profile.firstName} ${profile.middleName || ''} ${profile.suffix || ''}`
            .replace(/\s+/g, ' ')
            .trim(),
          email: profile.emailAddress,
          mobileNumber:
            profile.mobileNumber ||
            'Not recorded',
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
            .replace(
              /^\s*,|,\s*$/g,
              '',
            )
            .trim(),
          vulnerabilityTypes,
          registrationDate:
            profile.createdAt,
          disabilityType:
            profile.disabilityType,
          disabilityCause:
            profile.disabilityCause ||
            null,
          hasReceivedRelief,
          lastDistributionDate:
            latestRelief
              ?.distributionDate ||
            null,
          lastDistributionType:
            latestRelief
              ?.distributionType ||
            null,
          lastItemsReceived:
            latestRelief
              ?.itemsProvided ||
            null,
          lastReliefStatus:
            latestRelief?.status ||
            null,
          markerStatus:
            hasReceivedRelief
              ? 'GIVEN'
              : 'NEEDS_ASSISTANCE',
          totalMembers:
            profile.household
              ?.totalMembers,
          vulnerableMembers:
            profile.household
              ?.vulnerableMembers,
          needsAssistance:
            profile.needsAssistance,
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
        asOf: cutoff,
        cycleStartedAt:
          cycleStart || null,
        cycleSource:
          requestedPeriodStart
            ? 'PERIOD'
            : cycleReset
              ? cycleReset.resetBy === 'SYSTEM_AUTO_RESET'
                ? 'AUTO_RESET'
                : 'MANUAL_RESET'
              : 'INITIAL',
        ...(await (async () => {
          const settings = await getMapReliefCycleSettings()
          if (!settings.resetIntervalDays) {
            return {
              resetIntervalDays: null,
              nextAutoResetAt: null,
            }
          }

          const latestCurrentCycle =
            await getLatestMapCycleResetBefore(
              new Date(),
            )

          const base =
            latestCurrentCycle?.resetAt ||
            settings.updatedAt

          return {
            resetIntervalDays:
              settings.resetIntervalDays,
            nextAutoResetAt: new Date(
              base.getTime() +
                settings.resetIntervalDays *
                  24 *
                  60 *
                  60 *
                  1000,
            ),
          }
        })()),
      },
      {
        headers: {
          'Cache-Control':
            'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error(
      'Error fetching map data:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to fetch map data',
      },
      { status: 500 },
    )
  }
}
