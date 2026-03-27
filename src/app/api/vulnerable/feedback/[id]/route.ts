export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET single feedback by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const feedback = await db.reliefFeedback.findUnique({
      where: { id },
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
      }
    })

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
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
    const body = await request.json()
    const { response, status, userId } = body

    // Validate required fields
    if (!response || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: response and userId' },
        { status: 400 }
      )
    }

    // Verify the feedback exists
    const { id } = await params
    const existingFeedback = await db.reliefFeedback.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Verify the user is an admin or worker
    const requestingUser = await db.user.findUnique({
      where: { id: userId }
    })

    if (!requestingUser || (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'WORKER')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and workers can respond to feedback.' },
        { status: 403 }
      )
    }

    // Update the feedback with admin response
    const updatedFeedback = await db.reliefFeedback.update({
      where: { id },
      data: {
        adminResponse: response,
        adminResponseDate: new Date(),
        status: status || 'REVIEWED'
      },
      include: {
        reliefDistribution: {
          include: {
            worker: true
          }
        },
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
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify the feedback exists
    const { id } = await params
    const existingFeedback = await db.reliefFeedback.findUnique({
      where: { id }
    })

    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Verify the user is an admin
    const requestingUser = await db.user.findUnique({
      where: { id: userId }
    })

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete feedback.' },
        { status: 403 }
      )
    }

    // Delete the feedback
    await db.reliefFeedback.delete({
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
