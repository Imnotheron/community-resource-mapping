export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

// GET single feedback by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN', 'WORKER', 'VULNERABLE'],
    })
    if ('error' in auth) return auth.error

    const { id } = await params
    const feedback = await db.feedback.findUnique({
      where: { id },
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

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 },
      )
    }

    if (auth.role !== 'ADMIN' && feedback.userId !== auth.userId) {
      return NextResponse.json(
        { error: 'You can only view feedback from your own account' },
        { status: 403 },
      )
    }

    return NextResponse.json({ success: true, feedback })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

// PUT to respond to feedback (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const body = await request.json()
    const { response, status } = body

    if (!response) {
      return NextResponse.json(
        { error: 'Response is required' },
        { status: 400 },
      )
    }

    // Verify the feedback exists
    const { id } = await params
    const existingFeedback = await db.feedback.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Update the feedback with admin response
    const updatedFeedback = await db.feedback.update({
      where: { id },
      data: {
        adminResponse: response,
        adminResponseDate: new Date(),
        status: status || 'REVIEWED'
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
      message: 'Response submitted successfully',
      feedback: updatedFeedback
    })
  } catch (error) {
    console.error('Error responding to feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit response' },
      { status: 500 }
    )
  }
}

// DELETE feedback (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    // Verify the feedback exists
    const { id } = await params
    const existingFeedback = await db.feedback.findUnique({
      where: { id }
    })

    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Delete the feedback
    await db.feedback.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting feedback:', error)
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    )
  }
}
