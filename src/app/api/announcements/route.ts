import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendAnnouncementEmail } from '@/lib/email'

// Priority order for sorting
const PRIORITY_ORDER = {
  'URGENT': 0,
  'HIGH': 1,
  'NORMAL': 2,
  'LOW': 3
}

// GET /api/announcements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userRole = searchParams.get('userRole') as 'ADMIN' | 'WORKER' | 'VULNERABLE' | null

    const where = userRole
      ? {
          isActive: true,
          OR: [
            { targetRole: null }, // Goes to all users
            { targetRole: userRole as any } // Goes to specific role
          ]
        }
      : { isActive: true }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // Will be handled by custom sort
        { createdAt: 'desc' }
      ]
    })

    // Custom sort by priority
    const sortedAnnouncements = announcements.sort((a, b) => {
      const priorityA = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER]
      const priorityB = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER]
      return priorityA - priorityB
    })

    return NextResponse.json({
      success: true,
      announcements: sortedAnnouncements
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}

// POST /api/announcements (Admin/Worker only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      content,
      type,
      targetRole = null,
      eventDate = null,
      eventTime = null,
      location = null,
      priority = 'NORMAL',
      createdBy
    } = body

    // Validation
    if (!title || !content || !type || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Title, content, type, and createdBy are required' },
        { status: 400 }
      )
    }

    // Validate announcement type
    const validTypes = ['RELIEF_DISTRIBUTION', 'MEETING', 'GENERAL', 'EMERGENCY', 'IMPORTANT']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid announcement type' },
        { status: 400 }
      )
    }

    // Validate priority
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority' },
        { status: 400 }
      )
    }

    // Validate targetRole if provided
    if (targetRole && !['ADMIN', 'WORKER', 'VULNERABLE'].includes(targetRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid target role' },
        { status: 400 }
      )
    }

    // Verify creator is Admin or Worker
    const creator = await db.user.findUnique({
      where: { id: createdBy }
    })

    if (!creator || (creator.role !== 'ADMIN' && creator.role !== 'WORKER')) {
      return NextResponse.json(
        { success: false, error: 'Only ADMIN and WORKER roles can create announcements' },
        { status: 403 }
      )
    }

    // Create announcement
    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        type: type as any,
        targetRole: targetRole as any,
        eventDate: eventDate ? new Date(eventDate) : null,
        eventTime,
        location,
        priority: priority as any,
        createdBy
      }
    })

    // Create notifications for targeted users
    const usersWhere = targetRole
      ? { role: targetRole as any }
      : { role: { in: ['ADMIN', 'WORKER', 'VULNERABLE'] as any[] } }

    const targetUsers = await db.user.findMany({
      where: usersWhere,
      select: { id: true }
    })

    // Create notifications in batch
    const notifications = targetUsers.map((user) => ({
      userId: user.id,
      type: 'ANNOUNCEMENT' as any,
      title,
      message: content,
      status: 'SENT' as any,
      sentViaEmail: false,
      sentViaSms: false
    }))

    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications
      })
    }

    // Send email notifications in the background (don't block response)
    const targetUsersWithEmail = await db.user.findMany({
      where: usersWhere,
      select: { email: true, name: true }
    })

    // Fire-and-forget: send emails asynchronously (only if Brevo is configured)
    if (process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP_KEY) {
      Promise.allSettled(
        targetUsersWithEmail.map(user => {
          if (!user.email) return Promise.resolve()
          return sendAnnouncementEmail(user.email, user.name || 'User', {
            title,
            content,
            type,
            eventDate: eventDate || null,
            eventTime: eventTime || null,
            location: location || null
          })
        })
      ).then(results => {
        const sent = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length
        console.log(`📧 Announcement emails: ${sent} sent, ${failed} failed`)
        if (failed > 0) {
          const errors = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map(r => r.reason?.message || r.reason)
          console.error('❌ Announcement email errors:', errors)
        }
      })
    } else {
      console.warn('⚠️ Announcement emails skipped — Brevo SMTP not configured.')
    }

    return NextResponse.json({
      success: true,
      announcement,
      notificationsCreated: notifications.length,
      message: 'Announcement created successfully and notifications sent'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create announcement' },
      { status: 500 }
    )
  }
}
