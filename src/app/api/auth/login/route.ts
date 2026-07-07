export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim()
    const cleanRole = String(role).trim().toUpperCase()

    let user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        phone: true,
        profilePicture: true,
        vulnerableProfile: {
          select: {
            id: true,
            registrationStatus: true,
          },
        },
      },
    })

    if (!user && cleanEmail !== cleanEmail.toLowerCase()) {
      user = await db.user.findUnique({
        where: { email: cleanEmail.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          phone: true,
          profilePicture: true,
          vulnerableProfile: {
            select: {
              id: true,
              registrationStatus: true,
            },
          },
        },
      })
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (user.role !== cleanRole) {
      return NextResponse.json(
        { success: false, message: 'Invalid role access' },
        { status: 403 }
      )
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
    ).toString('base64')

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        phone: user.phone || null,
        profilePicture: user.profilePicture,
        registrationStatus: user.vulnerableProfile?.registrationStatus || null,

        // Temporary safe fallback until your database migration is applied
        temporaryPasswordIssued: false,
        passwordChangedAt: null,
        onboardingReminderDismissedAt: null,
      },
      token,
    })

    const isDevelopment = process.env.NODE_ENV !== 'production'

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        success: false,
        message:
          'Login failed: ' +
          (error?.message || error?.toString() || 'Unknown error'),
      },
      { status: 500 }
    )
  }
}