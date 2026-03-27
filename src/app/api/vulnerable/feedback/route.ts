export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { FeedbackType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reliefDistributionId, userId, feedbackType, message } = body

    // Validate required fields
    if (!reliefDistributionId || !userId || !feedbackType || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate feedback type
    if (!['MESSAGE', 'FEEDBACK', 'REPORT'].includes(feedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      )
    }

    // Verify the relief distribution exists and belongs to the user
    const distribution = await db.reliefDistribution.findUnique({
      where: { id: reliefDistributionId },
      include: { vulnerableProfile: true }
    })

    if (!distribution) {
      return NextResponse.json(
        { error: 'Relief distribution not found' },
        { status: 404 }
      )
    }

    // Check if the user is authorized to give feedback for this distribution
    if (distribution.vulnerableProfile?.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to give feedback for this distribution' },
        { status: 403 }
      )
    }

    // Check if user already submitted feedback for this distribution
    const existingFeedback = await db.reliefFeedback.findFirst({
      where: {
        reliefDistributionId,
        userId
      }
    })

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'You have already submitted feedback for this relief distribution' },
        { status: 409 }
      )
    }

    // Create the feedback
    const feedback = await db.reliefFeedback.create({
      data: {
        reliefDistributionId,
        userId,
        feedbackType: feedbackType as FeedbackType,
        message,
        status: 'SUBMITTED'
      },
      include: {
        reliefDistribution: {
          include: {
            worker: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, feedback }, { status: 201 })
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const adminView = searchParams.get('adminView') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = {}
    
    if (status && status !== 'ALL') {
      where.status = status
    }

    // If not admin view, only show user's own feedback
    if (!adminView) {
      where.userId = userId
    }

    // Get total count for pagination
    const total = await db.reliefFeedback.count({ where })
    const totalPages = Math.ceil(total / limit)

    // Get paginated feedback
    const feedback = await db.reliefFeedback.findMany({
      where,
      include: {
        reliefDistribution: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            vulnerableProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
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
