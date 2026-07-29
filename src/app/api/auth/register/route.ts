export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  createAuthToken,
} from '@/lib/auth-token'
import { db } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must contain at least 8 characters',
        },
        { status: 400 },
      )
    }

    const existingUser = await db.user.findUnique({ where: { email } })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Public self-registration is intentionally limited to vulnerable residents.
    // Administrator and worker accounts must be created by an authenticated admin.
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'VULNERABLE',
      },
    })

    void sendWelcomeEmail(email, name, 'vulnerable').catch((emailError) => {
      console.error('Failed to send welcome email:', emailError)
    })

    const token = await createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.toLowerCase(),
        },
        token,
      },
      { status: 201 },
    )

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 },
    )
  }
}
