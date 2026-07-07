export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendAccountDeletedEmail } from '@/lib/email'

function getParamId(request: NextRequest, params: any) {
  const fromParams = params?.id || params?.userId

  if (fromParams) {
    return String(fromParams)
  }

  const pathnameParts = new URL(request.url).pathname.split('/').filter(Boolean)
  return pathnameParts[pathnameParts.length - 1] || ''
}

async function safeDeleteMany(modelName: string, where: Record<string, any>) {
  const model = (db as any)[modelName]

  if (!model?.deleteMany) {
    return
  }

  try {
    await model.deleteMany({ where })
  } catch (error) {
    console.warn(`Skipped ${modelName}.deleteMany:`, error)
  }
}

async function safeUpdateMany(
  modelName: string,
  where: Record<string, any>,
  data: Record<string, any>
) {
  const model = (db as any)[modelName]

  if (!model?.updateMany) {
    return
  }

  try {
    await model.updateMany({ where, data })
  } catch (error) {
    console.warn(`Skipped ${modelName}.updateMany:`, error)
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id?: string; userId?: string }> | { id?: string; userId?: string } }
) {
  const params = await Promise.resolve(context.params)
  const userId = getParamId(request, params)

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        profilePicture: true,
        createdAt: true,
        vulnerableProfile: {
          select: {
            id: true,
            registrationStatus: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id?: string; userId?: string }> | { id?: string; userId?: string } }
) {
  const params = await Promise.resolve(context.params)
  const userId = getParamId(request, params)

  try {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))

    const adminId =
      body.adminId ||
      body.userId ||
      url.searchParams.get('adminId') ||
      url.searchParams.get('userId') ||
      ''

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!adminId) {
      return NextResponse.json(
        { success: false, message: 'Admin ID is required' },
        { status: 400 }
      )
    }

    const admin = await db.user.findUnique({
      where: { id: String(adminId) },
      select: {
        id: true,
        role: true,
      },
    })

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized. Only admins can delete user accounts.',
        },
        { status: 403 }
      )
    }

    if (String(adminId) === userId) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own account.' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        vulnerableProfile: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found or already deleted.' },
        { status: 404 }
      )
    }

    const profileId = user.vulnerableProfile?.id

    if (profileId) {
      await safeUpdateMany('reliefDistribution', { vulnerableProfileId: profileId }, { vulnerableProfileId: null })
      await safeDeleteMany('household', { vulnerableProfileId: profileId })
      await safeDeleteMany('vulnerabilityDocument', { profileId })
      await safeDeleteMany('vulnerableProfile', { id: profileId })
    }

    await safeUpdateMany('household', { assignedWorkerId: userId }, { assignedWorkerId: null })

    await safeDeleteMany('reliefFeedback', { reliefDistribution: { workerId: userId } })
    await safeDeleteMany('reliefDistribution', { workerId: userId })

    await safeDeleteMany('reliefFeedback', { userId })
    await safeDeleteMany('notification', { userId })
    await safeDeleteMany('feedback', { userId })
    await safeDeleteMany('generalFeedback', { userId })
    await safeDeleteMany('fieldNote', { userId })
    await safeDeleteMany('vulnerableRegistrationDraft', { adminId: userId })

    // Important: use raw SQL for the final User delete.
    // Prisma user.delete() can crash on your local SQLite DB while the account-setup
    // columns are still missing, because Prisma tries to read those columns back.
    const deletedCount = await db.$executeRaw`
      DELETE FROM "User"
      WHERE "id" = ${userId}
    `

    if (!deletedCount) {
      return NextResponse.json(
        { success: false, message: 'User not found or already deleted.' },
        { status: 404 }
      )
    }

    if (user.email) {
      sendAccountDeletedEmail(user.email, user.name || 'User', user.role).catch((error) => {
        console.error('Failed to send deletion email:', error)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'User account deleted successfully',
      deletedUserId: userId,
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)

    return NextResponse.json(
      {
        success: false,
        message: `Failed to delete user account: ${error?.message || 'Unknown error'}`,
        code: error?.code,
      },
      { status: 500 }
    )
  }
}
