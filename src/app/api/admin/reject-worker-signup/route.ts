export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendWorkerSignupRejectedEmail } from '@/lib/email'
import { requireRequestUser } from '@/lib/request-user-session'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const requestId = String(body?.requestId || '').trim()
    const reason = String(body?.reason || '').trim()

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 },
      )
    }

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rejection reason is required',
        },
        { status: 400 },
      )
    }

    const signupRequest = await db.adminSignupRequest.findUnique({
      where: { id: requestId },
    })

    if (!signupRequest) {
      return NextResponse.json(
        { success: false, error: 'Signup request not found' },
        { status: 404 },
      )
    }

    const result = await db.adminSignupRequest.updateMany({
      where: {
        id: requestId,
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedBy: auth.userId,
        reviewedAt: new Date(),
      },
    })

    if (result.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'This request has already been processed',
        },
        { status: 409 },
      )
    }

    void sendWorkerSignupRejectedEmail(
      signupRequest.email,
      signupRequest.name,
      reason,
    ).catch((error) =>
      console.error('Failed to send signup rejection email:', error),
    )

    return NextResponse.json({
      success: true,
      message: 'Signup request rejected successfully',
    })
  } catch (error) {
    console.error('Error rejecting signup request:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reject signup request',
      },
      { status: 500 },
    )
  }
}
