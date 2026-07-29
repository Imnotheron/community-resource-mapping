export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import bcrypt from 'bcryptjs'
import {
  randomInt,
  randomUUID,
} from 'crypto'
import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { db } from '@/lib/db'
import {
  getStaffEmailConfiguration,
  sendStaffWelcomeEmail,
} from '@/lib/staff-welcome-email'

type StaffRole =
  | 'ADMIN'
  | 'WORKER'

type AdministratorRow = {
  id: string
  name: string
  email: string
  role: string
}

type UserColumn = {
  name: string
}

function normalizeRole(
  value: unknown,
): StaffRole | null {
  const role = String(value || '')
    .trim()
    .toUpperCase()

  return role === 'ADMIN' ||
    role === 'WORKER'
    ? role
    : null
}

function cleanText(value: unknown) {
  return String(value || '').trim()
}

function randomCharacter(
  characters: string,
) {
  return characters[
    randomInt(0, characters.length)
  ]
}

function generateTemporaryPassword() {
  const upper =
    'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower =
    'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%&*'
  const all =
    upper + lower + numbers + symbols

  const characters = [
    randomCharacter(upper),
    randomCharacter(upper),
    randomCharacter(lower),
    randomCharacter(lower),
    randomCharacter(numbers),
    randomCharacter(numbers),
    randomCharacter(symbols),
  ]

  while (characters.length < 14) {
    characters.push(
      randomCharacter(all),
    )
  }

  for (
    let index =
      characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex = randomInt(
      0,
      index + 1,
    )

    ;[
      characters[index],
      characters[swapIndex],
    ] = [
      characters[swapIndex],
      characters[index],
    ]
  }

  return characters.join('')
}

async function getUserColumns() {
  const columns =
    await db.$queryRaw<UserColumn[]>`
      PRAGMA table_info("User")
    `

  return new Set(
    columns.map(
      (column) => column.name,
    ),
  )
}

async function ensureOnboardingColumns() {
  let columns = await getUserColumns()

  if (
    !columns.has(
      'temporaryPasswordIssued',
    )
  ) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "temporaryPasswordIssued"
      BOOLEAN NOT NULL DEFAULT false
    `)
  }

  columns = await getUserColumns()

  if (
    !columns.has('passwordChangedAt')
  ) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "passwordChangedAt"
      DATETIME
    `)
  }

  columns = await getUserColumns()

  if (
    !columns.has(
      'onboardingReminderDismissedAt',
    )
  ) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "onboardingReminderDismissedAt"
      DATETIME
    `)
  }
}

async function findAdministrator(
  adminId: string,
) {
  const rows =
    await db.$queryRaw<
      AdministratorRow[]
    >`
      SELECT
        "id",
        "name",
        "email",
        "role"
      FROM "User"
      WHERE "id" = ${adminId}
      LIMIT 1
    `

  return rows[0] || null
}

async function removeCreatedUser(
  userId: string,
) {
  try {
    const deleted =
      await db.$executeRaw`
        DELETE FROM "User"
        WHERE "id" = ${userId}
      `

    return deleted > 0
  } catch (error) {
    console.error(
      'Staff account rollback failed:',
      error,
    )

    return false
  }
}

function safeDeliveryFailure(
  message: string,
  code?: string,
) {
  const lower =
    message.toLowerCase()

  if (
    code ===
      'EMAIL_PROVIDER_NOT_CONFIGURED' ||
    code?.startsWith('MISSING_') ||
    lower.includes(
      'not fully configured',
    )
  ) {
    return (
      'Production email is not configured in Vercel. ' +
      'Add BREVO_API_KEY and BREVO_FROM_EMAIL, then redeploy.'
    )
  }

  if (
    code === 'HTTP_401' ||
    code === 'unauthorized' ||
    lower.includes('key not found') ||
    lower.includes('unauthorized')
  ) {
    return (
      'Brevo rejected the credentials. Replace BREVO_API_KEY ' +
      'in Vercel with a valid Brevo v3 API key and redeploy.'
    )
  }

  if (
    code === 'HTTP_400' ||
    lower.includes('sender') ||
    lower.includes('not valid')
  ) {
    return (
      'Brevo rejected the sender or message. Confirm that ' +
      'BREVO_FROM_EMAIL is a verified Brevo sender.'
    )
  }

  if (
    code === 'HTTP_429'
  ) {
    return (
      'Brevo temporarily rate-limited email delivery. Wait briefly and retry.'
    )
  }

  if (
    code?.includes('TIMEOUT') ||
    lower.includes('timed out')
  ) {
    return (
      'Brevo did not respond before the delivery timeout. Retry the request.'
    )
  }

  return (
    'Brevo could not accept the welcome email. Check the latest Vercel function log for the delivery error.'
  )
}

export async function POST(
  request: NextRequest,
) {
  let insertedUserId:
    | string
    | null = null

  try {
    const body =
      await request.json()

    const name = cleanText(
      body.name,
    )
    const email = cleanText(
      body.email,
    ).toLowerCase()
    const phone = cleanText(
      body.phone,
    )
    const role = normalizeRole(
      body.role,
    )

    const adminId =
      request.headers.get(
        'x-user-id',
      ) ||
      cleanText(body.adminId) ||
      request.nextUrl.searchParams.get(
        'userId',
      ) ||
      ''

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Administrator session is required. Sign in again and retry.',
        },
        { status: 401 },
      )
    }

    const administrator =
      await findAdministrator(
        adminId,
      )

    if (
      !administrator ||
      String(
        administrator.role,
      ).toUpperCase() !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only an Administrator can create staff accounts.',
        },
        { status: 403 },
      )
    }

    if (
      !name ||
      !email ||
      !role
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Name, email, and account role are required.',
        },
        { status: 400 },
      )
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (
      !emailPattern.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Enter a valid email address.',
        },
        { status: 400 },
      )
    }

    if (name.length > 120) {
      return NextResponse.json(
        {
          success: false,
          error:
            'The name is too long.',
        },
        { status: 400 },
      )
    }

    if (phone.length > 40) {
      return NextResponse.json(
        {
          success: false,
          error:
            'The phone number is too long.',
        },
        { status: 400 },
      )
    }

    const existingRows =
      await db.$queryRaw<
        Array<{ id: string }>
      >`
        SELECT "id"
        FROM "User"
        WHERE lower("email") =
          lower(${email})
        LIMIT 1
      `

    if (
      existingRows.length > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A user with this email already exists.',
        },
        { status: 409 },
      )
    }

    const emailConfiguration =
      getStaffEmailConfiguration()

    if (
      !emailConfiguration.configured
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Production email is missing the Brevo SMTP variables. Add BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_FROM_EMAIL to Vercel Production, then redeploy.',
          emailCode:
            'EMAIL_PROVIDER_NOT_CONFIGURED',
        },
        { status: 503 },
      )
    }

    await ensureOnboardingColumns()

    const userId =
      randomUUID()
    const temporaryPassword =
      generateTemporaryPassword()
    const passwordHash =
      await bcrypt.hash(
        temporaryPassword,
        12,
      )
    const now = new Date()

    await db.$executeRaw`
      INSERT INTO "User" (
        "id",
        "email",
        "password",
        "name",
        "role",
        "phone",
        "temporaryPasswordIssued",
        "passwordChangedAt",
        "onboardingReminderDismissedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${userId},
        ${email},
        ${passwordHash},
        ${name},
        ${role},
        ${phone || null},
        true,
        NULL,
        NULL,
        ${now},
        ${now}
      )
    `

    insertedUserId = userId

    const emailResult =
      await sendStaffWelcomeEmail({
        email,
        name,
        role,
        temporaryPassword,
      })

    if (!emailResult.success) {
      const accountRemoved =
        await removeCreatedUser(
          userId,
        )

      if (accountRemoved) {
        insertedUserId = null
      }

      console.error(
        'Staff welcome email failed:',
        {
          recipient: email,
          provider:
            emailResult.provider,
          code:
            emailResult.errorCode,
          deliveryMessage:
            emailResult.message,
          accountRemoved,
        },
      )

      return NextResponse.json(
        {
          success: false,
          error: accountRemoved
            ? `The account was not created. ${safeDeliveryFailure(
                emailResult.message,
                emailResult.errorCode,
              )}`
            : 'The welcome email failed and the incomplete account could not be removed automatically. Delete it from User Management before retrying.',
          emailCode:
            emailResult.errorCode,
          emailProvider:
            emailResult.provider,
          accountRemoved,
        },
        {
          status: accountRemoved
            ? 502
            : 500,
        },
      )
    }

    insertedUserId = null

    return NextResponse.json(
      {
        success: true,
        message: `${
          role === 'ADMIN'
            ? 'Administrator'
            : 'Worker'
        } account created. Brevo accepted the welcome email and temporary password.`,
        user: {
          id: userId,
          name,
          email,
          phone:
            phone || null,
          role,
          profilePicture: null,
          temporaryPasswordIssued:
            true,
          passwordChangedAt: null,
          onboardingReminderDismissedAt:
            null,
          createdAt: now,
        },
        notification: {
          emailSent: true,
          provider:
            emailResult.provider,
          messageId:
            emailResult.messageId,
          message:
            emailResult.message,
        },
        temporaryPassword: null,
        createdBy: {
          id: administrator.id,
          name:
            administrator.name,
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    if (insertedUserId) {
      await removeCreatedUser(
        insertedUserId,
      )
    }

    const duplicateEmail =
      error?.code === 'P2002' ||
      String(
        error?.message || '',
      )
        .toLowerCase()
        .includes('unique constraint')

    console.error(
      'Create staff account error:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: duplicateEmail
          ? 'A user with this email already exists.'
          : 'The staff account could not be created.',
        ...(process.env.NODE_ENV !==
        'production'
          ? {
              details:
                error instanceof Error
                  ? error.message
                  : String(error),
            }
          : {}),
      },
      {
        status: duplicateEmail
          ? 409
          : 500,
      },
    )
  }
}
