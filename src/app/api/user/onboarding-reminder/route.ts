export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const action = body?.action || 'dismiss'

    if (action !== 'dismiss' && action !== 'reset') {
      return NextResponse.json(
        { success: false, message: 'Invalid onboarding reminder action' },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        onboardingReminderDismissedAt: action === 'dismiss' ? new Date() : null,
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
  } catch (error: any) {
    console.error('Failed to update onboarding reminder:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update onboarding reminder',
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
