export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendAccountApprovedEmail } from '@/lib/email'
import { requireRequestUser } from '@/lib/request-user-session'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const requestId = String(body?.requestId || '').trim()

    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Request ID is required',
        },
        { status: 400 },
      )
    }

    const signupRequest = await db.adminSignupRequest.findUnique({
      where: { id: requestId },
    })

    if (!signupRequest) {
      return NextResponse.json(
        {
          success: false,
          message: 'Signup request not found',
        },
        { status: 404 },
      )
    }

    if (signupRequest.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          message: 'This request has already been processed',
        },
        { status: 409 },
      )
    }

    const user = await db.$transaction(async (tx) => {
      const claim = await tx.adminSignupRequest.updateMany({
        where: {
          id: requestId,
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          reviewedBy: auth.userId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      })

      if (claim.count !== 1) {
        throw new Error('SIGNUP_REQUEST_ALREADY_PROCESSED')
      }

      return tx.user.create({
        data: {
          email: signupRequest.email.trim().toLowerCase(),
          password: signupRequest.password,
          name: signupRequest.name,
          role: 'ADMIN',
          phone: '',
        },
      })
    })

    void sendAccountApprovedEmail(
      user.email,
      user.name || 'User',
    ).catch((error) =>
      console.error('Failed to send approval email:', error),
    )

    return NextResponse.json({
      success: true,
      message:
        'Admin account approved successfully. The applicant can sign in with the password they chose during signup.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'SIGNUP_REQUEST_ALREADY_PROCESSED'
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'This request has already been processed',
        },
        { status: 409 },
      )
    }

    console.error('Error approving signup request:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to approve signup request',
      },
      { status: 500 },
    )
  }
}
