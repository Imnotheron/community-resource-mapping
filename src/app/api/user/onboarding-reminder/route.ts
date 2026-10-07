export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

export async function PUT(request: NextRequest) {
  try {
    const requestedUserId = String(
      request.headers.get('x-user-id') || '',
    ).trim()

    const auth = await requireRequestUser(request, {
      requestedUserId,
    })
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const action = body?.action || 'dismiss'

    if (action !== 'dismiss' && action !== 'reset') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid onboarding reminder action',
        },
        { status: 400 },
      )
    }

    const updatedUser = await db.user.update({
      where: { id: auth.userId },
      data: {
        onboardingReminderDismissedAt:
          action === 'dismiss' ? new Date() : null,
      },
      select: {
        id: true,
        onboardingReminderDismissedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Failed to update onboarding reminder:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update onboarding reminder',
      },
      { status: 500 },
    )
  }
}
