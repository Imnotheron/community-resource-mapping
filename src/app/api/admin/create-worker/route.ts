export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'
import { requireRequestUser } from '@/lib/request-user-session'

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
    randomCharacter(lower),
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

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null

  try {
    const body = await request.json().catch(() => ({}))
    const requestedAdminId = String(body?.adminId || '').trim()

    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
      requestedUserId: requestedAdminId,
    })
    if ('error' in auth) return auth.error

    const cleanName = String(body?.name || '').trim()
    const cleanEmail = String(body?.email || '').trim().toLowerCase()
    const cleanPhone = String(body?.phone || '').trim()

    if (!cleanName || !cleanEmail) {
      return NextResponse.json(
        {
          success: false,
          message: 'Name and email are required',
        },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid email address',
        },
        { status: 400 },
      )
    }

    if (cleanName.length > 120 || cleanPhone.length > 40) {
      return NextResponse.json(
        {
          success: false,
          message: 'One or more account fields are too long',
        },
        { status: 400 },
      )
    }

    const existing = await db.user.findFirst({
      where: {
        email: cleanEmail,
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: 'A user with this email already exists',
        },
        { status: 409 },
      )
    }

    const temporaryPassword = generateTemporaryPassword()
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

    const user = await db.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || null,
        role: 'WORKER',
        password: hashedPassword,
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
        createdAt: true,
      },
    })
    createdUserId = user.id

    const emailResult = await sendWelcomeEmail(
      user.email,
      user.name || 'Worker',
      'WORKER',
      temporaryPassword,
    ).catch((error) => {
      console.error('Failed to send worker welcome email:', error)
      return {
        success: false,
        message: 'Email delivery failed',
      }
    })

    if (!emailResult?.success) {
      let accountRemoved = false

      try {
        await db.user.delete({
          where: { id: user.id },
        })
        accountRemoved = true
        createdUserId = null
      } catch (rollbackError) {
        console.error(
          'Failed to roll back worker after email failure:',
          rollbackError,
        )
      }

      return NextResponse.json(
        {
          success: false,
          message: accountRemoved
            ? 'The worker account was not created because the welcome email could not be delivered.'
            : 'The welcome email failed and the incomplete account could not be removed automatically.',
          accountRemoved,
        },
        { status: accountRemoved ? 502 : 500 },
      )
    }

    createdUserId = null

    return NextResponse.json(
      {
        success: true,
        message:
          'Worker account created successfully. Login credentials were sent to their email.',
        user,
        notification: {
          emailSent: true,
          smsSent: false,
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    if (createdUserId) {
      await db.user.delete({
        where: { id: createdUserId },
      }).catch((rollbackError) =>
        console.error('Worker rollback failed:', rollbackError),
      )
    }

    const duplicateEmail =
      error?.code === 'P2002' ||
      String(error?.message || '')
        .toLowerCase()
        .includes('unique constraint')

    console.error('Error creating worker account:', error)

    return NextResponse.json(
      {
        success: false,
        message: duplicateEmail
          ? 'A user with this email already exists'
          : 'Failed to create worker account',
      },
      { status: duplicateEmail ? 409 : 500 },
    )
  }
}
