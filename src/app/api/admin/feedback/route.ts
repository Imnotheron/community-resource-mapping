export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const searchParams = request.nextUrl.searchParams
    const parsedPage = Number.parseInt(searchParams.get('page') || '1', 10)
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '10', 10)
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(100, Math.max(1, parsedLimit))
      : 10
    const status = searchParams.get('status') || 'ALL'
    const type = searchParams.get('type') || 'ALL'
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}

    if (status !== 'ALL') where.status = status
    if (type !== 'ALL') where.type = type
    if (userId) where.userId = userId

    const total = await db.feedback.count({ where })
    const totalPages = Math.ceil(total / limit)

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
      skip: (page - 1) * limit,
      take: limit,
    })

    const [
      submitted,
      reviewed,
      resolved,
      dismissed,
      messageCount,
      feedbackCount,
      report,
      bugReport,
      featureRequest,
      compliment,
      suggestion,
      serviceComplaint,
      other,
    ] = await Promise.all([
      db.feedback.count({ where: { status: 'SUBMITTED' } }),
      db.feedback.count({ where: { status: 'REVIEWED' } }),
      db.feedback.count({ where: { status: 'RESOLVED' } }),
      db.feedback.count({ where: { status: 'DISMISSED' } }),
      db.feedback.count({ where: { type: 'MESSAGE' } }),
      db.feedback.count({ where: { type: 'FEEDBACK' } }),
      db.feedback.count({ where: { type: 'REPORT' } }),
      db.feedback.count({ where: { type: 'BUG_REPORT' } }),
      db.feedback.count({ where: { type: 'FEATURE_REQUEST' } }),
      db.feedback.count({ where: { type: 'COMPLIMENT' } }),
      db.feedback.count({ where: { type: 'SUGGESTION' } }),
      db.feedback.count({ where: { type: 'SERVICE_COMPLAINT' } }),
      db.feedback.count({ where: { type: 'OTHER' } }),
    ])

    return NextResponse.json({
      success: true,
      feedback,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
      stats: {
        total,
        submitted,
        reviewed,
        resolved,
        dismissed,
        byType: {
          message: messageCount,
          feedback: feedbackCount,
          report,
          bugReport,
          featureRequest,
          compliment,
          suggestion,
          serviceComplaint,
          other,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching admin feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const body = await request.json()
    const feedbackId = String(body?.feedbackId || '').trim()
    const adminResponse = String(body?.adminResponse || '').trim()

    if (!feedbackId || !adminResponse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    const feedback = await db.feedback.findUnique({
      where: { id: feedbackId },
    })

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 },
      )
    }

    const updatedFeedback = await db.feedback.update({
      where: { id: feedbackId },
      data: {
        adminResponse,
        adminResponseDate: new Date(),
        status: 'REVIEWED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Response sent successfully',
      feedback: updatedFeedback,
    })
  } catch (error) {
    console.error('Error responding to feedback:', error)
    return NextResponse.json(
      { error: 'Failed to send response' },
      { status: 500 },
    )
  }
}
