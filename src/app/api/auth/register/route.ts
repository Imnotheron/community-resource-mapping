export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 },
      )
    }

    const cleanName = String(name).trim()
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanRole = String(role).trim().toUpperCase()

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 },
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await db.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role: cleanRole,
      },
    })

    // Send welcome email asynchronously (don't block the response)
    sendWelcomeEmail(cleanEmail, cleanName, cleanRole).catch((emailError) => {
      console.error('Failed to send welcome email:', emailError)
    })

    // Create a simple token (in production, use JWT)
    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
    ).toString('base64')

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        createdAt: user.createdAt.toISOString(),
      },
      token,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 },
    )
  }
}