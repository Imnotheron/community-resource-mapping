export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVulnerableRegistrationApprovedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json()

    if (!profileId) {
      return NextResponse.json(
        { success: false, message: 'Profile ID is required' },
        { status: 400 }
      )
    }

    // Get the profile with user information before updating
    const profile = await db.vulnerableProfile.findUnique({
      where: { id: profileId },
      include: {
        user: true
      }
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      )
    }

    // Update the profile status
    const updatedProfile = await db.vulnerableProfile.update({
      where: { id: profileId },
      data: {
        registrationStatus: 'APPROVED',
        rejectionReason: null
      }
    })

    // Send email notification (without password for security)
    if (profile.user.email) {
      sendVulnerableRegistrationApprovedEmail(
        profile.user.email,
        `${profile.firstName} ${profile.lastName}`
      ).catch(err => console.error('Failed to send email:', err))
    }

    return NextResponse.json({
      success: true,
      message: 'Registration approved successfully. Login credentials have been sent to the user.',
      profile: updatedProfile
    })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to approve registration' },
      { status: 500 }
    )
  }
}
