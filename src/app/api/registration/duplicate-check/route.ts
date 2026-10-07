export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { requireRequestUser } from '@/lib/request-user-session'
import { findVulnerableRegistrationDuplicates } from '@/lib/vulnerable-duplicate-check'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN', 'WORKER'],
    })
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const result =
      await findVulnerableRegistrationDuplicates(body)

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error(
      'Failed to check vulnerable registration duplicates:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'Unable to check for duplicate registrations right now. Please try again before confirming.',
      },
      { status: 500 },
    )
  }
}
