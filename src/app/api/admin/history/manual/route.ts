export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

function clean(value: unknown, max = 2000) {
  return String(value || '').trim().slice(0, max)
}

function parseDate(value: unknown) {
  const raw = clean(value, 20)
  if (!raw) return null

  const date = new Date(`${raw}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const [workers, profiles] = await Promise.all([
      db.user.findMany({
        where: { role: 'WORKER' },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      }),
      db.vulnerableProfile.findMany({
        where: { registrationStatus: 'APPROVED' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          barangay: true,
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      }),
    ])

    return NextResponse.json({
      success: true,
      workers,
      profiles,
    })
  } catch (error) {
    console.error(
      'Failed to load manual history options:',
      error,
    )
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load history entry options',
      },
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

    const body = await request.json().catch(() => ({}))
    const kind = clean(body.kind, 20).toUpperCase()
    const date = parseDate(body.date)

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: 'A valid historical date is required',
        },
        { status: 400 },
      )
    }

    if (date.getTime() > Date.now() + 60 * 60 * 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Historical entries cannot use a future date',
        },
        { status: 400 },
      )
    }

    const auditNote =
      `Historical record encoded by Administrator ${auth.userId} on ${new Date().toISOString()}.`

    if (kind === 'RELIEF') {
      const vulnerableProfileId = clean(
        body.vulnerableProfileId,
        100,
      )
      const workerId = clean(body.workerId, 100)
      const distributionType = clean(
        body.distributionType,
        120,
      )
      const itemsProvided = clean(
        body.itemsProvided,
        1000,
      )
      const quantity = Number.parseInt(
        String(body.quantity),
        10,
      )
      const status = clean(
        body.status,
        30,
      ).toUpperCase()
      const notes = clean(body.notes, 1500)

      if (
        !vulnerableProfileId ||
        !workerId ||
        !distributionType ||
        !itemsProvided
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Citizen, worker, distribution type, and items are required',
          },
          { status: 400 },
        )
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 100_000
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Quantity must be a positive whole number',
          },
          { status: 400 },
        )
      }

      const allowedStatuses = new Set([
        'APPROVED',
        'DISTRIBUTED',
        'PENDING',
        'REJECTED',
      ])

      if (!allowedStatuses.has(status)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid distribution status',
          },
          { status: 400 },
        )
      }

      const [profile, worker] = await Promise.all([
        db.vulnerableProfile.findUnique({
          where: { id: vulnerableProfileId },
          select: {
            id: true,
            registrationStatus: true,
          },
        }),
        db.user.findUnique({
          where: { id: workerId },
          select: {
            id: true,
            role: true,
          },
        }),
      ])

      if (
        !profile ||
        profile.registrationStatus !== 'APPROVED'
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Historical relief can only be linked to an approved vulnerable citizen',
          },
          { status: 409 },
        )
      }

      if (!worker || worker.role !== 'WORKER') {
        return NextResponse.json(
          {
            success: false,
            error: 'Selected Worker account is invalid',
          },
          { status: 400 },
        )
      }

      const distribution =
        await db.reliefDistribution.create({
          data: {
            vulnerableProfileId,
            workerId,
            distributionDate: date,
            distributionType,
            itemsProvided,
            quantity,
            status,
            notes: [auditNote, notes]
              .filter(Boolean)
              .join('\n'),
          },
        })

      return NextResponse.json(
        {
          success: true,
          kind,
          record: distribution,
        },
        { status: 201 },
      )
    }

    if (kind === 'EVENT') {
      const title = clean(body.title, 160)
      const content = clean(body.content, 4000)
      const type = clean(body.eventType, 120)
      const eventTime = clean(body.eventTime, 20)
      const location = clean(body.location, 250)
      const targetRole = clean(
        body.targetRole,
        30,
      ).toUpperCase()
      const priority = clean(
        body.priority,
        30,
      ).toUpperCase()

      if (!title || !content || !type) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Event title, description, and type are required',
          },
          { status: 400 },
        )
      }

      const allowedAudiences = new Set([
        'ALL',
        'ADMIN',
        'WORKER',
        'VULNERABLE',
      ])
      const allowedPriorities = new Set([
        'LOW',
        'NORMAL',
        'HIGH',
        'URGENT',
      ])

      if (
        !allowedAudiences.has(targetRole) ||
        !allowedPriorities.has(priority)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid audience or priority',
          },
          { status: 400 },
        )
      }

      const announcement = await db.announcement.create({
        data: {
          title,
          content: `${content}\n\n[${auditNote}]`,
          type,
          targetRole:
            targetRole === 'ALL'
              ? null
              : targetRole,
          eventDate: date,
          eventTime: eventTime || null,
          location: location || null,
          isActive: false,
          priority,
          createdBy: auth.userId,
        },
      })

      return NextResponse.json(
        {
          success: true,
          kind,
          record: announcement,
        },
        { status: 201 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Record type must be RELIEF or EVENT',
      },
      { status: 400 },
    )
  } catch (error) {
    console.error(
      'Failed to save manual historical record:',
      error,
    )
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save historical record',
      },
      { status: 500 },
    )
  }
}
