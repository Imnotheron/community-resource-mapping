export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

export async function GET(request: NextRequest) {
  try {
    const requestedWorkerId = request.nextUrl.searchParams.get('workerId')
    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
      requestedUserId: requestedWorkerId,
    })
    if ('error' in auth) return auth.error

    const distributions = await db.reliefDistribution.findMany({
      where: { workerId: auth.userId },
      select: {
        id: true,
        distributionType: true,
        itemsProvided: true,
        quantity: true,
        distributionDate: true,
        notes: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        vulnerableProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            barangay: true,
          },
        },
      },
      orderBy: { distributionDate: 'desc' },
    })

    return NextResponse.json({ success: true, distributions })
  } catch (error) {
    console.error('Error fetching worker distributions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch distributions' },
      { status: 500 },
    )
  }
}
