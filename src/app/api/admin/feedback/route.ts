import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Admin view of all feedback with advanced filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'ALL'
    const type = searchParams.get('type') || 'ALL'
    const userId = searchParams.get('userId') // Filter by user

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

    // User filter
    if (userId) {
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

    // Get statistics
    const stats = {
      total,
      submitted: await db.feedback.count({ where: { status: 'SUBMITTED' } }),
      reviewed: await db.feedback.count({ where: { status: 'REVIEWED' } }),
      resolved: await db.feedback.count({ where: { status: 'RESOLVED' } }),
      dismissed: await db.feedback.count({ where: { status: 'DISMISSED' } }),
      byType: {
        message: await db.feedback.count({ where: { type: 'MESSAGE' } }),
        feedback: await db.feedback.count({ where: { type: 'FEEDBACK' } }),
        report: await db.feedback.count({ where: { type: 'REPORT' } }),
        bugReport: await db.feedback.count({ where: { type: 'BUG_REPORT' } }),
        featureRequest: await db.feedback.count({ where: { type: 'FEATURE_REQUEST' } }),
        compliment: await db.feedback.count({ where: { type: 'COMPLIMENT' } }),
        suggestion: await db.feedback.count({ where: { type: 'SUGGESTION' } }),
        serviceComplaint: await db.feedback.count({ where: { type: 'SERVICE_COMPLAINT' } }),
        other: await db.feedback.count({ where: { type: 'OTHER' } })
      }
    }

    return NextResponse.json({
      success: true,
      feedback,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit
      },
      stats
    })
  } catch (error) {
    console.error('Error fetching admin feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

// POST - Admin response to feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedbackId, adminResponse } = body

    // Validate required fields
    if (!feedbackId || !adminResponse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if feedback exists
    const feedback = await db.feedback.findUnique({
      where: { id: feedbackId }
    })

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Update feedback with admin response
    const updatedFeedback = await db.feedback.update({
      where: { id: feedbackId },
      data: {
        adminResponse,
        adminResponseDate: new Date(),
        status: 'REVIEWED'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Response sent successfully',
      feedback: updatedFeedback
    })
  } catch (error) {
    console.error('Error responding to feedback:', error)
    return NextResponse.json(
      { error: 'Failed to send response' },
      { status: 500 }
    )
  }
}
