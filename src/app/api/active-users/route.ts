import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get count of all users with vulnerable profiles that are approved
    const totalUsers = await db.user.count()
    
    // Get count of approved vulnerable profiles
    const approvedProfiles = await db.vulnerableProfile.count({
      where: {
        registrationStatus: 'APPROVED'
      }
    })
    
    // Get count of admin users
    const adminCount = await db.user.count({
      where: {
        role: 'ADMIN'
      }
    })
    
    // Get count of worker users
    const workerCount = await db.user.count({
      where: {
        role: 'WORKER'
      }
    })

    // Get count of vulnerable users
    const vulnerableCount = await db.user.count({
      where: {
        role: 'VULNERABLE'
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        total: totalUsers,
        approvedProfiles,
        admins: adminCount,
        workers: workerCount,
        vulnerable: vulnerableCount
      }
    })
  } catch (error) {
    console.error('Error fetching active users:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch active users' },
      { status: 500 }
    )
  }
}
