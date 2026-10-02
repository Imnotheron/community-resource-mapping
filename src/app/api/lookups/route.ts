import { NextRequest, NextResponse } from 'next/server'

import {
  normalizeLookupGroup,
  readLookupOptions,
} from '@/lib/lookup-options'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const group = normalizeLookupGroup(
    request.nextUrl.searchParams.get('group'),
  )

  if (!group) {
    return NextResponse.json(
      { success: false, error: 'A valid lookup group is required' },
      { status: 400 },
    )
  }

  const options = (await readLookupOptions(group)).filter(
    (option) => option.isActive,
  )

  return NextResponse.json(
    { success: true, group, options },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
