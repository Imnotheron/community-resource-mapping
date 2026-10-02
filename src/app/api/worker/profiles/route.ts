export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'
import { getVulnerableStatuses } from '@/lib/vulnerable-status'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['WORKER'],
    })
    if ('error' in auth) return auth.error

    const profiles = await db.vulnerableProfile.findMany({
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        barangay: true,
        vulnerabilityTypes: true,
        registrationStatus: true,
        needsAssistance: true,
        createdAt: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    const statuses = await getVulnerableStatuses(
      profiles.map((profile) => profile.id),
    )

    const withStatus = profiles.map((profile) => {
      const lifecycle = statuses.get(profile.id)

      return {
        ...profile,
        profileStatus: lifecycle?.status || 'ACTIVE',
        profileStatusReason: lifecycle?.reason || null,
        profileStatusUpdatedAt: lifecycle?.updatedAt || null,
      }
    })

    return NextResponse.json(
      { success: true, profiles: withStatus },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching worker profile directory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profiles' },
      { status: 500 },
    )
  }
}
