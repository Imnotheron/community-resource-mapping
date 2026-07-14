export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'

type StaffRole = 'ADMIN' | 'WORKER'

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

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1)
    ;[characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ]
  }

  return characters.join('')
}

async function requireCurrentAdmin(
  request: NextRequest,
  adminPassword: string,
) {
  const adminId =
    request.headers.get('x-user-id') ||
    request.nextUrl.searchParams.get('userId')

  if (!adminId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: 'Administrator session is required',
        },
        { status: 401 },
      ),
    }
  }

  const administrator = await db.user.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true,
    },
  })

  if (
    !administrator ||
    String(administrator.role).toUpperCase() !== 'ADMIN'
  ) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: 'Only an administrator can create staff accounts',
        },
        { status: 403 },
      ),
    }
  }

  if (!adminPassword) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: 'Enter your current administrator password',
        },
        { status: 400 },
      ),
    }
  }

  const passwordIsValid = await bcrypt.compare(
    adminPassword,
    administrator.password,
  )

  if (!passwordIsValid) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: 'Your administrator password is incorrect',
        },
        { status: 401 },
      ),
    }
  }

  return { administrator }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const name = cleanText(body.name)
    const email = cleanText(body.email).toLowerCase()
    const phone = cleanText(body.phone)
    const role = normalizeRole(body.role)
    const adminPassword = String(body.adminPassword || '')

    const authorization = await requireCurrentAdmin(
      request,
      adminPassword,
    )

    if ('error' in authorization) {
      return authorization.error
    }

    if (!name || !email || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name, email, and account role are required',
        },
        { status: 400 },
      )
    }

    if (name.length > 120) {
      return NextResponse.json(
        {
          success: false,
          error: 'The name is too long',
        },
        { status: 400 },
      )
    }

    if (phone.length > 40) {
      return NextResponse.json(
        {
          success: false,
          error: 'The phone number is too long',
        },
        { status: 400 },
      )
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enter a valid email address',
        },
        { status: 400 },
      )
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'A user with this email already exists',
        },
        { status: 409 },
      )
    }

    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await bcrypt.hash(
      temporaryPassword,
      12,
    )

    const createdUser = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role,
        password: passwordHash,
        temporaryPasswordIssued: true,
        passwordChangedAt: null,
        onboardingReminderDismissedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        createdAt: true,
      },
    })

    const emailResult = await sendWelcomeEmail(
      email,
      name,
      role,
      temporaryPassword,
    ).catch((error) => {
      console.error(
        `Failed to send ${role} welcome email:`,
        error,
      )

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Email delivery failed',
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: emailResult?.success
          ? `${
              role === 'ADMIN' ? 'Administrator' : 'Worker'
            } account created. Login instructions were sent by email.`
          : `${
              role === 'ADMIN' ? 'Administrator' : 'Worker'
            } account created, but the welcome email was not delivered.`,
        user: createdUser,
        notification: {
          emailSent: Boolean(emailResult?.success),
        },
        temporaryPassword: emailResult?.success
          ? null
          : temporaryPassword,
        createdBy: {
          id: authorization.administrator.id,
          name: authorization.administrator.name,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Create staff account error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create the staff account',
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
