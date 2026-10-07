export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createNotification } from '@/lib/notification-service'
import { requireRequestUser } from '@/lib/request-user-session'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'PENDING'

    const distributions = await db.reliefDistribution.findMany({
      where:
        status === 'ALL'
          ? undefined
          : { status },
      include: {
        vulnerableProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        household: true,
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      distributions,
    })
  } catch (error) {
    console.error('Error fetching relief distributions:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch distributions',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request, {
      allowedRoles: ['ADMIN'],
    })
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '')
      .trim()
      .toUpperCase()
    const reason = String(body.reason || '').trim()

    const rawIds = Array.isArray(body.distributionIds)
      ? body.distributionIds
      : body.distributionId
        ? [body.distributionId]
        : []

    const distributionIds = Array.from(
      new Set(
        rawIds
          .map((value: unknown) => String(value || '').trim())
          .filter(Boolean),
      ),
    ).slice(0, 500)

    if (
      distributionIds.length === 0 ||
      !['APPROVE', 'REJECT'].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Choose at least one distribution and a valid action.',
        },
        { status: 400 },
      )
    }

    if (action === 'REJECT' && !reason) {
      return NextResponse.json(
        {
          success: false,
          message: 'A rejection reason is required.',
        },
        { status: 400 },
      )
    }

    const transitionResults = await db.$transaction(
      distributionIds.map((id) =>
        db.reliefDistribution.updateMany({
          where: {
            id,
            status: 'PENDING',
          },
          data: {
            status:
              action === 'APPROVE'
                ? 'APPROVED'
                : 'REJECTED',
            rejectionReason:
              action === 'REJECT'
                ? reason
                : null,
          },
        }),
      ),
    )

    const updatedIds = distributionIds.filter(
      (_id, index) => transitionResults[index]?.count === 1,
    )

    if (updatedIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'None of the selected relief distributions are still pending.',
        },
        { status: 409 },
      )
    }

    const updatedDistributions =
      await db.reliefDistribution.findMany({
        where: {
          id: { in: updatedIds },
        },
        include: {
          vulnerableProfile: {
            include: {
              user: true,
            },
          },
        },
      })

    const notificationType =
      action === 'APPROVE'
        ? 'RELIEF_APPROVED'
        : 'RELIEF_REJECTED'

    const notificationResults =
      await Promise.allSettled(
        updatedDistributions
          .filter(
            (distribution) =>
              distribution.vulnerableProfile?.userId,
          )
          .map((distribution) =>
            createNotification({
              userId:
                distribution.vulnerableProfile!.userId,
              type: notificationType,
              reason:
                action === 'REJECT'
                  ? reason
                  : undefined,
              details: `${distribution.distributionType} - ${distribution.itemsProvided}`,
            }),
          ),
      )

    for (const result of notificationResults) {
      if (result.status === 'rejected') {
        console.error(
          'Relief approval notification failed:',
          result.reason,
        )
      }
    }

    return NextResponse.json({
      success: true,
      action,
      updatedCount: updatedIds.length,
      requestedCount: distributionIds.length,
      skippedCount:
        distributionIds.length - updatedIds.length,
      updatedIds,
      distributionIds: updatedIds,
    })
  } catch (error) {
    console.error('Error updating relief distribution:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update distribution',
      },
      { status: 500 },
    )
  }
}
