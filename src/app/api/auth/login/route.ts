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

    // Find user by email and role
    const user = await db.user.findUnique({
      where: { email },
      include: {
        vulnerableProfile: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user has the correct role
    if (user.role !== role.toUpperCase()) {
      return NextResponse.json(
        { success: false, message: 'Invalid role access' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // For vulnerable users, check if profile is approved
    if (user.role === 'VULNERABLE' && user.vulnerableProfile) {
      if (user.vulnerableProfile.registrationStatus === 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Your registration is pending approval' },
          { status: 403 }
        )
      }
      if (user.vulnerableProfile.registrationStatus === 'REJECTED') {
        return NextResponse.json(
          { success: false, message: 'Your registration was rejected' },
          { status: 403 }
        )
      }
    }

    // Create a simple token (in production, use JWT)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role
    })).toString('base64')

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        profilePicture: user.profilePicture
      },
      token
    })

    // Set the token as an httpOnly cookie for middleware authentication
    const isDevelopment = process.env.NODE_ENV !== 'production'
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
      // Don't set domain in development - let browser handle it automatically
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Login failed: ' + (error?.message || error?.toString() || 'Unknown error'),
        debug: process.env.NODE_ENV === 'production' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
