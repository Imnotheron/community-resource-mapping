import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'
import {
  VULNERABLE_PROFILE_STATUSES,
  setVulnerableStatus,
} from '@/lib/vulnerable-status'

const StatusSchema = z.object({
  status: z.enum(VULNERABLE_PROFILE_STATUSES),
  reason: z.string().trim().max(500).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRequestUser(request, {
    allowedRoles: ['ADMIN'],
  })
  if ('error' in auth) return auth.error

  const { id } = await context.params
  const profile = await db.vulnerableProfile.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!profile) {
    return NextResponse.json(
      { success: false, error: 'Vulnerable profile not found' },
      { status: 404 },
    )
  }

  const parsed = StatusSchema.safeParse(
    await request.json().catch(() => ({})),
  )

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid vulnerable status update',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const result = await setVulnerableStatus({
    profileId: id,
    status: parsed.data.status,
    reason: parsed.data.reason || null,
    updatedBy: auth.userId,
  })

  return NextResponse.json({
    success: true,
    profileStatus: result,
  })
}
