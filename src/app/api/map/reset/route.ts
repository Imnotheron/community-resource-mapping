export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { requireRequestUser } from '@/lib/request-user-session'
import { startNewMapReliefCycle } from '@/lib/map-relief-cycle'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const cycle = await startNewMapReliefCycle(auth.userId)

    return NextResponse.json(
      {
        success: true,
        message:
          'A new relief cycle has started. All active vulnerable markers are pending distribution again.',
        cycleStartedAt: cycle.resetAt,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error('Error resetting vulnerable map relief cycle:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start a new relief cycle',
      },
      { status: 500 },
    )
  }
}
