export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// POST - Upload profile picture
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPG, PNG, and WebP images are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Get current user to check for existing profile picture
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      const oldPath = join(process.cwd(), 'public', user.profilePicture)
      if (existsSync(oldPath)) {
        try {
          await unlink(oldPath)
        } catch (error) {
          console.error('Error deleting old profile picture:', error)
        }
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const filename = `${timestamp}-profile-${userId}.${fileExtension}`
    const filepath = join(uploadDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Generate URL
    const profilePictureUrl = `/uploads/${filename}`

    // Update user profile
    await db.user.update({
      where: { id: userId },
      data: { profilePicture: profilePictureUrl }
    })

    return NextResponse.json({
      success: true,
      profilePictureUrl,
      message: 'Profile picture uploaded successfully'
    })
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload profile picture' },
      { status: 500 }
    )
  }
}

// DELETE - Remove profile picture
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 401 }
      )
    }

    // Get current user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete profile picture file if it exists
    if (user.profilePicture) {
      const filepath = join(process.cwd(), 'public', user.profilePicture)
      if (existsSync(filepath)) {
        try {
          await unlink(filepath)
        } catch (error) {
          console.error('Error deleting profile picture file:', error)
        }
      }

      // Update user to remove profile picture reference
      await db.user.update({
        where: { id: userId },
        data: { profilePicture: null }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully'
    })
  } catch (error) {
    console.error('Error removing profile picture:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove profile picture' },
      { status: 500 }
    )
  }
}
