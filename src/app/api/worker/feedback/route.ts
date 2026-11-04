export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

function positiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, max) : fallback
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, { allowedRoles: ['WORKER'] })
    if ('error' in auth) return auth.error

    const page = positiveInteger(request.nextUrl.searchParams.get('page'), 1, 100_000)
    const limit = positiveInteger(request.nextUrl.searchParams.get('limit'), 10, 100)
    const status = String(request.nextUrl.searchParams.get('status') || 'ALL').toUpperCase()
    if (status !== 'ALL' && !['SUBMITTED', 'REVIEWED', 'RESOLVED', 'DISMISSED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid feedback status' }, { status: 400 })
    }

    // Enforce ownership on the database query, never trust a workerId from the URL.
    const where = {
      reliefDistribution: { is: { workerId: auth.userId } },
      ...(status === 'ALL' ? {} : { status }),
    }

    const [total, feedback] = await Promise.all([
      db.reliefFeedback.count({ where }),
      db.reliefFeedback.findMany({
        where,
        select: {
          id: true,
          feedbackType: true,
          message: true,
          status: true,
          adminResponse: true,
          adminResponseDate: true,
          createdAt: true,
          user: { select: { id: true, name: true, role: true, profilePicture: true } },
          reliefDistribution: {
            select: {
              id: true,
              distributionType: true,
              itemsProvided: true,
              quantity: true,
              distributionDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json(
      {
        success: true,
        feedback,
        pagination: { total, totalPages: Math.ceil(total / limit), currentPage: page, limit },
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Error fetching worker relief feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch relief feedback' },
      { status: 500 },
    )
  }
}
