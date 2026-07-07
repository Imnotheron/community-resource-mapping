export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { sendWelcomeEmail } from '@/lib/email'

function generateTemporaryPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%'

  let password = ''
  for (let i = 0; i < 5; i++) password += letters[Math.floor(Math.random() * letters.length)]
  for (let i = 0; i < 2; i++) password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, adminId } = await request.json()

    if (!name || !email || !adminId) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and admin ID are required' },
        { status: 400 }
      )
    }

    const cleanName = String(name).trim()
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanPhone = phone ? String(phone).trim() : null

    const adminRows = await db.$queryRaw<Array<{ id: string; role: string }>>`
      SELECT "id", "role"
      FROM "User"
      WHERE "id" = ${adminId}
      LIMIT 1
    `

    const admin = adminRows[0]

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Only admins can create worker accounts.' },
        { status: 403 }
      )
    }

    const existingRows = await db.$queryRaw<Array<{ id: string; email: string }>>`
      SELECT "id", "email"
      FROM "User"
      WHERE lower("email") = lower(${cleanEmail})
      LIMIT 1
    `

    if (existingRows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    const temporaryPassword = generateTemporaryPassword()
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10)
    const userId = randomUUID()
    const now = new Date()

    await db.$executeRaw`
      INSERT INTO "User" (
        "id",
        "email",
        "password",
        "name",
        "role",
        "phone",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${userId},
        ${cleanEmail},
        ${hashedPassword},
        ${cleanName},
        'WORKER',
        ${cleanPhone},
        ${now},
        ${now}
      )
    `

    const emailResult = await sendWelcomeEmail(
      cleanEmail,
      cleanName || 'Worker',
      'WORKER',
      temporaryPassword
    ).catch((error) => {
      console.error('Failed to send worker welcome email:', error)
      return { success: false, message: error?.message || 'Email failed' }
    })

    return NextResponse.json({
      success: true,
      message: emailResult?.success
        ? 'Worker account created successfully. Login credentials were sent to their email.'
        : 'Worker account created successfully, but the email notification failed.',
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role: 'WORKER',
        phone: cleanPhone,
        createdAt: now,
      },
      tempPassword: temporaryPassword,
      temporaryPassword,
      notification: {
        emailSent: !!emailResult?.success,
        smsSent: false,
      },
    })
  } catch (error: any) {
    console.error('Error creating worker account:', error)

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to create worker account: ' +
          (error?.message || error?.toString() || 'Unknown error'),
      },
      { status: 500 }
    )
  }
}