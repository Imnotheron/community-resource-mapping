export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireMatchingRequestUser } from '@/lib/request-user-session'

// Deployment targets such as Vercel cannot persist uploads under public/.
// Store a small, normalized WebP data URL in the existing User.profilePicture
// TEXT column instead: no new table, external storage credentials, or files.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_SAVED_BYTES = 48 * 1024
const MAX_IMAGE_PIXELS = 25_000_000
const MAX_DIMENSION = 256

const MIME_TYPES_BY_FORMAT: Record<string, string[]> = {
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
}

function errorJson(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

async function toStoredPicture(file: File): Promise<string | null> {
  const input = Buffer.from(await file.arrayBuffer())

  try {
    const metadata = await sharp(input, {
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata()

    if (
      !metadata.format ||
      !MIME_TYPES_BY_FORMAT[metadata.format]?.includes(file.type)
    ) {
      return null
    }

    // Remove EXIF/location data and normalize all accepted formats.
    // Always resize before storing to keep JSON login/user-list responses
    // small even when many people have profile pictures.
    for (const quality of [72, 55, 38]) {
      const image = await sharp(input, {
        limitInputPixels: MAX_IMAGE_PIXELS,
      })
        .rotate()
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 4 })
        .toBuffer()

      if (image.length <= MAX_SAVED_BYTES) {
        return `data:image/webp;base64,${image.toString('base64')}`
      }
    }
  } catch (error) {
    console.warn('Invalid or unreadable profile picture:', error)
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMatchingRequestUser(request)
    if ('error' in auth) return auth.error

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return errorJson('No file uploaded', 400)
    }

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return errorJson('Choose an image smaller than 5 MB', 400)
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      return errorJson('Only JPG, PNG, and WebP images are allowed', 400)
    }

    const existing = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true },
    })
    if (!existing) return errorJson('User not found', 404)

    const profilePictureUrl = await toStoredPicture(file)
    if (!profilePictureUrl) {
      return errorJson(
        'This photo could not be processed. Choose a valid JPG, PNG, or WebP image.',
        400,
      )
    }

    await db.user.update({
      where: { id: auth.userId },
      data: { profilePicture: profilePictureUrl },
    })

    return NextResponse.json({
      success: true,
      profilePictureUrl,
      message: 'Profile picture uploaded successfully',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    return errorJson('Failed to save profile picture. Please try again.', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireMatchingRequestUser(request)
    if ('error' in auth) return auth.error

    const existing = await db.user.findUnique({
      where: { id: auth.userId },
      select: { profilePicture: true },
    })
    if (!existing) return errorJson('User not found', 404)

    if (existing.profilePicture) {
      await db.user.update({
        where: { id: auth.userId },
        data: { profilePicture: null },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error removing profile picture:', error)
    return errorJson('Failed to remove profile picture. Please try again.', 500)
  }
}
