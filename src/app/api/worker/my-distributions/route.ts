export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get worker ID from query params or authorization
    const searchParams = request.nextUrl.searchParams
    const workerId = searchParams.get('workerId')

    if (!workerId) {
      return NextResponse.json(
        { success: false, error: 'Worker ID is required' },
        { status: 400 }
      )
    }

    const distributions = await db.reliefDistribution.findMany({
      where: {
        workerId
      },
      include: {
        vulnerableProfile: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        distributionDate: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      distributions
    })
  } catch (error) {
    console.error('Error fetching distributions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch distributions' },
      { status: 500 }
    )
  }
}
