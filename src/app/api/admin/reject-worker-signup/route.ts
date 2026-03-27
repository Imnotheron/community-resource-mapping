export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendWorkerSignupRejectedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { requestId, reason } = await request.json()

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      )
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Get the signup request
    const signupRequest = await db.adminSignupRequest.findUnique({
      where: { id: requestId }
    })

    if (!signupRequest) {
      return NextResponse.json(
        { success: false, error: 'Signup request not found' },
        { status: 404 }
      )
    }

    if (signupRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'This request has already been processed' },
        { status: 400 }
      )
    }

    // Update the signup request status to REJECTED
    await db.adminSignupRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        reviewedAt: new Date()
      }
    })

    // Send rejection email to the worker applicant
    sendWorkerSignupRejectedEmail(
      signupRequest.email,
      signupRequest.name,
      reason.trim()
    ).catch(err => console.error('Failed to send worker rejection email:', err))

    return NextResponse.json({
      success: true,
      message: 'Worker signup request rejected successfully'
    })
  } catch (error) {
    console.error('Error rejecting worker signup:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reject signup request' },
      { status: 500 }
    )
  }
}
