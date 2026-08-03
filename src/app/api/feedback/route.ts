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

const VALID_TYPES = new Set<FeedbackType>([
  'MESSAGE',
  'FEEDBACK',
  'REPORT',
  'BUG_REPORT',
  'FEATURE_REQUEST',
  'COMPLIMENT',
  'SUGGESTION',
  'SERVICE_COMPLAINT',
  'OTHER',
])

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, maximum)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const adminView = searchParams.get('adminView') === 'true'
    const requestedUserId = searchParams.get('userId')
    const auth = await requireRequestUser(request, {
      allowedRoles: adminView ? ['ADMIN'] : [],
      requestedUserId: adminView ? null : requestedUserId,
    })
    if ('error' in auth) return auth.error

    const page = positiveInteger(searchParams.get('page'), 1, 100_000)
    const limit = positiveInteger(searchParams.get('limit'), 10, 100)
    const status = String(searchParams.get('status') || 'ALL').toUpperCase()
    const type = String(searchParams.get('type') || 'ALL').toUpperCase()

    const where: Record<string, unknown> = {}
    if (status !== 'ALL') where.status = status
    if (type !== 'ALL') where.type = type

    if (adminView) {
      if (requestedUserId) where.userId = requestedUserId
    } else {
      where.userId = auth.userId
    }

    const total = await db.feedback.count({ where })
    const feedback = await db.feedback.findMany({
      where,
      select: {
        id: true,
        type: true,
        subject: true,
        message: true,
        status: true,
        adminResponse: true,
        responseDate: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      feedback,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedback' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const type = String(body.type || '').trim().toUpperCase() as FeedbackType
    const subject = String(body.subject || '').trim()
    const message = String(body.message || '').trim()

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { success: false, error: 'Select a valid feedback type' },
        { status: 400 },
      )
    }

    if (subject.length > 120) {
      return NextResponse.json(
        { success: false, error: 'Subject must be 120 characters or fewer' },
        { status: 400 },
      )
    }

    if (message.length < 10 || message.length > 4_000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message must contain between 10 and 4,000 characters',
        },
        { status: 400 },
      )
    }

    const feedback = await db.feedback.create({
      data: {
        userId: auth.userId,
        type,
        subject: subject || null,
        message,
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
      { success: true, feedback },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 },
    )
  }
}
