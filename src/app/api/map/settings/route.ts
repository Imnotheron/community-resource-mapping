export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRequestUser } from '@/lib/request-user-session'
import {
  getMapReliefCycleSettings,
  updateMapReliefCycleSettings,
} from '@/lib/map-relief-cycle'

const settingsSchema = z.object({
  autoResetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
})

function parseResetDate(
  value: string | null,
) {
  if (!value) return null

  const date = new Date(
    `${value}T00:00:00+08:00`,
  )

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date
}

function dateInputValue(
  value: Date | null,
) {
  if (!value) return null

  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(value)
}

export async function GET(request: NextRequest) {
  try {
    const auth =
      await requireRequestUser(
        request,
        {
          allowedRoles: ['ADMIN'],
        },
      )

    if ('error' in auth) {
      return auth.error
    }

    const settings =
      await getMapReliefCycleSettings()

    return NextResponse.json(
      {
        success: true,
        autoResetDate:
          dateInputValue(
            settings.autoResetAt,
          ),
        autoResetAt:
          settings.autoResetAt,
        updatedAt:
          settings.updatedAt,
      },
      {
        headers: {
          'Cache-Control':
            'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error(
      'Error reading map reset settings:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to load map reset settings',
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth =
      await requireRequestUser(
        request,
        {
          allowedRoles: ['ADMIN'],
        },
      )

    if ('error' in auth) {
      return auth.error
    }

    const body =
      await request.json()

    const parsed =
      settingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Choose a valid automatic reset date, or clear it to disable the schedule.',
        },
        { status: 400 },
      )
    }

    const scheduledDate =
      parseResetDate(
        parsed.data.autoResetDate,
      )

    if (
      parsed.data.autoResetDate &&
      !scheduledDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Choose a valid automatic reset date.',
        },
        { status: 400 },
      )
    }

    if (scheduledDate) {
      const todayStart =
        parseResetDate(
          dateInputValue(
            new Date(),
          ),
        )

      if (
        todayStart &&
        scheduledDate <
          todayStart
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Automatic reset date cannot be in the past.',
          },
          { status: 400 },
        )
      }
    }

    const settings =
      await updateMapReliefCycleSettings(
        scheduledDate,
        auth.userId,
      )

    return NextResponse.json(
      {
        success: true,
        autoResetDate:
          dateInputValue(
            settings.autoResetAt,
          ),
        autoResetAt:
          settings.autoResetAt,
        updatedAt:
          settings.updatedAt,
      },
      {
        headers: {
          'Cache-Control':
            'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error(
      'Error updating map reset settings:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to update map reset settings',
      },
      { status: 500 },
    )
  }
}
