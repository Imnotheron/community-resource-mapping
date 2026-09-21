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

    const profile = await db.vulnerableProfile.findUnique({
      where: { userId: auth.userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePicture: true,
          },
        },
        reliefDistributions: {
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
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { distributionDate: 'desc' },
        },
      },
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Vulnerable profile not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('Error fetching vulnerable profile:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 },
    )
  }
}
