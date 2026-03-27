export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get vulnerable profile for the user
    const vulnerableProfile = await db.vulnerableProfile.findUnique({
      where: { userId }
    })

    if (!vulnerableProfile) {
      return NextResponse.json(
        { error: 'Vulnerable profile not found' },
        { status: 404 }
      )
    }

    // Get relief distributions for the user
    const distributions = await db.reliefDistribution.findMany({
      where: {
        vulnerableProfileId: vulnerableProfile.id
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        feedback: {
          where: { userId },
          take: 1
        }
      },
      orderBy: {
        distributionDate: 'desc'
      }
    })

    return NextResponse.json({ distributions })
  } catch (error) {
    console.error('Error fetching relief history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch relief history' },
      { status: 500 }
    )
  }
}
