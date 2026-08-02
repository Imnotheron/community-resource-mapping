export const dynamic = 'force-dynamic'

import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireMatchingRequestUser } from '@/lib/request-user-session'

function safePicturePath(value: string | null | undefined) {
  if (!value || !value.startsWith('/uploads/')) return null
  return join(process.cwd(), 'public', value)
}

async function removeStoredPicture(value: string | null | undefined) {
  const filepath = safePicturePath(value)
  if (!filepath || !existsSync(filepath)) return

  try {
    await unlink(filepath)
  } catch (error) {
    console.error('Error deleting profile picture file:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireMatchingRequestUser(request)
    if ('error' in auth) return auth.error

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 },
      )
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only JPG, PNG, and WebP images are allowed',
        },
        { status: 400 },
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 },
      )
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { profilePicture: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const extension = extensionByType[file.type]
    const filename = `${Date.now()}-profile-${auth.userId}.${extension}`
    const filepath = join(uploadDir, filename)
    const profilePictureUrl = `/uploads/${filename}`

    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    try {
      await db.user.update({
        where: { id: auth.userId },
        data: { profilePicture: profilePictureUrl },
      })
    } catch (error) {
      await removeStoredPicture(profilePictureUrl)
      throw error
    }

    await removeStoredPicture(user.profilePicture)

    return NextResponse.json({
      success: true,
      profilePictureUrl,
      message: 'Profile picture uploaded successfully',
    })
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload profile picture' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireMatchingRequestUser(request)
    if ('error' in auth) return auth.error

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { profilePicture: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    if (user.profilePicture) {
      await db.user.update({
        where: { id: auth.userId },
        data: { profilePicture: null },
      })
      await removeStoredPicture(user.profilePicture)
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully',
    })
  } catch (error) {
    console.error('Error removing profile picture:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove profile picture' },
      { status: 500 },
    )
  }
}
