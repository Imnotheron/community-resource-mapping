export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRequestUser } from '@/lib/request-user-session'
import {
  getMapReliefCycleSettings,
  updateMapReliefCycleSettings,
} from '@/lib/map-relief-cycle'

const settingsSchema = z.object({
  resetIntervalDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const settings =
      await getMapReliefCycleSettings()

    return NextResponse.json(
      {
        success: true,
        resetIntervalDays:
          settings.resetIntervalDays,
        updatedAt: settings.updatedAt,
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
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const body =
      await request.json()

    const parsed =
      settingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Reset interval must be between 1 and 365 days, or disabled.',
        },
        { status: 400 },
      )
    }

    const settings =
      await updateMapReliefCycleSettings(
        parsed.data.resetIntervalDays,
        auth.userId,
      )

    return NextResponse.json(
      {
        success: true,
        resetIntervalDays:
          settings.resetIntervalDays,
        updatedAt: settings.updatedAt,
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
