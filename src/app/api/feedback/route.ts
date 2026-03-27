export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { FeedbackType, FeedbackStatus } from '@prisma/client'

// GET - List all feedback with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'ALL'
    const type = searchParams.get('type') || 'ALL'
    const userId = searchParams.get('userId')
    const adminView = searchParams.get('adminView') === 'true'

    // Build where clause
    const where: any = {}

    // Status filter
    if (status !== 'ALL') {
      where.status = status
    }

    // Type filter
    if (type !== 'ALL') {
      where.type = type
    }

    // User filter (if not admin view, only show user's own feedback)
    if (userId && !adminView) {
      where.userId = userId
    } else if (userId && adminView) {
      // Admin can filter by specific user
      where.userId = userId
    }

    // Get total count for pagination
    const total = await db.feedback.count({ where })
    const totalPages = Math.ceil(total / limit)

    // Get paginated feedback
    const feedback = await db.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    return NextResponse.json({
      success: true,
      feedback,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

// POST - Create new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, subject, message } = body

    // Validate required fields
    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and type' },
        { status: 400 }
      )
    }

    // Validate feedback type
    const validTypes: FeedbackType[] = [
      'MESSAGE',
      'FEEDBACK',
      'REPORT',
      'BUG_REPORT',
      'FEATURE_REQUEST',
      'COMPLIMENT',
      'SUGGESTION',
      'SERVICE_COMPLAINT',
      'OTHER'
    ]

    if (!validTypes.includes(type as FeedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create the feedback
    const feedback = await db.feedback.create({
      data: {
        userId,
        type: type as FeedbackType,
        subject: subject || null,
        message: message || '',
        status: 'SUBMITTED'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json(
      { success: true, feedback },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
