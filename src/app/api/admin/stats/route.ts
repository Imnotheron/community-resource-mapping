export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      db.vulnerableProfile.count(),
      db.vulnerableProfile.count({ where: { registrationStatus: 'PENDING' } }),
      db.vulnerableProfile.count({ where: { registrationStatus: 'APPROVED' } }),
      db.vulnerableProfile.count({ where: { registrationStatus: 'REJECTED' } })
    ])

    return NextResponse.json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
