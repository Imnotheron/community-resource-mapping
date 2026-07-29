export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRoles } from '@/lib/server-auth'

function parseVulnerabilityTypes(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}

function generalizedCoordinate(value: number): number {
  return Number(value.toFixed(3))
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, [
      'ADMIN',
      'WORKER',
      'VULNERABLE',
    ])
    if (auth.error) return auth.error

    const profiles = await db.vulnerableProfile.findMany({
      where: {
        registrationStatus: 'APPROVED',
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        household: {
          select: {
            id: true,
            totalMembers: true,
            vulnerableMembers: true,
          },
        },
        reliefDistributions: {
          where: { status: 'APPROVED' },
          select: {
            id: true,
            distributionDate: true,
          },
          orderBy: { distributionDate: 'desc' },
          take: 1,
        },
      },
    })

    const canViewSensitiveDetails =
      auth.user.role === 'ADMIN' || auth.user.role === 'WORKER'

    const points = profiles.map((profile) => {
      const hasReceivedRelief = profile.reliefDistributions.length > 0
      const latitude = profile.latitude!
      const longitude = profile.longitude!

      return {
        id: profile.id,
        name: canViewSensitiveDetails
          ? [
              profile.firstName,
              profile.middleName,
              profile.lastName,
              profile.suffix,
            ]
              .filter(Boolean)
              .join(' ')
          : 'Protected household',
        email: canViewSensitiveDetails ? profile.emailAddress : null,
        mobileNumber: canViewSensitiveDetails ? profile.mobileNumber : null,
        latitude: canViewSensitiveDetails
          ? latitude
          : generalizedCoordinate(latitude),
        longitude: canViewSensitiveDetails
          ? longitude
          : generalizedCoordinate(longitude),
        barangay: profile.barangay,
        address: canViewSensitiveDetails
          ? [profile.houseNumber, profile.street, profile.barangay]
              .filter(Boolean)
              .join(', ')
          : profile.barangay,
        vulnerabilityTypes: canViewSensitiveDetails
          ? parseVulnerabilityTypes(profile.vulnerabilityTypes)
          : [],
        disabilityType: canViewSensitiveDetails
          ? profile.disabilityType
          : null,
        disabilityCause: canViewSensitiveDetails
          ? profile.disabilityCause || null
          : null,
        hasReceivedRelief,
        lastDistributionDate: hasReceivedRelief
          ? profile.reliefDistributions[0].distributionDate
          : null,
        totalMembers: canViewSensitiveDetails
          ? profile.household?.totalMembers
          : undefined,
        vulnerableMembers: canViewSensitiveDetails
          ? profile.household?.vulnerableMembers
          : undefined,
        needsAssistance: profile.needsAssistance,
      }
    })

    return NextResponse.json({ success: true, points })
  } catch (error) {
    console.error('Error fetching map data:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch map data' },
      { status: 500 },
    )
  }
}
