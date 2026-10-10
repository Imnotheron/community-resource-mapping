export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireMatchingRequestUser } from '@/lib/request-user-session'

// Deployment targets such as Vercel cannot persist uploads under public/.
// Store a small, client-normalized image data URL in User.profilePicture.
// No native image library, new table, external credentials, or files are needed.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_SAVED_BYTES = 48 * 1024

function errorJson(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

// Check the actual file signature, not just the untrusted multipart MIME.
// Client-side canvas export removes camera EXIF/GPS metadata and shrinks
// the image before upload. The strict byte limit also bounds database size.
function detectImageMime(input: Buffer): string | null {
  if (
    input.length >= 4 &&
    input[0] === 0xff &&
    input[1] === 0xd8 &&
    input[2] === 0xff &&
    input[input.length - 2] === 0xff &&
    input[input.length - 1] === 0xd9
  ) return 'image/jpeg'

  if (
    input.length >= 24 &&
    input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) return 'image/png'

  if (
    input.length >= 16 &&
    input.toString('ascii', 0, 4) === 'RIFF' &&
    input.toString('ascii', 8, 12) === 'WEBP' &&
    input.readUInt32LE(4) + 8 === input.length
  ) return 'image/webp'

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

    if (file.size > MAX_SAVED_BYTES) {
      return errorJson(
        'Photo is too large after preparation. Refresh the page and try a smaller image.',
        413,
      )
    }

    const contents = Buffer.from(await file.arrayBuffer())
    const actualMime = detectImageMime(contents)
    const declaredMime = file.type === 'image/jpg' ? 'image/jpeg' : file.type
    if (!actualMime || actualMime !== declaredMime) {
      return errorJson(
        'Invalid image contents. Choose a valid JPG, PNG, or WebP image.',
        400,
      )
    }
    const profilePictureUrl = `data:${actualMime};base64,${contents.toString('base64')}`

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
