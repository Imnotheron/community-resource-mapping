import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { requestId, rejectionReason, adminId } = await request.json()

    if (!requestId || !rejectionReason || !adminId) {
      return NextResponse.json(
        { success: false, message: 'Request ID, rejection reason, and Admin ID are required' },
        { status: 400 }
      )
    }

    // Get the signup request
    const signupRequest = await db.adminSignupRequest.findUnique({
      where: { id: requestId }
    })

    if (!signupRequest) {
      return NextResponse.json(
        { success: false, message: 'Signup request not found' },
        { status: 404 }
      )
    }

    if (signupRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'This request has already been processed' },
        { status: 400 }
      )
    }

    // Update the signup request
    await db.adminSignupRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Admin signup request rejected'
    })
  } catch (error) {
    console.error('Error rejecting worker signup:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to reject signup request' },
      { status: 500 }
    )
  }
}
