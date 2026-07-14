export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  sendVulnerableRegistrationApprovedEmail,
  sendVulnerableRegistrationRejectedEmail,
} from '@/lib/email'
import { createNotification } from '@/lib/notification-service'

type RecordType = 'REGISTRATION' | 'DISTRIBUTION'
type RecordAction = 'APPROVE' | 'REJECT'

function normalizeRole(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

async function requireAdmin(request: NextRequest) {
  const adminId = request.headers.get('x-user-id')

  if (!adminId) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Administrator ID is required' },
        { status: 401 },
      ),
    }
  }

  const admin = await db.user.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!admin || normalizeRole(admin.role) !== 'ADMIN') {
    return {
      error: NextResponse.json(
        { success: false, error: 'Administrator access is required' },
        { status: 403 },
      ),
    }
  }

  return { admin }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const [registrations, distributions] = await Promise.all([
      db.vulnerableProfile.findMany({
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
          mobileNumber: true,
          emailAddress: true,
          barangay: true,
          municipality: true,
          province: true,
          vulnerabilityTypes: true,
          registrationStatus: true,
          rejectionReason: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.reliefDistribution.findMany({
        select: {
          id: true,
          distributionDate: true,
          distributionType: true,
          itemsProvided: true,
          quantity: true,
          notes: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
          worker: {
            select: { id: true, name: true, email: true },
          },
          vulnerableProfile: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              suffix: true,
              barangay: true,
              municipality: true,
              province: true,
              mobileNumber: true,
              userId: true,
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
          household: {
            select: {
              id: true,
              address: true,
              barangay: true,
              headOfHousehold: true,
              totalMembers: true,
              vulnerableMembers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      admin: auth.admin,
      registrations,
      distributions,
    })
  } catch (error) {
    console.error('Approval Center load error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load Approval Center records',
        ...(process.env.NODE_ENV !== 'production'
          ? { details: error instanceof Error ? error.message : String(error) }
          : {}),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const body = await request.json()
    const type = String(body.type || '').toUpperCase() as RecordType
    const action = String(body.action || '').toUpperCase() as RecordAction
    const reason = String(body.reason || '').trim()
    const ids = Array.isArray(body.ids)
      ? Array.from(
          new Set(
            body.ids
              .map((id: unknown) => String(id || '').trim())
              .filter(Boolean),
          ),
        )
      : []

    if (type !== 'REGISTRATION' && type !== 'DISTRIBUTION') {
      return NextResponse.json(
        { success: false, error: 'Invalid record type' },
        { status: 400 },
      )
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { success: false, error: 'Invalid approval action' },
        { status: 400 },
      )
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Select at least one record' },
        { status: 400 },
      )
    }

    if (ids.length > 500) {
      return NextResponse.json(
        { success: false, error: 'A maximum of 500 records can be processed at once' },
        { status: 400 },
      )
    }

    if (action === 'REJECT' && !reason) {
      return NextResponse.json(
        { success: false, error: 'A rejection reason is required' },
        { status: 400 },
      )
    }

    if (type === 'REGISTRATION') {
      const records = await db.vulnerableProfile.findMany({
        where: {
          id: { in: ids },
          registrationStatus: 'PENDING',
        },
        include: { user: true },
      })

      if (records.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No pending registrations were selected' },
          { status: 409 },
        )
      }

      const result = await db.vulnerableProfile.updateMany({
        where: {
          id: { in: records.map((record) => record.id) },
          registrationStatus: 'PENDING',
        },
        data: {
          registrationStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          rejectionReason: action === 'REJECT' ? reason : null,
        },
      })

      const jobs = records
        .filter((record) => Boolean(record.user?.email))
        .map((record) => {
          const name = [
            record.firstName,
            record.middleName,
            record.lastName,
            record.suffix,
          ]
            .filter(Boolean)
            .join(' ')

          return action === 'APPROVE'
            ? sendVulnerableRegistrationApprovedEmail(record.user.email, name)
            : sendVulnerableRegistrationRejectedEmail(
                record.user.email,
                name,
                reason,
              )
        })

      void Promise.allSettled(jobs)

      return NextResponse.json({
        success: true,
        processed: result.count,
        message: `${result.count} registration${
          result.count === 1 ? '' : 's'
        } ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      })
    }

    const records = await db.reliefDistribution.findMany({
      where: {
        id: { in: ids },
        status: 'PENDING',
      },
      include: { vulnerableProfile: true },
    })

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending distributions were selected' },
        { status: 409 },
      )
    }

    const result = await db.reliefDistribution.updateMany({
      where: {
        id: { in: records.map((record) => record.id) },
        status: 'PENDING',
      },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        rejectionReason: action === 'REJECT' ? reason : null,
      },
    })

    const jobs = records
      .filter((record) => Boolean(record.vulnerableProfile?.userId))
      .map((record) =>
        createNotification({
          userId: record.vulnerableProfile!.userId,
          type: action === 'APPROVE' ? 'RELIEF_APPROVED' : 'RELIEF_REJECTED',
          reason: action === 'REJECT' ? reason : undefined,
          details: `${record.distributionType} - ${record.itemsProvided}`,
        }),
      )

    void Promise.allSettled(jobs)

    return NextResponse.json({
      success: true,
      processed: result.count,
      message: `${result.count} distribution${
        result.count === 1 ? '' : 's'
      } ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
    })
  } catch (error) {
    console.error('Approval Center action error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process selected records',
        ...(process.env.NODE_ENV !== 'production'
          ? { details: error instanceof Error ? error.message : String(error) }
          : {}),
      },
      { status: 500 },
    )
  }
}
