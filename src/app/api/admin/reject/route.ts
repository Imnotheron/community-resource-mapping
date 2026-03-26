import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVulnerableRegistrationRejectedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { profileId, reason } = await request.json()

    if (!profileId || !reason) {
      return NextResponse.json(
        { success: false, message: 'Profile ID and reason are required' },
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
        registrationStatus: 'REJECTED',
        rejectionReason: reason
      }
    })

    // Send email notification with rejection reason
    if (profile.user.email) {
      sendVulnerableRegistrationRejectedEmail(
        profile.user.email,
        `${profile.firstName} ${profile.lastName}`,
        reason
      ).catch(err => console.error('Failed to send email:', err))
    }

    return NextResponse.json({
      success: true,
      message: 'Registration rejected. A notification has been sent to the user.',
      profile: updatedProfile
    })
  } catch (error) {
    console.error('Rejection error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to reject registration' },
      { status: 500 }
    )
  }
}
