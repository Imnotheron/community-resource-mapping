export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')

    if (daysParam !== null) {
      const parsedDays = parseInt(daysParam, 10)
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid days parameter. Must be a number between 1 and 365.',
          },
          { status: 400 },
        )
      }
    }

    const days = parseInt(daysParam || '30', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const registrationsByDate = await db.$queryRaw`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM VulnerableProfile
      WHERE createdAt >= ${startDate}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `

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

    const vulnerabilityBreakdown = await db.vulnerableProfile.findMany({
      select: { vulnerabilityTypes: true },
    })

    const vulnerabilityCounts = vulnerabilityBreakdown.reduce((acc, profile) => {
      let types: string[] = []

      try {
        const parsed = JSON.parse(profile.vulnerabilityTypes || '[]')
        types = Array.isArray(parsed) ? parsed : []
      } catch {
        types = []
      }

      types.forEach((type) => {
        acc[type] = (acc[type] || 0) + 1
      })

      return acc
    }, {} as Record<string, number>)

    const distributionByTypeRows = convertBigIntToNumber(
      await db.$queryRaw`
        SELECT
          distributionType,
          COUNT(*) as count,
          SUM(quantity) as totalQuantity
        FROM ReliefDistribution
        GROUP BY distributionType
        ORDER BY count DESC
      `,
    ) as Array<{
      distributionType?: string | null
      count?: number | null
      totalQuantity?: number | null
    }>

    const barangayStats = convertBigIntToNumber(
      await db.$queryRaw`
        SELECT
          barangay,
          COUNT(*) as totalProfiles,
          SUM(CASE WHEN registrationStatus = 'APPROVED' THEN 1 ELSE 0 END) as approved
        FROM VulnerableProfile
        WHERE barangay IS NOT NULL
        GROUP BY barangay
        ORDER BY totalProfiles DESC
      `,
    )

    const reliefCoverageByBarangay = convertBigIntToNumber(
      await db.$queryRaw`
        SELECT
          vp.barangay,
          COUNT(DISTINCT vp.id) as totalProfiles,
          COUNT(DISTINCT rd.vulnerableProfileId) as receivedRelief
        FROM VulnerableProfile vp
        LEFT JOIN ReliefDistribution rd ON rd.vulnerableProfileId = vp.id
        WHERE vp.registrationStatus = 'APPROVED' AND vp.barangay IS NOT NULL
        GROUP BY vp.barangay
        ORDER BY receivedRelief DESC
      `,
    ) as Array<{
      barangay?: string | null
      totalProfiles?: number | null
      receivedRelief?: number | null
    }>

    const feedbackStatusRows = convertBigIntToNumber(
      await db.$queryRaw`
        SELECT
          status,
          COUNT(*) as count
        FROM ReliefFeedback
        GROUP BY status
      `,
    ) as Array<{
      status?: string | null
      count?: number | null
    }>

    const distributionByType = distributionByTypeRows.reduce(
      (result, row) => {
        const key = String(row.distributionType || 'Other')
        result[key] = Number(row.count || 0)
        return result
      },
      {} as Record<string, number>,
    )

    const reliefCoverage = {
      totalDistributions: distributionByTypeRows.reduce(
        (sum, row) => sum + Number(row.count || 0),
        0,
      ),
      totalQuantity: distributionByTypeRows.reduce(
        (sum, row) => sum + Number(row.totalQuantity || 0),
        0,
      ),
      barangays: reliefCoverageByBarangay,
    }

    const feedbackStats = feedbackStatusRows.reduce(
      (result, row) => {
        const status = String(row.status || 'UNKNOWN').trim().toUpperCase()
        const count = Number(row.count || 0)

        result.total += count

        if (status === 'SUBMITTED' || status === 'PENDING' || status === 'OPEN') {
          result.submitted += count
        }

        if (status === 'IN_PROGRESS' || status === 'IN PROGRESS') {
          result.inProgress += count
        }

        if (status === 'RESOLVED' || status === 'CLOSED' || status === 'COMPLETED') {
          result.resolved += count
        }

        return result
      },
      {
        total: 0,
        submitted: 0,
        inProgress: 0,
        resolved: 0,
        statuses: feedbackStatusRows,
      },
    )

    return NextResponse.json({
      success: true,
      analytics: {
        registrationsByDate: convertBigIntToNumber(registrationsByDate),
        distributionsByDate: convertBigIntToNumber(distributionsByDate),
        vulnerabilityCounts,
        distributionByType,
        distributionTypeDetails: distributionByTypeRows,
        barangayStats,
        reliefCoverage,
        feedbackStats,
        period: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 },
    )
  }
}
