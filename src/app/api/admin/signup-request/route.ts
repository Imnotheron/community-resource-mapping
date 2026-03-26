import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, reason, position } = await request.json()

    // Validate required fields
    if (!name || !email || !password || !reason || !position) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Check if there's already a pending signup request
    const existingRequest = await db.adminSignupRequest.findUnique({
      where: { email }
    })

    if (existingRequest && existingRequest.status === 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'You already have a pending signup request' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create signup request
    const signupRequest = await db.adminSignupRequest.create({
      data: {
        name,
        email,
        password: hashedPassword,
        reason,
        position,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Your admin account request has been submitted for review',
      requestId: signupRequest.id
    })
  } catch (error) {
    console.error('Signup request error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to submit signup request' },
      { status: 500 }
    )
  }
}
