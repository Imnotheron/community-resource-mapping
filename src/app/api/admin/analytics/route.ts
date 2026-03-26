import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper function to convert BigInt to number in objects
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj)
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber)
  if (typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) {
      result[key] = convertBigIntToNumber(obj[key])
    }
    return result
  }
  return obj
}

// GET analytics data for admin dashboard
export async function GET(request: NextRequest) {
  try {
    // Get date range from query params (default: last 30 days)
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')
    
    // Validate the days parameter
    if (daysParam !== null) {
      const days = parseInt(daysParam, 10)
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(
          { success: false, error: 'Invalid days parameter. Must be a number between 1 and 365.' },
          { status: 400 }
        )
      }
    }
    
    const days = parseInt(daysParam || '30', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 1. Registration trends over time
    const registrationsByDate = await db.$queryRaw`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM VulnerableProfile
      WHERE createdAt >= ${startDate}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `

    // 2. Relief distribution trends
    const distributionsByDate = await db.$queryRaw`
      SELECT
        DATE(distributionDate) as date,
        COUNT(*) as count,
        SUM(quantity) as totalQuantity
      FROM ReliefDistribution
      WHERE distributionDate >= ${startDate}
      GROUP BY DATE(distributionDate)
      ORDER BY date DESC
    `

    // 3. Vulnerability type breakdown
    const vulnerabilityBreakdown = await db.vulnerableProfile.findMany({
      select: { vulnerabilityTypes: true }
    })

    const vulnerabilityCounts = vulnerabilityBreakdown.reduce((acc, profile) => {
      const types = JSON.parse(profile.vulnerabilityTypes || '[]')
      types.forEach((type: string) => {
        acc[type] = (acc[type] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    // 4. Distribution by type
    const distributionByType = await db.$queryRaw`
      SELECT
        distributionType,
        COUNT(*) as count,
        SUM(quantity) as totalQuantity
      FROM ReliefDistribution
      GROUP BY distributionType
      ORDER BY count DESC
    `

    // 5. Barangay statistics
    const barangayStats = await db.$queryRaw`
      SELECT
        barangay,
        COUNT(*) as totalProfiles,
        SUM(CASE WHEN registrationStatus = 'APPROVED' THEN 1 ELSE 0 END) as approved
      FROM VulnerableProfile
      WHERE barangay IS NOT NULL
      GROUP BY barangay
      ORDER BY totalProfiles DESC
    `

    // 6. Relief coverage by barangay
    const reliefCoverage = await db.$queryRaw`
      SELECT
        vp.barangay,
        COUNT(DISTINCT vp.id) as totalProfiles,
        COUNT(DISTINCT rd.vulnerableProfileId) as receivedRelief
      FROM VulnerableProfile vp
      LEFT JOIN ReliefDistribution rd ON rd.vulnerableProfileId = vp.id
      WHERE vp.registrationStatus = 'APPROVED' AND vp.barangay IS NOT NULL
      GROUP BY vp.barangay
      ORDER BY receivedRelief DESC
    `

    // 7. Feedback statistics
    const feedbackStats = await db.$queryRaw`
      SELECT
        status,
        COUNT(*) as count
      FROM ReliefFeedback
      GROUP BY status
    `

    return NextResponse.json({
      success: true,
      analytics: {
        registrationsByDate: convertBigIntToNumber(registrationsByDate),
        distributionsByDate: convertBigIntToNumber(distributionsByDate),
        vulnerabilityCounts,
        distributionByType: convertBigIntToNumber(distributionByType),
        barangayStats: convertBigIntToNumber(barangayStats),
        reliefCoverage: convertBigIntToNumber(reliefCoverage),
        feedbackStats: convertBigIntToNumber(feedbackStats),
        period: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days
        }
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
