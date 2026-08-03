export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

type FeedbackType = 'MESSAGE' | 'FEEDBACK' | 'REPORT'
const VALID_TYPES = new Set<FeedbackType>(['MESSAGE', 'FEEDBACK', 'REPORT'])

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, maximum)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const auth = await requireRequestUser(request, {
      allowedRoles: ['VULNERABLE'],
      requestedUserId: String(body.userId || '').trim(),
    })
    if ('error' in auth) return auth.error

    const reliefDistributionId = String(body.reliefDistributionId || '').trim()
    const feedbackType = String(body.feedbackType || '').trim().toUpperCase() as FeedbackType
    const message = String(body.message || '').trim()

    if (!reliefDistributionId || !VALID_TYPES.has(feedbackType)) {
      return NextResponse.json(
        { success: false, error: 'Distribution and feedback type are required' },
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

    const distribution = await db.reliefDistribution.findUnique({
      where: { id: reliefDistributionId },
      select: {
        id: true,
        status: true,
        vulnerableProfile: {
          select: { userId: true },
        },
      },
    })

    if (!distribution) {
      return NextResponse.json(
        { success: false, error: 'Relief distribution not found' },
        { status: 404 },
      )
    }

    if (distribution.vulnerableProfile?.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'This distribution does not belong to your profile' },
        { status: 403 },
      )
    }

    if (distribution.status !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Feedback can be submitted after the distribution is approved',
        },
        { status: 409 },
      )
    }

    const existingFeedback = await db.reliefFeedback.findFirst({
      where: {
        reliefDistributionId: distribution.id,
        userId: auth.userId,
      },
      select: { id: true },
    })

    if (existingFeedback) {
      return NextResponse.json(
        {
          success: false,
          error: 'Feedback has already been submitted for this distribution',
        },
        { status: 409 },
      )
    }

    const feedback = await db.reliefFeedback.create({
      data: {
        reliefDistributionId: distribution.id,
        userId: auth.userId,
        feedbackType,
        message,
        status: 'SUBMITTED',
      },
      select: {
        id: true,
        reliefDistributionId: true,
        feedbackType: true,
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
    console.error('Error creating relief feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const adminView = searchParams.get('adminView') === 'true'
    const requestedUserId = searchParams.get('userId')
    const auth = await requireRequestUser(request, {
      allowedRoles: adminView ? ['ADMIN'] : ['VULNERABLE'],
      requestedUserId: adminView ? null : requestedUserId,
    })
    if ('error' in auth) return auth.error

    const page = positiveInteger(searchParams.get('page'), 1, 100_000)
    const limit = positiveInteger(searchParams.get('limit'), 10, 100)
    const status = String(searchParams.get('status') || 'ALL').toUpperCase()

    const where: any = {}
    if (status !== 'ALL') where.status = status
    if (adminView) {
      if (requestedUserId) where.userId = requestedUserId
    } else {
      where.userId = auth.userId
    }

    const total = await db.reliefFeedback.count({ where })
    const feedback = await db.reliefFeedback.findMany({
      where,
      select: {
        id: true,
        reliefDistributionId: true,
        feedbackType: true,
        message: true,
        status: true,
        adminResponse: true,
        responseDate: true,
        createdAt: true,
        reliefDistribution: {
          select: {
            id: true,
            distributionType: true,
            itemsProvided: true,
            quantity: true,
            distributionDate: true,
            status: true,
            worker: {
              select: { id: true, name: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true, role: true },
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
    console.error('Error fetching relief feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedback' },
      { status: 500 },
    )
  }
}
