export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const profiles = await db.vulnerableProfile.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePicture: true,
            createdAt: true,
          },
        },
        household: true,
        documents: true,
        reliefDistributions: {
          orderBy: {
            distributionDate: 'desc',
          },
          take: 1,
        },
      },
    })

    const formattedProfiles = profiles.map((profile) => {
      const latestDistribution = profile.reliefDistributions?.[0] || null

      return {
        ...profile,

        userName: profile.user?.name || '',
        userEmail: profile.user?.email || profile.emailAddress || '',
        userPhone: profile.user?.phone || profile.mobileNumber || '',
        profilePicture: profile.user?.profilePicture || null,

        householdId: profile.household?.id || null,
        totalMembers: profile.household?.totalMembers || 1,
        vulnerableMembers: profile.household?.vulnerableMembers || 1,

        lastDistributionDate: latestDistribution?.distributionDate || null,
        lastDistributionType: latestDistribution?.distributionType || null,
        lastItemsReceived: latestDistribution?.itemsProvided || null,
        hasReceivedRelief: !!latestDistribution,

        user: undefined,
        household: profile.household || null,
        documents: profile.documents || [],
      }
    })

    return NextResponse.json({
      success: true,
      profiles: formattedProfiles,
    })
  } catch (error: any) {
    console.error('Failed to load admin profiles:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load profiles',
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}