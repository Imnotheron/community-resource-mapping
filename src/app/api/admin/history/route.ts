export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const [distributions, announcements] = await Promise.all([
      db.reliefDistribution.findMany({
        select: {
          id: true,
          distributionDate: true,
          distributionType: true,
          itemsProvided: true,
          quantity: true,
          notes: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
          worker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          vulnerableProfile: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              suffix: true,
              barangay: true,
              municipality: true,
              province: true,
            },
          },
          household: {
            select: {
              id: true,
              headOfHousehold: true,
              barangay: true,
              address: true,
            },
          },
        },
        orderBy: {
          distributionDate: 'desc',
        },
      }),
      db.announcement.findMany({
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          targetRole: true,
          eventDate: true,
          eventTime: true,
          location: true,
          isActive: true,
          priority: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { eventDate: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
    ])

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      distributions,
      events: announcements,
    })
  } catch (error) {
    console.error('Failed to load admin operations history:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load operations history',
      },
      { status: 500 },
    )
  }
}
