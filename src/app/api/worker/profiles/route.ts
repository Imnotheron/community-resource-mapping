export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

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
        registrationStatus: true,
        needsAssistance: true,
        createdAt: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return NextResponse.json({ success: true, profiles })
  } catch (error) {
    console.error('Error fetching worker profile directory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profiles' },
      { status: 500 },
    )
  }
}
