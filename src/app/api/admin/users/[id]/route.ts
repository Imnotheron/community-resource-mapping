export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendAccountDeletedEmail } from '@/lib/email'

function getParamId(request: NextRequest, params: any) {
  const fromParams = params?.id || params?.userId

  if (fromParams) {
    return String(fromParams)
  }

  const pathnameParts = new URL(request.url)
    .pathname
    .split('/')
    .filter(Boolean)

  return pathnameParts[pathnameParts.length - 1] || ''
}

async function safeDeleteMany(
  modelName: string,
  where: Record<string, any>,
) {
  const model = (db as any)[modelName]

  if (!model?.deleteMany) return

  try {
    await model.deleteMany({ where })
  } catch (error) {
    console.warn(
      `Skipped ${modelName}.deleteMany:`,
      error,
    )
  }
}

async function safeUpdateMany(
  modelName: string,
  where: Record<string, any>,
  data: Record<string, any>,
) {
  const model = (db as any)[modelName]

  if (!model?.updateMany) return

  try {
    await model.updateMany({
      where,
      data,
    })
  } catch (error) {
    console.warn(
      `Skipped ${modelName}.updateMany:`,
      error,
    )
  }
}

async function sendDeletionEmailWithTimeout(
  email: string,
  name: string,
  role: string,
) {
  if (
    !process.env.BREVO_SMTP_LOGIN ||
    !process.env.BREVO_SMTP_KEY
  ) {
    return {
      success: false,
      message:
        'Brevo SMTP is not configured. Check BREVO_SMTP_LOGIN and BREVO_SMTP_KEY.',
    }
  }

  let timeoutId:
    | ReturnType<typeof setTimeout>
    | undefined

  const timeoutPromise = new Promise<{
    success: false
    message: string
  }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        success: false,
        message:
          'The email server did not respond within 10 seconds.',
      })
    }, 10_000)
  })

  try {
    return await Promise.race([
      sendAccountDeletedEmail(
        email,
        name,
        role,
      ),
      timeoutPromise,
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export async function GET(
  request: NextRequest,
  context: {
    params:
      | Promise<{
          id?: string
          userId?: string
        }>
      | {
          id?: string
          userId?: string
        }
  },
) {
  const params = await Promise.resolve(
    context.params,
  )
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
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error: any) {
    console.error(
      'Error fetching user:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Failed to fetch user',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: {
    params:
      | Promise<{
          id?: string
          userId?: string
        }>
      | {
          id?: string
          userId?: string
        }
  },
) {
  const params = await Promise.resolve(
    context.params,
  )
  const userId = getParamId(request, params)

  try {
    const url = new URL(request.url)
    const body = await request
      .json()
      .catch(() => ({}))

    const adminId =
      request.headers.get('x-user-id') ||
      body.adminId ||
      body.userId ||
      url.searchParams.get('adminId') ||
      url.searchParams.get('userId') ||
      ''

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User ID is required',
        },
        { status: 400 },
      )
    }

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Administrator session is required',
        },
        { status: 401 },
      )
    }

    const admin = await db.user.findUnique({
      where: {
        id: String(adminId),
      },
      select: {
        id: true,
        role: true,
      },
    })

    if (
      !admin ||
      String(admin.role).toUpperCase() !==
        'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized. Only Administrators can delete accounts.',
        },
        { status: 403 },
      )
    }

    if (String(admin.id) === userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You cannot delete the account you are currently using.',
        },
        { status: 400 },
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
        {
          success: false,
          message:
            'User not found or already deleted.',
        },
        { status: 404 },
      )
    }

    const targetRole = String(
      user.role,
    ).toUpperCase()

    if (targetRole === 'ADMIN') {
      const adminCount =
        await db.user.count({
          where: {
            role: 'ADMIN',
          },
        })

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The last remaining Administrator cannot be deleted.',
          },
          { status: 400 },
        )
      }
    }

    const profileId =
      user.vulnerableProfile?.id

    if (profileId) {
      await safeUpdateMany(
        'reliefDistribution',
        {
          vulnerableProfileId:
            profileId,
        },
        {
          vulnerableProfileId: null,
        },
      )

      await safeDeleteMany(
        'household',
        {
          vulnerableProfileId:
            profileId,
        },
      )
      await safeDeleteMany(
        'vulnerabilityDocument',
        { profileId },
      )
      await safeDeleteMany(
        'vulnerableProfile',
        { id: profileId },
      )
    }

    await safeUpdateMany(
      'household',
      { assignedWorkerId: userId },
      { assignedWorkerId: null },
    )

    await safeDeleteMany(
      'reliefFeedback',
      {
        reliefDistribution: {
          workerId: userId,
        },
      },
    )
    await safeDeleteMany(
      'reliefDistribution',
      { workerId: userId },
    )
    await safeDeleteMany(
      'reliefFeedback',
      { userId },
    )
    await safeDeleteMany(
      'notification',
      { userId },
    )
    await safeDeleteMany(
      'feedback',
      { userId },
    )
    await safeDeleteMany(
      'generalFeedback',
      { userId },
    )
    await safeDeleteMany(
      'fieldNote',
      { userId },
    )
    await safeDeleteMany(
      'vulnerableRegistrationDraft',
      { adminId: userId },
    )

    const deletedCount =
      await db.$executeRaw`
        DELETE FROM "User"
        WHERE "id" = ${userId}
      `

    if (!deletedCount) {
      return NextResponse.json(
        {
          success: false,
          message:
            'User not found or already deleted.',
        },
        { status: 404 },
      )
    }

    let emailDelivery = {
      attempted: false,
      sent: false,
      message:
        'No email address was available.',
    }

    if (user.email) {
      emailDelivery = {
        attempted: true,
        sent: false,
        message:
          'Deletion email was not confirmed.',
      }

      const result =
        await sendDeletionEmailWithTimeout(
          user.email,
          user.name || 'User',
          user.role,
        )

      emailDelivery = {
        attempted: true,
        sent: Boolean(result.success),
        message: result.success
          ? `Deletion notice sent to ${user.email}.`
          : result.message ||
            'The account was deleted, but the email could not be sent.',
      }

      if (!result.success) {
        console.error(
          'Deletion email delivery failed:',
          {
            email: user.email,
            reason: result.message,
            error:
              'error' in result
                ? result.error
                : undefined,
          },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: emailDelivery.sent
        ? 'User account deleted and the email notification was sent.'
        : 'User account deleted, but the email notification was not sent.',
      deletedUserId: userId,
      deletedRole: targetRole,
      emailDelivery,
    })
  } catch (error: any) {
    console.error(
      'Error deleting user:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message: `Failed to delete user account: ${
          error?.message ||
          'Unknown error'
        }`,
        code: error?.code,
      },
      { status: 500 },
    )
  }
}
