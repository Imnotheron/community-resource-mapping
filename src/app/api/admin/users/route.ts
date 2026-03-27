export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET all users (admin only)
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching all users...')
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
        vulnerableProfile: {
          select: {
            id: true,
            registrationStatus: true
          }
        },
        _count: {
          select: {
            reliefDistributions: true,
            assignedAsWorker: true,
            feedback: true,
            generalFeedback: true,
            fieldNotes: true,
            notifications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Found ${users.length} users`)
    return NextResponse.json({
      success: true,
      users
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users', details: String(error) },
      { status: 500 }
    )
  }
}

// POST create new user (admin only - typically for creating workers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, phone } = body

    // Validation
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Name, email, password, and role are required' },
        { status: 400 }
      )
    }

    if (role !== 'WORKER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only WORKER and ADMIN roles can be created' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password before storage (SECURITY FIX)
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword, // SECURE: Hashed password
        role: role as 'ADMIN' | 'WORKER',
        phone: phone || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `${role === 'WORKER' ? 'Worker' : 'Admin'} account created successfully`
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
