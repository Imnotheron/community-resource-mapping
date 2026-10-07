export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendVulnerableRegistrationApprovedEmail } from '@/lib/email'
import { requireRequestUser } from '@/lib/request-user-session'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const { profileId } = await request.json()

    if (!profileId) {
      return NextResponse.json(
        { success: false, message: 'Profile ID is required' },
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
        registrationStatus: 'APPROVED',
        rejectionReason: null,
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
      void sendVulnerableRegistrationApprovedEmail(
        profile.user.email,
        `${profile.firstName} ${profile.lastName}`,
      ).catch((error) =>
        console.error('Failed to send approval email:', error),
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Registration approved successfully.',
      profile: {
        ...profile,
        registrationStatus: 'APPROVED',
        rejectionReason: null,
      },
    })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to approve registration' },
      { status: 500 },
    )
  }
}
