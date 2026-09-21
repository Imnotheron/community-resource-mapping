export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
      requestedUserId: String(body.workerId || '').trim(),
    })
    if ('error' in auth) return auth.error

    const note = String(body.note || '').trim()
    if (!note) {
      return NextResponse.json(
        { success: false, error: 'A field note is required' },
        { status: 400 },
      )
    }

    if (note.length > 4_000) {
      return NextResponse.json(
        { success: false, error: 'Field notes must be 4,000 characters or fewer' },
        { status: 400 },
      )
    }

    const feedback = await db.feedback.create({
      data: {
        userId: auth.userId,
        type: 'FIELD_NOTE' as any,
        subject: 'Field Note',
        message: note,
        status: 'SUBMITTED',
      },
      select: {
        id: true,
        type: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Field note saved',
        feedback,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error submitting field note:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save field note' },
      { status: 500 },
    )
  }
}
