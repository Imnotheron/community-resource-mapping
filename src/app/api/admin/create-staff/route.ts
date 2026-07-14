export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import bcrypt from 'bcryptjs'
import { randomInt, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  sendWelcomeEmail,
  transporter,
} from '@/lib/email'

type StaffRole = 'ADMIN' | 'WORKER'

type AdministratorRow = {
  id: string
  name: string
  email: string
  role: string
}

type UserColumn = {
  name: string
}

type EmailAttemptResult = {
  success: boolean
  message: string
  error?: string
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

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMilliseconds: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId:
    | ReturnType<typeof setTimeout>
    | undefined

  const timeout = new Promise<never>(
    (_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(timeoutMessage),
        )
      }, timeoutMilliseconds)
    },
  )

  try {
    return await Promise.race([
      operation,
      timeout,
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

function getEmailConfigurationError() {
  const missing: string[] = []

  if (
    !process.env.BREVO_SMTP_LOGIN
  ) {
    missing.push(
      'BREVO_SMTP_LOGIN',
    )
  }

  if (!process.env.BREVO_SMTP_KEY) {
    missing.push('BREVO_SMTP_KEY')
  }

  if (
    !process.env.BREVO_FROM_EMAIL
  ) {
    missing.push(
      'BREVO_FROM_EMAIL',
    )
  }

  if (missing.length === 0) {
    return null
  }

  return `Email is not configured. Missing: ${missing.join(
    ', ',
  )}.`
}

async function verifyEmailService(): Promise<EmailAttemptResult> {
  const configurationError =
    getEmailConfigurationError()

  if (configurationError) {
    return {
      success: false,
      message: configurationError,
    }
  }

  try {
    await withTimeout(
      transporter.verify(),
      10_000,
      'The email server verification timed out.',
    )

    return {
      success: true,
      message:
        'Email service is available.',
    }
  } catch (error) {
    return {
      success: false,
      message:
        'The email service could not be verified.',
      error:
        error instanceof Error
          ? error.message
          : String(error),
    }
  }
}

async function sendWelcomeEmailWithRetry(
  email: string,
  name: string,
  role: StaffRole,
  temporaryPassword: string,
): Promise<EmailAttemptResult> {
  const maximumAttempts = 2
  let lastResult: EmailAttemptResult = {
    success: false,
    message:
      'Welcome email was not sent.',
  }

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt += 1
  ) {
    try {
      const result =
        await withTimeout(
          sendWelcomeEmail(
            email,
            name,
            role,
            temporaryPassword,
          ),
          15_000,
          'Welcome email delivery timed out.',
        )

      lastResult = {
        success: Boolean(
          result?.success,
        ),
        message:
          result?.message ||
          'Welcome email was not sent.',
        ...(!result?.success &&
        'error' in result &&
        result.error
          ? {
              error: String(
                result.error,
              ),
            }
          : {}),
      }

      if (lastResult.success) {
        return lastResult
      }
    } catch (error) {
      lastResult = {
        success: false,
        message:
          'Welcome email delivery failed.',
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }
    }

    if (attempt < maximumAttempts) {
      await delay(750)
    }
  }

  return lastResult
}

async function removeCreatedUser(
  userId: string,
) {
  try {
    const deletedCount =
      await db.$executeRaw`
        DELETE FROM "User"
        WHERE "id" = ${userId}
      `

    return deletedCount > 0
  } catch (error) {
    console.error(
      'Failed to roll back staff account:',
      error,
    )

    return false
  }
}

export async function POST(
  request: NextRequest,
) {
  let insertedUserId: string | null =
    null
  let welcomeEmailSent = false

  try {
    const body = await request.json()

    const name = cleanText(body.name)
    const email = cleanText(
      body.email,
    ).toLowerCase()
    const phone = cleanText(body.phone)
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
      await findAdministrator(adminId)

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

    if (!name || !email || !role) {
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

    const emailService =
      await verifyEmailService()

    if (!emailService.success) {
      console.error(
        'Staff creation blocked because email is unavailable:',
        emailService,
      )

      return NextResponse.json(
        {
          success: false,
          error:
            'The account was not created because the welcome-email service is unavailable.',
          emailError:
            emailService.error ||
            emailService.message,
        },
        { status: 503 },
      )
    }

    await ensureOnboardingColumns()

    const userId = randomUUID()
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
      await sendWelcomeEmailWithRetry(
        email,
        name,
        role,
        temporaryPassword,
      )

    welcomeEmailSent = Boolean(
      emailResult.success,
    )

    if (!welcomeEmailSent) {
      const accountRemoved =
        await removeCreatedUser(userId)

      insertedUserId = accountRemoved
        ? null
        : userId

      console.error(
        'Welcome email failed during staff creation:',
        {
          email,
          accountRemoved,
          message:
            emailResult.message,
          error: emailResult.error,
        },
      )

      return NextResponse.json(
        {
          success: false,
          error: accountRemoved
            ? 'The welcome email could not be sent, so the account was not created. Check the Brevo settings and try again.'
            : 'The welcome email could not be sent and automatic account cleanup failed. Remove the incomplete account from User Management before retrying.',
          emailError:
            emailResult.error ||
            emailResult.message,
          accountCreated: false,
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
        } account created. The temporary password and login instructions were sent by email.`,
        user: {
          id: userId,
          name,
          email,
          phone: phone || null,
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
          message:
            emailResult.message,
        },
        temporaryPassword: null,
        createdBy: {
          id: administrator.id,
          name: administrator.name,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (
      insertedUserId &&
      !welcomeEmailSent
    ) {
      await removeCreatedUser(
        insertedUserId,
      )
    }

    console.error(
      'Create staff account error:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'The staff account could not be created.',
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
      { status: 500 },
    )
  }
}
