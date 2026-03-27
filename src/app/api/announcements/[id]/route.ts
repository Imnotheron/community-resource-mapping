export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/announcements/[id] (Admin/Worker only - creator only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get existing announcement
    const existingAnnouncement = await db.announcement.findUnique({
      where: { id }
    })

    if (!existingAnnouncement) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Verify the requester is the creator
    if (existingAnnouncement.createdBy !== body.createdBy) {
      return NextResponse.json(
        { success: false, error: 'Only the creator can edit this announcement' },
        { status: 403 }
      )
    }

    // Verify creator is still Admin or Worker
    const creator = await db.user.findUnique({
      where: { id: body.createdBy }
    })

    if (!creator || (creator.role !== 'ADMIN' && creator.role !== 'WORKER')) {
      return NextResponse.json(
        { success: false, error: 'Only ADMIN and WORKER roles can update announcements' },
        { status: 403 }
      )
    }

    // Update announcement
    const updatedAnnouncement = await db.announcement.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.targetRole !== undefined && { targetRole: body.targetRole }),
        ...(body.eventDate !== undefined && { eventDate: body.eventDate ? new Date(body.eventDate) : null }),
        ...(body.eventTime !== undefined && { eventTime: body.eventTime }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.isActive !== undefined && { isActive: body.isActive })
      }
    })

    return NextResponse.json({
      success: true,
      announcement: updatedAnnouncement,
      message: 'Announcement updated successfully'
    })
  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update announcement' },
      { status: 500 }
    )
  }
}

// DELETE /api/announcements/[id] (Admin only - creator or any admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const requesterId = searchParams.get('requesterId')

    if (!requesterId) {
      return NextResponse.json(
        { success: false, error: 'Requester ID is required' },
        { status: 400 }
      )
    }

    // Get existing announcement
    const existingAnnouncement = await db.announcement.findUnique({
      where: { id }
    })

    if (!existingAnnouncement) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Verify requester is Admin or the creator
    const requester = await db.user.findUnique({
      where: { id: requesterId }
    })

    if (!requester) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (requester.role !== 'ADMIN' && existingAnnouncement.createdBy !== requesterId) {
      return NextResponse.json(
        { success: false, error: 'Only the creator or an admin can delete this announcement' },
        { status: 403 }
      )
    }

    // Delete announcement
    await db.announcement.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}
