export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

// POST - Update only the signed-in user's last active timestamp.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const requestedUserId = String(body?.userId || '').trim()

    const auth = await requireRequestUser(request, {
      requestedUserId,
    })
    if ('error' in auth) return auth.error

    await db.user.update({
      where: { id: auth.userId },
      data: { lastActive: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user activity:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update activity' },
      { status: 500 },
    )
  }
}
