import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, adminId } = await request.json()

    // Validate required fields
    if (!name || !email || !password || !adminId) {
      return NextResponse.json(
        { success: false, message: 'Name, email, password, and admin ID are required' },
        { status: 400 }
      )
    }

    // Verify the requester is an admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Only admins can create worker accounts.' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the worker user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'WORKER',
        phone: phone || ''
      }
    })

    // Send email notification with temporary password
    sendWelcomeEmail(email, name, 'WORKER', password)
      .catch(err => console.error('Failed to send email:', err))

    return NextResponse.json({
      success: true,
      message: 'Worker account created successfully. Login credentials have been sent to their email.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error creating worker account:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create worker account' },
      { status: 500 }
    )
  }
}
