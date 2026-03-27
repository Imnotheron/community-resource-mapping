export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Update user's last active timestamp
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Update the user's last active timestamp
    await db.user.update({
      where: { id: userId },
      data: { lastActive: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user activity:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update activity' },
      { status: 500 }
    )
  }
}
