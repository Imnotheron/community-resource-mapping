import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get all approved vulnerable profiles with their locations and relief status
    const profiles = await db.vulnerableProfile.findMany({
      where: {
        registrationStatus: 'APPROVED',
        latitude: { not: null },
        longitude: { not: null }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        household: {
          select: {
            id: true,
            totalMembers: true,
            vulnerableMembers: true
          }
        },
        reliefDistributions: {
          select: {
            id: true,
            distributionDate: true
          },
          orderBy: {
            distributionDate: 'desc'
          },
          take: 1
        }
      }
    })

    // Transform data for map
    const mapData = profiles.map(profile => {
      const hasReceivedRelief = profile.reliefDistributions.length > 0
      const lastDistributionDate = hasReceivedRelief
        ? profile.reliefDistributions[0].distributionDate
        : undefined

      return {
        id: profile.id,
        name: `${profile.lastName}, ${profile.firstName} ${profile.middleName} ${profile.suffix}`.trim(),
        email: profile.emailAddress,
        mobileNumber: profile.mobileNumber,
        latitude: profile.latitude!,
        longitude: profile.longitude!,
        barangay: profile.barangay,
        address: `${profile.houseNumber} ${profile.street}, ${profile.barangay}`,
        vulnerabilityTypes: JSON.parse(profile.vulnerabilityTypes),
        disabilityType: profile.disabilityType,
        disabilityCause: profile.disabilityCause || null,
        hasReceivedRelief,
        lastDistributionDate,
        totalMembers: profile.household?.totalMembers,
        vulnerableMembers: profile.household?.vulnerableMembers,
        needsAssistance: profile.needsAssistance
      }
    })

    return NextResponse.json({
      success: true,
      points: mapData
    })
  } catch (error) {
    console.error('Error fetching map data:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch map data' },
      { status: 500 }
    )
  }
}
