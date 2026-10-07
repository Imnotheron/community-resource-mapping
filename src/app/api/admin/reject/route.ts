export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendVulnerableRegistrationRejectedEmail } from '@/lib/email'
import { requireRequestUser } from '@/lib/request-user-session'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const { profileId, reason } = await request.json()
    const cleanReason = String(reason || '').trim()

    if (!profileId || !cleanReason) {
      return NextResponse.json(
        {
          success: false,
          message: 'Profile ID and rejection reason are required',
        },
        { status: 400 },
      )
    }

    const profile = await db.vulnerableProfile.findUnique({
      where: { id: profileId },
      include: {
        user: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Profile not found' },
        { status: 404 },
      )
    }

    if (profile.registrationStatus !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          message: 'This registration has already been processed',
        },
        { status: 409 },
      )
    }

    const result = await db.vulnerableProfile.updateMany({
      where: {
        id: profileId,
        registrationStatus: 'PENDING',
      },
      data: {
        registrationStatus: 'REJECTED',
        rejectionReason: cleanReason,
      },
    })

    if (result.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This registration was processed by another Administrator. Refresh and try again.',
        },
        { status: 409 },
      )
    }

    if (profile.user.email) {
      void sendVulnerableRegistrationRejectedEmail(
        profile.user.email,
        `${profile.firstName} ${profile.lastName}`,
        cleanReason,
      ).catch((error) =>
        console.error('Failed to send rejection email:', error),
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Registration rejected successfully.',
      profile: {
        ...profile,
        registrationStatus: 'REJECTED',
        rejectionReason: cleanReason,
      },
    })
  } catch (error) {
    console.error('Rejection error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to reject registration' },
      { status: 500 },
    )
  }
}
