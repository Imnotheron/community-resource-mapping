export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['VULNERABLE'],
      requestedUserId: request.nextUrl.searchParams.get('userId'),
    })
    if ('error' in auth) return auth.error

    const vulnerableProfile = await db.vulnerableProfile.findUnique({
      where: { userId: auth.userId },
      select: { id: true },
    })

    if (!vulnerableProfile) {
      return NextResponse.json(
        { success: false, error: 'Vulnerable profile not found' },
        { status: 404 },
      )
    }

    const distributions = await db.reliefDistribution.findMany({
      where: { vulnerableProfileId: vulnerableProfile.id },
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
        worker: {
          select: { id: true, name: true },
        },
        feedback: {
          where: { userId: auth.userId },
          select: {
            id: true,
            feedbackType: true,
            message: true,
            status: true,
            adminResponse: true,
            adminResponseDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { distributionDate: 'desc' },
    })

    return NextResponse.json({ success: true, distributions })
  } catch (error) {
    console.error('Error fetching relief history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch relief history' },
      { status: 500 },
    )
  }
}
