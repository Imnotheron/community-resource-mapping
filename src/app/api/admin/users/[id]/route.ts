import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendAccountDeletedEmail } from '@/lib/email'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await db.user.findUnique({
      where: { id },
      include: { vulnerableProfile: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const adminId = body.adminId

    if (!adminId) {
      return NextResponse.json(
        { success: false, message: 'Admin ID is required' },
        { status: 400 }
      )
    }

    // Verify admin
    const admin = await db.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Only admins can delete user accounts.' },
        { status: 403 }
      )
    }

    if (adminId === userId) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own account.' },
        { status: 400 }
      )
    }

    // Fetch user with profile before deletion (needed for email + cascade)
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { vulnerableProfile: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Send deletion notification email BEFORE deleting
    if (user.email) {
      sendAccountDeletedEmail(user.email, user.name || 'User', user.role)
        .catch(err => console.error('Failed to send deletion email:', err))
    }

    // ── Step 1: Handle VulnerableProfile cascade (VULNERABLE users) ─────────
    if (user.vulnerableProfile) {
      const profileId = user.vulnerableProfile.id

      // Nullify profile reference on relief distributions (keep history)
      await db.reliefDistribution.updateMany({
        where: { vulnerableProfileId: profileId },
        data: { vulnerableProfileId: null }
      })

      // Delete the household linked to this profile
      await db.household.deleteMany({ where: { vulnerableProfileId: profileId } })

      // Delete documents
      await db.vulnerabilityDocument.deleteMany({ where: { profileId } })

      // Delete the profile
      await db.vulnerableProfile.delete({ where: { id: profileId } })
    }

    // ── Step 2: Handle records where this user is a WORKER ──────────────────
    // Nullify household worker assignment (keep the household)
    await db.household.updateMany({
      where: { assignedWorkerId: userId },
      data: { assignedWorkerId: null }
    })

    // Delete relief feedback on distributions this worker created, then distributions
    await db.reliefFeedback.deleteMany({
      where: { reliefDistribution: { workerId: userId } }
    })
    await db.reliefDistribution.deleteMany({ where: { workerId: userId } })

    // ── Step 3: Delete all other user-owned records ──────────────────────────
    await db.reliefFeedback.deleteMany({ where: { userId } })
    await db.notification.deleteMany({ where: { userId } })
    await db.feedback.deleteMany({ where: { userId } })
    await db.fieldNote.deleteMany({ where: { userId } })

    // ── Step 4: Delete the User ──────────────────────────────────────────────
    await db.user.delete({ where: { id: userId } })

    return NextResponse.json({
      success: true,
      message: 'User account deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      {
        success: false,
        message: error?.code === 'P2025'
          ? 'User not found or already deleted.'
          : `Failed to delete user account: ${error.message}`,
        code: error?.code
      },
      { status: 500 }
    )
  }
}
