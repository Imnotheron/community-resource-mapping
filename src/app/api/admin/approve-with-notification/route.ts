export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createNotification } from '@/lib/notification-service'

// POST - Approve or reject user account with notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profileId, action, reason, needsDocuments } = body
    // action: 'APPROVE' | 'REJECT' | 'REQUEST_DOCUMENTS'

    if (!profileId || !action) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the vulnerable profile
    const profile = await db.vulnerableProfile.findUnique({
      where: { id: profileId },
      include: {
        user: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      )
    }

    // Update profile status
    let newStatus: string
    let notificationType: any

    if (action === 'APPROVE') {
      newStatus = 'APPROVED'
      notificationType = 'ACCOUNT_APPROVED'
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED'
      notificationType = 'ACCOUNT_REJECTED'
    } else if (action === 'REQUEST_DOCUMENTS') {
      newStatus = 'PENDING' // Keep pending until documents are provided
      notificationType = 'DOCUMENTS_NEEDED'
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      )
    }

    const updatedProfile = await db.vulnerableProfile.update({
      where: { id: profileId },
      data: {
        registrationStatus: newStatus as any,
        rejectionReason: reason || null,
      },
    })

    // Send notification to user
    if (profile.user?.id) {
      await createNotification({
        userId: profile.user.id,
        type: notificationType,
        reason: reason || undefined,
        details: needsDocuments || undefined,
      })
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
