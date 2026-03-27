export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { requestId, adminId } = await request.json()

    if (!requestId || !adminId) {
      return NextResponse.json(
        { success: false, message: 'Request ID and Admin ID are required' },
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

    // Create the admin user
    const user = await db.user.create({
      data: {
        email: signupRequest.email,
        password: signupRequest.password,
        name: signupRequest.name,
        role: 'ADMIN',
        phone: ''
      }
    })

    // Update the signup request
    await db.adminSignupRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    })
    // Send approval email
    const { sendAccountApprovedEmail } = await import('@/lib/email')
    sendAccountApprovedEmail(user.email || 'noreply@sanpolicarpo.gov.ph', user.name || 'User', signupRequest.password)
      .catch(err => console.error('Failed to send approval email:', err))
    return NextResponse.json({
      success: true,
      message: 'Admin account approved successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error approving worker signup:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to approve signup request' },
      { status: 500 }
    )
  }
}
