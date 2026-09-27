export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

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
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

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
    startDate.setHours(0, 0, 0, 0)
    startDate.setDate(
      startDate.getDate() - (days - 1),
    )

    const registrationsByDate = await db.$queryRaw`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM VulnerableProfile
      WHERE createdAt >= ${startDate}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `

    const distributionsByDate = await db.$queryRaw`
      SELECT
        DATE(distributionDate) as date,
        COUNT(*) as count,
        SUM(quantity) as totalQuantity
      FROM ReliefDistribution
      WHERE distributionDate >= ${startDate}
        AND status IN ('APPROVED', 'DISTRIBUTED')
      GROUP BY DATE(distributionDate)
      ORDER BY date ASC
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
        WHERE status IN ('APPROVED', 'DISTRIBUTED')
          AND distributionDate >= ${startDate}
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
        LEFT JOIN ReliefDistribution rd
          ON rd.vulnerableProfileId = vp.id
          AND rd.status IN ('APPROVED', 'DISTRIBUTED')
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
        WHERE createdAt >= ${startDate}
        GROUP BY status
      `,
    ) as Array<{
      status?: string | null
      count?: number | null
    }>

    const distributionStatusRows = convertBigIntToNumber(
      await db.$queryRaw`
        SELECT
          status,
          COUNT(*) as count,
          SUM(quantity) as totalQuantity
        FROM ReliefDistribution
        WHERE distributionDate >= ${startDate}
        GROUP BY status
        ORDER BY status ASC
      `,
    ) as Array<{
      status?: string | null
      count?: number | null
      totalQuantity?: number | null
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
        distributionStatusRows,
        accuracyRules: {
          reliefCoverageStatuses: ['APPROVED', 'DISTRIBUTED'],
          note:
            'The selected period includes today and starts at local server-day midnight. Distribution trend, delivered-relief totals, and distribution types count only approved or distributed records inside the period. Feedback totals are also period-scoped. Pending and rejected distributions remain visible only in period status totals. Vulnerability breakdown is a current profile-category snapshot and can count one person in multiple categories.',
        },
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
