export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const distributions = await db.reliefDistribution.findMany({
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vulnerableProfile: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        household: true
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
