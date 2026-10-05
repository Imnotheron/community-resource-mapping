export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const body = await request.json().catch(() => ({}))

    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
      requestedUserId: String(body.workerId || '').trim() || undefined,
    })
    if ('error' in auth) return auth.error

    const { draftId } = await params

    const deleteCount = await db.$executeRawUnsafe(
      `DELETE FROM "VulnerableRegistrationDraft"
       WHERE "id" = ? AND "adminId" = ?`,
      draftId,
      auth.userId,
    )

    if (!deleteCount) {
      return NextResponse.json(
        { success: false, message: 'Draft not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted',
    })
  } catch (error: any) {
    console.error('Error deleting worker vulnerable registration draft:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete vulnerable registration draft',
        error: error?.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
