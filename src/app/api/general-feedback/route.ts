export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

type FeedbackType =
  | 'MESSAGE'
  | 'FEEDBACK'
  | 'REPORT'
  | 'BUG_REPORT'
  | 'FEATURE_REQUEST'
  | 'COMPLIMENT'
  | 'SUGGESTION'
  | 'SERVICE_COMPLAINT'
  | 'OTHER'

const VALID_TYPES: FeedbackType[] = [
  'MESSAGE',
  'FEEDBACK',
  'REPORT',
  'BUG_REPORT',
  'FEATURE_REQUEST',
  'COMPLIMENT',
  'SUGGESTION',
  'SERVICE_COMPLAINT',
  'OTHER',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const requestedUserId = String(body?.userId || '').trim()

    const auth = await requireRequestUser(request, {
      requestedUserId,
    })
    if ('error' in auth) return auth.error

    const type = String(body?.type || '').trim().toUpperCase()
    const subject = String(body?.subject || '').trim()
    const message = String(body?.message || '').trim()

    if (!type || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    if (!VALID_TYPES.includes(type as FeedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 },
      )
    }

    const feedback = await db.feedback.create({
      data: {
        userId: auth.userId,
        type: type as FeedbackType,
        subject: subject || null,
        message,
        status: 'SUBMITTED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(
      { success: true, feedback },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating general feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if ('error' in auth) return auth.error

    const searchParams = request.nextUrl.searchParams
    const requestedUserId = String(
      searchParams.get('userId') || '',
    ).trim()
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}

    if (auth.role === 'ADMIN') {
      if (requestedUserId) {
        where.userId = requestedUserId
      }
    } else {
      if (
        requestedUserId &&
        requestedUserId !== auth.userId
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'You can only view feedback from your own account',
          },
          { status: 403 },
        )
      }

      where.userId = auth.userId
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (type && type !== 'ALL') {
      where.type = type
    }

    const feedback = await db.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      feedback,
    })
  } catch (error) {
    console.error('Error fetching general feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 },
    )
  }
}
