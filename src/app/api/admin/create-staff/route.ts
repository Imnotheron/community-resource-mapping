export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import bcrypt from 'bcryptjs'
import { randomInt, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'

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

function normalizeRole(value: unknown): StaffRole | null {
  const role = String(value || '').trim().toUpperCase()

  return role === 'ADMIN' || role === 'WORKER'
    ? role
    : null
}

function cleanText(value: unknown) {
  return String(value || '').trim()
}

function randomCharacter(characters: string) {
  return characters[randomInt(0, characters.length)]
}

function generateTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%&*'
  const all = upper + lower + numbers + symbols

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
    characters.push(randomCharacter(all))
  }

  for (
    let index = characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex = randomInt(0, index + 1)

    ;[characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ]
  }

  return characters.join('')
}

async function getUserColumns() {
  const columns = await db.$queryRaw<UserColumn[]>`
    PRAGMA table_info("User")
  `

  return new Set(columns.map((column) => column.name))
}

async function ensureOnboardingColumns() {
  let columns = await getUserColumns()

  if (!columns.has('temporaryPasswordIssued')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "temporaryPasswordIssued"
      BOOLEAN NOT NULL DEFAULT false
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('passwordChangedAt')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "passwordChangedAt" DATETIME
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('onboardingReminderDismissedAt')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "onboardingReminderDismissedAt" DATETIME
    `)
  }
}

async function findAdministrator(adminId: string) {
  const rows = await db.$queryRaw<AdministratorRow[]>`
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

async function sendWelcomeEmailWithTimeout(
  email: string,
  name: string,
  role: StaffRole,
  temporaryPassword: string,
) {
  if (
    !process.env.BREVO_SMTP_LOGIN ||
    !process.env.BREVO_SMTP_KEY
  ) {
    return {
      success: false,
      message: 'Email is not configured.',
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<{
    success: false
    message: string
  }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        success: false,
        message: 'Email delivery timed out.',
      })
    }, 6000)
  })

  try {
    return await Promise.race([
      sendWelcomeEmail(
        email,
        name,
        role,
        temporaryPassword,
      ),
      timeoutPromise,
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const name = cleanText(body.name)
    const email = cleanText(body.email).toLowerCase()
    const phone = cleanText(body.phone)
    const role = normalizeRole(body.role)

    const adminId =
      request.headers.get('x-user-id') ||
      cleanText(body.adminId) ||
      request.nextUrl.searchParams.get('userId') ||
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

    const administrator = await findAdministrator(adminId)

    if (
      !administrator ||
      String(administrator.role).toUpperCase() !== 'ADMIN'
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

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enter a valid email address.',
        },
        { status: 400 },
      )
    }

    if (name.length > 120) {
      return NextResponse.json(
        {
          success: false,
          error: 'The name is too long.',
        },
        { status: 400 },
      )
    }

    if (phone.length > 40) {
      return NextResponse.json(
        {
          success: false,
          error: 'The phone number is too long.',
        },
        { status: 400 },
      )
    }

    const existingRows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "User"
      WHERE lower("email") = lower(${email})
      LIMIT 1
    `

    if (existingRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'A user with this email already exists.',
        },
        { status: 409 },
      )
    }

    await ensureOnboardingColumns()

    const userId = randomUUID()
    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await bcrypt.hash(temporaryPassword, 12)
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

    const emailResult = await sendWelcomeEmailWithTimeout(
      email,
      name,
      role,
      temporaryPassword,
    )

    const emailSent = Boolean(emailResult?.success)

    return NextResponse.json(
      {
        success: true,
        message: emailSent
          ? `${
              role === 'ADMIN' ? 'Administrator' : 'Worker'
            } account created. The temporary password was sent by email.`
          : `${
              role === 'ADMIN' ? 'Administrator' : 'Worker'
            } account created. Email was not confirmed, so copy the temporary password shown on screen.`,
        user: {
          id: userId,
          name,
          email,
          phone: phone || null,
          role,
          profilePicture: null,
          temporaryPasswordIssued: true,
          passwordChangedAt: null,
          onboardingReminderDismissedAt: null,
          createdAt: now,
        },
        notification: {
          emailSent,
          message:
            emailResult?.message || 'Email was not confirmed.',
        },
        temporaryPassword: emailSent
          ? null
          : temporaryPassword,
        createdBy: {
          id: administrator.id,
          name: administrator.name,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Create staff account error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create the staff account.',
        ...(process.env.NODE_ENV !== 'production'
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
