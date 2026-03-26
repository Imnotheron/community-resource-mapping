import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get real-time active user count (users active in the last 5 minutes)
export async function GET(request: NextRequest) {
  try {
    // Define active time window (5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    // Get users who have been active in the last 5 minutes
    const totalActive = await db.user.count({
      where: {
        lastActive: {
          gte: fiveMinutesAgo
        }
      }
    })
    
    // Get active vulnerable users
    const activeVulnerable = await db.user.count({
      where: {
        lastActive: {
          gte: fiveMinutesAgo
        },
        role: 'VULNERABLE'
      }
    })
    
    // Get active workers
    const activeWorkers = await db.user.count({
      where: {
        lastActive: {
          gte: fiveMinutesAgo
        },
        role: 'WORKER'
      }
    })
    
    // Get active admins
    const activeAdmins = await db.user.count({
      where: {
        lastActive: {
          gte: fiveMinutesAgo
        },
        role: 'ADMIN'
      }
    })

    return NextResponse.json({
      success: true,
      activeUsers: {
        total: totalActive,
        vulnerable: activeVulnerable,
        workers: activeWorkers,
        admins: activeAdmins
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
