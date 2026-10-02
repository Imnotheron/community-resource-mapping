import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  ensureLookupOptionsTable,
  normalizeLookupGroup,
  readLookupOptions,
} from '@/lib/lookup-options'
import { requireRequestUser } from '@/lib/request-user-session'

async function requireAdmin(request: NextRequest) {
  return requireRequestUser(request, {
    allowedRoles: ['ADMIN'],
  })
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const group = request.nextUrl.searchParams.get('group')
  const normalized = group ? normalizeLookupGroup(group) : null

  if (group && !normalized) {
    return NextResponse.json(
      { success: false, error: 'Invalid lookup group' },
      { status: 400 },
    )
  }

  return NextResponse.json({
    success: true,
    options: await readLookupOptions(normalized),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const group = normalizeLookupGroup(body.group)
  const label = String(body.label || '').trim().slice(0, 120)

  if (!group || !label) {
    return NextResponse.json(
      { success: false, error: 'Group and label are required' },
      { status: 400 },
    )
  }

  await ensureLookupOptionsTable()

  try {
    await db.$executeRawUnsafe(
      `INSERT INTO "LookupOption"
        ("id", "groupName", "value", "label", "isActive", "sortOrder")
       VALUES (?, ?, ?, ?, 1, ?)`,
      crypto.randomUUID(),
      group,
      label,
      label,
      Number.isFinite(Number(body.sortOrder))
        ? Number(body.sortOrder)
        : 999,
    )
  } catch {
    return NextResponse.json(
      { success: false, error: 'That option already exists' },
      { status: 409 },
    )
  }

  return NextResponse.json({
    success: true,
    options: await readLookupOptions(group),
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const id = String(body.id || '').trim()
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Option ID is required' },
      { status: 400 },
    )
  }

  await ensureLookupOptionsTable()

  const label = String(body.label || '').trim().slice(0, 120)
  const active =
    typeof body.isActive === 'boolean'
      ? body.isActive
      : true
  const sortOrder = Number.isFinite(Number(body.sortOrder))
    ? Number(body.sortOrder)
    : 999

  await db.$executeRawUnsafe(
    `UPDATE "LookupOption"
     SET "label" = COALESCE(NULLIF(?, ''), "label"),
         "value" = COALESCE(NULLIF(?, ''), "value"),
         "isActive" = ?,
         "sortOrder" = ?,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ?`,
    label,
    label,
    active ? 1 : 0,
    sortOrder,
    id,
  )

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const id = String(
    request.nextUrl.searchParams.get('id') || '',
  ).trim()

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Option ID is required' },
      { status: 400 },
    )
  }

  await ensureLookupOptionsTable()
  await db.$executeRawUnsafe(
    `UPDATE "LookupOption"
     SET "isActive" = 0,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ?`,
    id,
  )

  return NextResponse.json({ success: true })
}
