import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET - Fetch user settings
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        preferences: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Parse preferences JSON
    let preferences = {}
    if (user.preferences) {
      try {
        preferences = JSON.parse(user.preferences)
      } catch (error) {
        console.error('Error parsing preferences:', error)
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        theme: (preferences as any).theme || 'light'
      }
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user settings' },
      { status: 500 }
    )
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Check if it's a password change request
    if (body.currentPassword && body.newPassword) {
      const { currentPassword, newPassword } = body

      // Validate new password
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }

      // Get current user
      const user = await db.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        )
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update password
      await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      })

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      })
    }

    // Handle profile updates (name, phone, theme)
    const updates: any = {}
    let preferences = {}

    // Get current preferences
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    })

    if (currentUser?.preferences) {
      try {
        preferences = JSON.parse(currentUser.preferences)
      } catch (error) {
        console.error('Error parsing preferences:', error)
      }
    }

    // Update name if provided
    if (body.name !== undefined) {
      updates.name = body.name
    }

    // Update phone if provided
    if (body.phone !== undefined) {
      updates.phone = body.phone
    }

    // Update theme preference if provided
    if (body.theme !== undefined) {
      (preferences as any).theme = body.theme
      updates.preferences = JSON.stringify(preferences)
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        preferences: true
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        theme: (preferences as any).theme || 'light'
      }
    })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user settings' },
      { status: 500 }
    )
  }
}
