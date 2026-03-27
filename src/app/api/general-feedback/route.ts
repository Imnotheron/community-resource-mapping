export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { FeedbackType, FeedbackStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, subject, message } = body

    // Validate required fields
    if (!userId || !type || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate feedback type
    const validTypes = ['MESSAGE', 'FEEDBACK', 'REPORT', 'BUG_REPORT', 'FEATURE_REQUEST', 'COMPLIMENT', 'SUGGESTION', 'SERVICE_COMPLAINT', 'OTHER']
    if (!validTypes.includes(type)) {
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
        message,
        status: FeedbackStatus.SUBMITTED
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

    return NextResponse.json({ success: true, feedback }, { status: 201 })
  } catch (error) {
    console.error('Error creating general feedback:', error)
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
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Build where clause
    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (type && type !== 'ALL') {
      where.type = type
    }

    // Get feedback
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
      take: 50 // Limit to recent 50
    })

    return NextResponse.json({
      success: true,
      feedback
    })
  } catch (error) {
    console.error('Error fetching general feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
