export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

type ChatMessage = {
  role?: string
  content?: string
}

function cleanText(value: unknown, max = 2000) {
  return String(value || '').trim().slice(0, max)
}

async function buildLiveSystemContext({
  role,
  userId,
  activeView,
  activeViewLabel,
}: {
  role: string
  userId: string
  activeView: string
  activeViewLabel: string
}) {
  const pageContext = [
    `Current CRMS page id: ${activeView || 'unknown'}`,
    `Current CRMS page label: ${activeViewLabel || 'unknown'}`,
  ]

  if (role === 'ADMIN') {
    const [
      totalUsers,
      admins,
      workers,
      vulnerableUsers,
      pendingRegistrations,
      approvedRegistrations,
      rejectedRegistrations,
      pendingRelief,
      approvedRelief,
      rejectedRelief,
      activeAnnouncements,
      openFeedback,
      resources,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'ADMIN' } }),
      db.user.count({ where: { role: 'WORKER' } }),
      db.user.count({ where: { role: 'VULNERABLE' } }),
      db.vulnerableProfile.count({
        where: { registrationStatus: 'PENDING' },
      }),
      db.vulnerableProfile.count({
        where: { registrationStatus: 'APPROVED' },
      }),
      db.vulnerableProfile.count({
        where: { registrationStatus: 'REJECTED' },
      }),
      db.reliefDistribution.count({
        where: { status: 'PENDING' },
      }),
      db.reliefDistribution.count({
        where: { status: { in: ['APPROVED', 'DISTRIBUTED'] } },
      }),
      db.reliefDistribution.count({
        where: { status: 'REJECTED' },
      }),
      db.announcement.count({ where: { isActive: true } }),
      db.feedback.count({
        where: {
          status: {
            in: ['SUBMITTED', 'PENDING', 'OPEN', 'IN_PROGRESS'],
          },
        },
      }),
      db.communityResource.count({ where: { isActive: true } }),
    ])

    return [
      ...pageContext,
      'Live role scope: Administrator.',
      `Users currently recorded: ${totalUsers} total — ${admins} Admin, ${workers} Worker, ${vulnerableUsers} Vulnerable.`,
      `Vulnerable registrations: ${pendingRegistrations} pending, ${approvedRegistrations} approved, ${rejectedRegistrations} rejected.`,
      `Relief records: ${pendingRelief} pending, ${approvedRelief} approved/distributed, ${rejectedRelief} rejected.`,
      `Active announcements: ${activeAnnouncements}.`,
      `Open/submitted feedback records: ${openFeedback}.`,
      `Active community resources: ${resources}.`,
    ].join('\n')
  }

  if (role === 'WORKER') {
    const [
      myReliefRecords,
      myPendingRelief,
      myDeliveredRelief,
      myRejectedRelief,
      myFieldNotes,
      visibleAnnouncements,
    ] = await Promise.all([
      db.reliefDistribution.count({
        where: { workerId: userId },
      }),
      db.reliefDistribution.count({
        where: { workerId: userId, status: 'PENDING' },
      }),
      db.reliefDistribution.count({
        where: {
          workerId: userId,
          status: { in: ['APPROVED', 'DISTRIBUTED'] },
        },
      }),
      db.reliefDistribution.count({
        where: { workerId: userId, status: 'REJECTED' },
      }),
      db.fieldNote.count({ where: { userId } }),
      db.announcement.count({
        where: {
          isActive: true,
          OR: [
            { targetRole: null },
            { targetRole: 'ALL' },
            { targetRole: 'WORKER' },
          ],
        },
      }),
    ])

    return [
      ...pageContext,
      'Live role scope: Worker. Only the signed-in Worker\'s operational totals are included here.',
      `Your relief records: ${myReliefRecords} total — ${myPendingRelief} pending, ${myDeliveredRelief} approved/distributed, ${myRejectedRelief} rejected.`,
      `Your field notes: ${myFieldNotes}.`,
      `Active announcements visible to Workers: ${visibleAnnouncements}.`,
    ].join('\n')
  }

  const profile = await db.vulnerableProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      registrationStatus: true,
      barangay: true,
      needsAssistance: true,
      assistanceType: true,
    },
  })

  const [
    reliefRecords,
    deliveredRelief,
    feedbackCount,
    visibleAnnouncements,
  ] = await Promise.all([
    profile
      ? db.reliefDistribution.count({
          where: { vulnerableProfileId: profile.id },
        })
      : Promise.resolve(0),
    profile
      ? db.reliefDistribution.count({
          where: {
            vulnerableProfileId: profile.id,
            status: { in: ['APPROVED', 'DISTRIBUTED'] },
          },
        })
      : Promise.resolve(0),
    db.feedback.count({ where: { userId } }),
    db.announcement.count({
      where: {
        isActive: true,
        OR: [
          { targetRole: null },
          { targetRole: 'ALL' },
          { targetRole: 'VULNERABLE' },
        ],
      },
    }),
  ])

  return [
    ...pageContext,
    'Live role scope: Vulnerable Citizen. Only the signed-in citizen\'s own profile-level operational context is included here.',
    `Registration status: ${profile?.registrationStatus || 'No vulnerable profile found'}.`,
    `Barangay: ${profile?.barangay || 'Not recorded'}.`,
    `Needs assistance: ${profile ? (profile.needsAssistance ? 'Yes' : 'No') : 'Unknown'}.`,
    `Assistance type: ${profile?.assistanceType || 'Not recorded'}.`,
    `Your relief records: ${reliefRecords} total, ${deliveredRelief} approved/distributed.`,
    `Your feedback records: ${feedbackCount}.`,
    `Active announcements visible to Vulnerable Citizens: ${visibleAnnouncements}.`,
  ].join('\n')

}

const QUERY_STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'anything',
  'available',
  'can',
  'could',
  'current',
  'data',
  'database',
  'does',
  'find',
  'from',
  'give',
  'have',
  'inside',
  'into',
  'know',
  'list',
  'me',
  'record',
  'records',
  'show',
  'system',
  'tell',
  'that',
  'the',
  'their',
  'there',
  'these',
  'this',
  'what',
  'where',
  'which',
  'with',
  'would',
  'any',
  'are',
  'check',
  'do',
  'does',
  'in',
  'is',
  'it',
  'look',
  'lookup',
  'please',
  'search',
  'user',
  'users',
  'we',
])

function queryTerms(message: string) {
  return [
    ...new Set(
      message
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          '',
        )
        .toLowerCase()
        .replace(/[^a-z0-9@._-]+/g, ' ')
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(
          (term) =>
            term.length >= 3 &&
            !QUERY_STOPWORDS.has(term),
        ),
    ),
  ].slice(0, 8)
}

function mentions(
  message: string,
  keywords: string[],
) {
  const normalized = message.toLowerCase()

  return keywords.some((keyword) =>
    normalized.includes(keyword),
  )
}

function compactJson(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) =>
      item instanceof Date
        ? item.toISOString()
        : item,
  )
}

function normalizeLookupText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchScore(
  searchable: string,
  terms: string[],
) {
  if (terms.length === 0) return 0

  const normalized =
    normalizeLookupText(searchable)

  return terms.reduce(
    (score, term) =>
      normalized.includes(
        normalizeLookupText(term),
      )
        ? score + 1
        : score,
    0,
  )
}

function rankMatches<T>(
  rows: T[],
  terms: string[],
  searchable: (row: T) => string,
  limit = 30,
) {
  if (terms.length === 0) {
    return rows.slice(0, limit)
  }

  return rows
    .map((row) => ({
      row,
      score: matchScore(
        searchable(row),
        terms,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score,
    )
    .slice(0, limit)
    .map(({ row }) => row)
}

async function buildQueryAwareContext({
  role,
  userId,
  message,
}: {
  role: string
  userId: string
  message: string
}) {
  const terms = queryTerms(message)
  const broadDataQuestion = mentions(message, [
    'what data',
    'what is inside',
    'what\'s inside',
    'everything',
    'all data',
    'all records',
    'database',
    'system data',
    'system records',
    'overview',
  ])

  if (role === 'ADMIN') {
    const counts = await Promise.all([
      db.user.count(),
      db.vulnerableProfile.count(),
      db.household.count(),
      db.reliefDistribution.count(),
      db.announcement.count(),
      db.feedback.count(),
      db.reliefFeedback.count(),
      db.communityResource.count(),
      db.fieldNote.count(),
      db.notification.count(),
      db.adminSignupRequest.count(),
      db.vulnerableRegistrationDraft.count(),
      db.vulnerabilityDocument.count(),
    ])

    const catalog = {
      users: counts[0],
      vulnerableProfiles: counts[1],
      households: counts[2],
      reliefDistributions: counts[3],
      announcements: counts[4],
      generalFeedback: counts[5],
      reliefFeedback: counts[6],
      communityResources: counts[7],
      fieldNotes: counts[8],
      notifications: counts[9],
      adminSignupRequests: counts[10],
      registrationDrafts: counts[11],
      vulnerabilityDocuments: counts[12],
    }

    const wantsUsers =
      broadDataQuestion ||
      terms.length > 0 ||
      mentions(message, [
        'user',
        'account',
        'admin',
        'worker',
        'email',
        'phone',
      ])
    const wantsProfiles =
      broadDataQuestion ||
      terms.length > 0 ||
      mentions(message, [
        'vulnerable',
        'citizen',
        'profile',
        'registration',
        'pwd',
        'senior',
        'barangay',
        'assistance',
      ])
    const wantsRelief =
      broadDataQuestion ||
      mentions(message, [
        'relief',
        'distribution',
        'goods',
        'history',
        'operation',
      ])
    const wantsAnnouncements =
      broadDataQuestion ||
      mentions(message, [
        'announcement',
        'event',
        'activity',
        'notice',
      ])
    const wantsFeedback =
      broadDataQuestion ||
      mentions(message, [
        'feedback',
        'concern',
        'complaint',
      ])
    const wantsResources =
      broadDataQuestion ||
      mentions(message, [
        'resource',
        'facility',
        'center',
        'map',
      ])
    const wantsAdminRequests =
      broadDataQuestion ||
      mentions(message, [
        'signup',
        'admin request',
        'approval request',
      ])
    const wantsHouseholds =
      broadDataQuestion ||
      mentions(message, [
        'household',
        'house',
        'family',
        'address',
        'member',
      ])
    const wantsFieldNotes =
      broadDataQuestion ||
      mentions(message, [
        'field note',
        'field notes',
        'note',
      ])
    const wantsNotifications =
      broadDataQuestion ||
      mentions(message, [
        'notification',
        'notifications',
        'notified',
      ])
    const wantsDrafts =
      broadDataQuestion ||
      mentions(message, [
        'draft',
        'drafts',
        'unfinished registration',
      ])
    const wantsDocuments =
      broadDataQuestion ||
      mentions(message, [
        'document',
        'documents',
        'uploaded file',
        'proof',
      ])

    const reliefWhere =
      terms.length > 0
        ? {
            OR: terms.flatMap((term) => [
              { distributionType: { contains: term } },
              { itemsProvided: { contains: term } },
              { notes: { contains: term } },
              { status: { contains: term.toUpperCase() } },
              {
                worker: {
                  name: { contains: term },
                },
              },
              {
                vulnerableProfile: {
                  OR: [
                    { firstName: { contains: term } },
                    { lastName: { contains: term } },
                    { barangay: { contains: term } },
                  ],
                },
              },
            ]),
          }
        : undefined

    const announcementWhere =
      terms.length > 0
        ? {
            OR: terms.flatMap((term) => [
              { title: { contains: term } },
              { content: { contains: term } },
              { type: { contains: term } },
              { location: { contains: term } },
              { priority: { contains: term.toUpperCase() } },
            ]),
          }
        : undefined

    const feedbackWhere =
      terms.length > 0
        ? {
            OR: terms.flatMap((term) => [
              { subject: { contains: term } },
              { message: { contains: term } },
              { status: { contains: term.toUpperCase() } },
              {
                user: {
                  OR: [
                    { name: { contains: term } },
                    { email: { contains: term } },
                  ],
                },
              },
            ]),
          }
        : undefined

    const resourceWhere =
      terms.length > 0
        ? {
            OR: terms.flatMap((term) => [
              { name: { contains: term } },
              { type: { contains: term } },
              { address: { contains: term } },
              { barangay: { contains: term } },
            ]),
          }
        : undefined

    const sections: string[] = [
      'ADMIN DATABASE CATALOG: ' +
        compactJson(catalog),
    ]

    const tasks: Promise<void>[] = []

    if (wantsUsers) {
      tasks.push(
        db.user
          .findMany({
            orderBy: {
              updatedAt: 'desc',
            },
            take: 250,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              phone: true,
              isOnline: true,
              lastSeenAt: true,
              createdAt: true,
              updatedAt: true,
            },
          })
          .then((allRows) => {
            const rows =
              broadDataQuestion
                ? allRows.slice(0, 50)
                : rankMatches(
                    allRows,
                    terms,
                    (row) =>
                      [
                        row.name,
                        row.email,
                        row.phone,
                        row.role,
                      ]
                        .filter(Boolean)
                        .join(' '),
                    40,
                  )

            sections.push(
              'AUTHORITATIVE USER MATCHES (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsProfiles) {
      tasks.push(
        db.vulnerableProfile
          .findMany({
            orderBy: {
              updatedAt: 'desc',
            },
            take: 250,
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              suffix: true,
              gender: true,
              civilStatus: true,
              mobileNumber: true,
              emailAddress: true,
              barangay: true,
              municipality: true,
              province: true,
              registrationStatus: true,
              vulnerabilityTypes: true,
              needsAssistance: true,
              assistanceType: true,
              latitude: true,
              longitude: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                  email: true,
                  phone: true,
                },
              },
            },
          })
          .then((allRows) => {
            const rows =
              broadDataQuestion
                ? allRows.slice(0, 50)
                : rankMatches(
                    allRows,
                    terms,
                    (row) =>
                      [
                        row.firstName,
                        row.middleName,
                        row.lastName,
                        row.suffix,
                        row.emailAddress,
                        row.mobileNumber,
                        row.barangay,
                        row.registrationStatus,
                        row.vulnerabilityTypes,
                        row.assistanceType,
                        row.user?.name,
                        row.user?.email,
                        row.user?.phone,
                      ]
                        .filter(Boolean)
                        .join(' '),
                    40,
                  )

            sections.push(
              'AUTHORITATIVE VULNERABLE PROFILE MATCHES (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsRelief) {
      tasks.push(
        db.reliefDistribution
          .findMany({
            where: reliefWhere,
            orderBy: {
              distributionDate: 'desc',
            },
            take: broadDataQuestion ? 20 : 30,
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
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              vulnerableProfile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  barangay: true,
                },
              },
            },
          })
          .then((rows) => {
            sections.push(
              'RELIEF LOOKUP (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsAnnouncements) {
      tasks.push(
        db.announcement
          .findMany({
            where: announcementWhere,
            orderBy: { createdAt: 'desc' },
            take: broadDataQuestion ? 15 : 25,
            select: {
              id: true,
              title: true,
              content: true,
              type: true,
              targetRole: true,
              eventDate: true,
              eventTime: true,
              location: true,
              isActive: true,
              priority: true,
              createdAt: true,
              updatedAt: true,
            },
          })
          .then((rows) => {
            sections.push(
              'ANNOUNCEMENT / EVENT LOOKUP (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsFeedback) {
      tasks.push(
        Promise.all([
          db.feedback.findMany({
            where: feedbackWhere,
            orderBy: { createdAt: 'desc' },
            take: broadDataQuestion ? 15 : 25,
            select: {
              id: true,
              type: true,
              subject: true,
              message: true,
              status: true,
              adminResponse: true,
              adminResponseDate: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          }),
          db.reliefFeedback.findMany({
            orderBy: { createdAt: 'desc' },
            take: broadDataQuestion ? 10 : 20,
            select: {
              id: true,
              feedbackType: true,
              message: true,
              status: true,
              adminResponse: true,
              adminResponseDate: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              reliefDistribution: {
                select: {
                  id: true,
                  distributionDate: true,
                  distributionType: true,
                  status: true,
                },
              },
            },
          }),
        ]).then(([general, relief]) => {
          sections.push(
            'GENERAL FEEDBACK LOOKUP (' +
              general.length +
              ' rows): ' +
              compactJson(general),
          )
          sections.push(
            'RELIEF FEEDBACK LOOKUP (' +
              relief.length +
              ' rows): ' +
              compactJson(relief),
          )
        }),
      )
    }

    if (wantsResources) {
      tasks.push(
        db.communityResource
          .findMany({
            where: resourceWhere,
            orderBy: { updatedAt: 'desc' },
            take: broadDataQuestion ? 20 : 30,
            select: {
              id: true,
              name: true,
              type: true,
              address: true,
              barangay: true,
              latitude: true,
              longitude: true,
              capacity: true,
              contactInfo: true,
              isActive: true,
              updatedAt: true,
            },
          })
          .then((rows) => {
            sections.push(
              'COMMUNITY RESOURCE LOOKUP (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsAdminRequests) {
      tasks.push(
        db.adminSignupRequest
          .findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
              reason: true,
              status: true,
              rejectionReason: true,
              reviewedAt: true,
              createdAt: true,
            },
          })
          .then((rows) => {
            sections.push(
              'ADMIN SIGNUP REQUEST LOOKUP (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsHouseholds) {
      tasks.push(
        db.household
          .findMany({
            orderBy: {
              updatedAt: 'desc',
            },
            take:
              broadDataQuestion
                ? 30
                : 50,
            select: {
              id: true,
              address: true,
              barangay: true,
              latitude: true,
              longitude: true,
              headOfHousehold: true,
              totalMembers: true,
              vulnerableMembers: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
              assignedWorker: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              vulnerableProfile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  registrationStatus: true,
                },
              },
            },
          })
          .then((allRows) => {
            const rows =
              broadDataQuestion
                ? allRows
                : rankMatches(
                    allRows,
                    terms,
                    (row) =>
                      [
                        row.address,
                        row.barangay,
                        row.headOfHousehold,
                        row.notes,
                        row.assignedWorker?.name,
                        row.assignedWorker?.email,
                        row.vulnerableProfile
                          ?.firstName,
                        row.vulnerableProfile
                          ?.lastName,
                      ]
                        .filter(Boolean)
                        .join(' '),
                    30,
                  )

            sections.push(
              'HOUSEHOLD MATCHES (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsFieldNotes) {
      tasks.push(
        db.fieldNote
          .findMany({
            orderBy: {
              updatedAt: 'desc',
            },
            take: 50,
            select: {
              id: true,
              note: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          })
          .then((allRows) => {
            const rows =
              broadDataQuestion
                ? allRows.slice(
                    0,
                    30,
                  )
                : rankMatches(
                    allRows,
                    terms,
                    (row) =>
                      [
                        row.note,
                        row.user.name,
                        row.user.email,
                        row.user.role,
                      ].join(' '),
                    30,
                  )

            sections.push(
              'FIELD NOTE MATCHES (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsNotifications) {
      tasks.push(
        db.notification
          .findMany({
            orderBy: {
              createdAt: 'desc',
            },
            take: 50,
            select: {
              id: true,
              type: true,
              title: true,
              message: true,
              status: true,
              sentViaEmail: true,
              sentViaSms: true,
              emailSentAt: true,
              smsSentAt: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          })
          .then((allRows) => {
            const rows =
              broadDataQuestion
                ? allRows.slice(
                    0,
                    30,
                  )
                : rankMatches(
                    allRows,
                    terms,
                    (row) =>
                      [
                        row.type,
                        row.title,
                        row.message,
                        row.status,
                        row.user.name,
                        row.user.email,
                      ].join(' '),
                    30,
                  )

            sections.push(
              'NOTIFICATION MATCHES (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsDrafts) {
      tasks.push(
        db.vulnerableRegistrationDraft
          .findMany({
            orderBy: {
              updatedAt: 'desc',
            },
            take: 30,
            select: {
              id: true,
              adminId: true,
              title: true,
              currentStep: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          })
          .then((allRows) => {
            const rows =
              broadDataQuestion
                ? allRows
                : rankMatches(
                    allRows,
                    terms,
                    (row) =>
                      [
                        row.title,
                        row.status,
                        row.admin.name,
                        row.admin.email,
                      ].join(' '),
                    30,
                  )

            sections.push(
              'REGISTRATION DRAFT MATCHES (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    if (wantsDocuments) {
      tasks.push(
        db.vulnerabilityDocument
          .findMany({
            orderBy: {
              uploadedAt: 'desc',
            },
            take: 50,
            select: {
              id: true,
              documentType: true,
              fileName: true,
              uploadedAt: true,
              profile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  barangay: true,
                  registrationStatus: true,
                },
              },
            },
          })
          .then((allRows) => {
            const rows =
              broadDataQuestion
                ? allRows.slice(
                    0,
                    30,
                  )
                : rankMatches(
                    allRows,
                    terms,
                    (row) =>
                      [
                        row.documentType,
                        row.fileName,
                        row.profile
                          .firstName,
                        row.profile
                          .lastName,
                        row.profile
                          .barangay,
                      ].join(' '),
                    30,
                  )

            sections.push(
              'DOCUMENT METADATA MATCHES (' +
                rows.length +
                ' rows): ' +
                compactJson(rows),
            )
          }),
      )
    }

    await Promise.all(tasks)

    return sections.join('\n')
  }

  if (role === 'WORKER') {
    const [
      reliefRows,
      fieldNotes,
      profiles,
      announcements,
    ] = await Promise.all([
      db.reliefDistribution.findMany({
        where: { workerId: userId },
        orderBy: {
          distributionDate: 'desc',
        },
        take: 25,
        select: {
          id: true,
          distributionDate: true,
          distributionType: true,
          itemsProvided: true,
          quantity: true,
          notes: true,
          status: true,
          rejectionReason: true,
          vulnerableProfile: {
            select: {
              firstName: true,
              lastName: true,
              barangay: true,
            },
          },
        },
      }),
      db.fieldNote.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          note: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.vulnerableProfile.findMany({
        where: {
          registrationStatus: 'APPROVED',
          ...(terms.length > 0
            ? {
                OR: terms.flatMap((term) => [
                  { firstName: { contains: term } },
                  { lastName: { contains: term } },
                  { barangay: { contains: term } },
                  { assistanceType: { contains: term } },
                ]),
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          barangay: true,
          vulnerabilityTypes: true,
          needsAssistance: true,
          assistanceType: true,
          registrationStatus: true,
        },
      }),
      db.announcement.findMany({
        where: {
          isActive: true,
          OR: [
            { targetRole: null },
            { targetRole: 'ALL' },
            { targetRole: 'WORKER' },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          eventDate: true,
          eventTime: true,
          location: true,
          priority: true,
          createdAt: true,
        },
      }),
    ])

    return [
      'WORKER-ACCESSIBLE RELIEF RECORDS: ' +
        compactJson(reliefRows),
      'WORKER FIELD NOTES: ' +
        compactJson(fieldNotes),
      'MATCHING APPROVED VULNERABLE PROFILES: ' +
        compactJson(profiles),
      'WORKER-VISIBLE ANNOUNCEMENTS: ' +
        compactJson(announcements),
    ].join('\n')
  }

  const profile =
    await db.vulnerableProfile.findUnique({
      where: { userId },
      include: {
        household: true,
        reliefDistributions: {
          orderBy: {
            distributionDate: 'desc',
          },
          take: 25,
          select: {
            id: true,
            distributionDate: true,
            distributionType: true,
            itemsProvided: true,
            quantity: true,
            status: true,
            notes: true,
          },
        },
      },
    })

  const [feedback, reliefFeedback, announcements] =
    await Promise.all([
      db.feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          subject: true,
          message: true,
          status: true,
          adminResponse: true,
          adminResponseDate: true,
          createdAt: true,
        },
      }),
      db.reliefFeedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          feedbackType: true,
          message: true,
          status: true,
          adminResponse: true,
          adminResponseDate: true,
          createdAt: true,
        },
      }),
      db.announcement.findMany({
        where: {
          isActive: true,
          OR: [
            { targetRole: null },
            { targetRole: 'ALL' },
            { targetRole: 'VULNERABLE' },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          eventDate: true,
          eventTime: true,
          location: true,
          priority: true,
          createdAt: true,
        },
      }),
    ])

  return [
    'SIGNED-IN VULNERABLE PROFILE: ' +
      compactJson(profile),
    'YOUR GENERAL FEEDBACK: ' +
      compactJson(feedback),
    'YOUR RELIEF FEEDBACK: ' +
      compactJson(reliefFeedback),
    'ANNOUNCEMENTS VISIBLE TO YOU: ' +
      compactJson(announcements),
  ].join('\n')
}

async function directAdminUserLookup({
  message,
  retrievalMessage,
}: {
  message: string
  retrievalMessage: string
}) {
  const normalized =
    normalizeLookupText(message)

  const lookupIntent =
    mentions(normalized, [
      'do we have',
      'is there',
      'is this user',
      'is that user',
      'find user',
      'find account',
      'look up',
      'lookup',
      'users list',
      'user list',
      'check the user',
      'check users',
    ])

  if (!lookupIntent) return null

  const terms =
    queryTerms(retrievalMessage)

  if (
    terms.length === 0 ||
    terms.length > 6
  ) {
    return null
  }

  const allUsers =
    await db.user.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      take: 300,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        vulnerableProfile: {
          select: {
            barangay: true,
            registrationStatus: true,
            vulnerabilityTypes: true,
            needsAssistance: true,
            assistanceType: true,
          },
        },
      },
    })

  const matches =
    rankMatches(
      allUsers,
      terms,
      (row) =>
        [
          row.name,
          row.email,
          row.phone,
          row.role,
          row.vulnerableProfile
            ?.barangay,
          row.vulnerableProfile
            ?.registrationStatus,
        ]
          .filter(Boolean)
          .join(' '),
      5,
    )

  if (matches.length === 0) {
    return {
      provider: 'crms-db',
      reply: [
        '### No matching user found',
        '',
        `I searched the current **CRMS Users** records for **${terms.join(' ')}** and found no matching account.`,
      ].join('\n'),
    }
  }

  if (matches.length === 1) {
    const user = matches[0]
    const profile =
      user.vulnerableProfile

    return {
      provider: 'crms-db',
      reply: [
        '### User found',
        '',
        `- **Full name:** ${user.name}`,
        `- **Role:** ${user.role}`,
        `- **Email:** ${user.email}`,
        `- **Phone:** ${user.phone || 'Not recorded'}`,
        ...(profile
          ? [
              `- **Barangay:** ${profile.barangay || 'Not recorded'}`,
              `- **Registration status:** ${profile.registrationStatus || 'Not recorded'}`,
              `- **Vulnerability type:** ${profile.vulnerabilityTypes || 'Not recorded'}`,
              `- **Needs assistance:** ${profile.needsAssistance ? 'Yes' : 'No'}`,
              `- **Assistance type:** ${profile.assistanceType || 'Not recorded'}`,
            ]
          : []),
      ].join('\n'),
    }
  }

  return {
    provider: 'crms-db',
    reply: [
      `### ${matches.length} matching users found`,
      '',
      ...matches.flatMap(
        (user, index) => [
          `${index + 1}. **${user.name}** — ${user.role}`,
          `   - Email: ${user.email}`,
          `   - Phone: ${user.phone || 'Not recorded'}`,
          ...(user.vulnerableProfile
            ? [
                `   - Barangay: ${user.vulnerableProfile.barangay || 'Not recorded'}`,
                `   - Registration: ${user.vulnerableProfile.registrationStatus || 'Not recorded'}`,
              ]
            : []),
        ],
      ),
    ].join('\n'),
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const message = cleanText(body.message)
    const activeView = cleanText(body.activeView, 100)
    const activeViewLabel = cleanText(
      body.activeViewLabel,
      160,
    )

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'A message is required' },
        { status: 400 },
      )
    }

    const rawHistory = Array.isArray(body.history)
      ? (body.history as ChatMessage[])
          .slice(-12)
      : []

    const history = rawHistory
      .map((item) => ({
            role:
              item.role === 'assistant'
                ? 'model'
                : 'user',
            parts: [
              {
                text: cleanText(item.content, 1800),
              },
            ],
          }))
          .filter(
            (item) =>
              item.parts[0].text.length > 0,
          )

    const currentLookupTerms =
      queryTerms(message)
    const needsPriorLookupContext =
      currentLookupTerms.length === 0 ||
      mentions(message, [
        'that user',
        'that person',
        'them',
        'look up',
        'lookup',
        'check again',
        'users list',
      ])

    const retrievalMessage =
      needsPriorLookupContext
        ? [
            ...rawHistory
              .filter(
                (item) =>
                  item.role !==
                  'assistant',
              )
              .slice(-4)
              .map((item) =>
                cleanText(
                  item.content,
                  600,
                ),
              ),
            message,
          ]
            .filter(Boolean)
            .join('\n')
        : message

    if (auth.role === 'ADMIN') {
      const directLookup =
        await directAdminUserLookup({
          message,
          retrievalMessage,
        })

      if (directLookup) {
        return NextResponse.json({
          success: true,
          provider:
            directLookup.provider,
          model: 'CRMS database',
          contextUpdatedAt:
            new Date().toISOString(),
          reply:
            directLookup.reply,
        })
      }
    }

    const apiKey = cleanText(
      process.env.GEMINI_API_KEY,
      500,
    )
    const model =
      cleanText(
        process.env.GEMINI_TEXT_MODEL ||
          process.env.GEMINI_MODEL,
        100,
      ) || 'gemini-3.5-flash-lite'

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          code: 'AI_NOT_CONFIGURED',
          error:
            'Real AI chat is not configured. Add GEMINI_API_KEY to the server environment and restart the app.',
        },
        { status: 503 },
      )
    }

    const liveContext =
      await buildLiveSystemContext({
        role: auth.role,
        userId: auth.userId,
        activeView,
        activeViewLabel,
      })

    const queryAwareContext =
      await buildQueryAwareContext({
        role: auth.role,
        userId: auth.userId,
        message:
          retrievalMessage,
      })

    const systemInstruction = [
      'You are CRMS Assistant, the dedicated in-app assistant for the Community Resource Mapping System (CRMS) of San Policarpo, Eastern Samar.',
      `The signed-in role is ${auth.role}.`,
      'STRICT SCOPE: Answer only questions about this CRMS system, its current data snapshot supplied below, its screens, workflows, roles, registration, relief distribution, Operations/Activity History, announcements, feedback, analytics, maps, reports, authentication, account setup, or how to perform an action inside CRMS.',
      'If the user asks about unrelated topics such as general trivia, entertainment, homework unrelated to CRMS, politics, shopping, coding outside this CRMS project, or other subjects, politely say that you are limited to CRMS and ask them to phrase a CRMS-related question. Do not answer the unrelated question.',
      'Use BOTH the live system snapshot and the query-aware database lookup below. The backend searches CRMS records for every relevant question so you can answer from actual current data instead of saying you cannot see the system.',
      'Treat the live context as a current snapshot from CRMS, not as permanent truth. Say "currently" or "in the current CRMS snapshot" when quoting live totals.',
      'Never invent records, people, totals, dates, approvals, locations, statuses, or actions. If a lookup section explicitly has 0 rows, say no matching record was found in that current lookup. If matching rows are supplied, use them directly and accurately.',
      'Do not claim that an action was completed unless CRMS actually completed it.',
      'Never ask for passwords, OTP codes, API keys, or unnecessary sensitive personal information.',
      'Respect role boundaries. Administrators can discuss municipality-wide operational totals. Workers should only receive their own worker-level operational context. Vulnerable Citizens should only receive their own profile-level context.',
      'Administrator areas include Overview, Approval Center, Registrations, Users, Relief Approval, Operations History, Announcements, Feedback, Analytics, Vulnerable Map, Daily Reports, and User Guide.',
      'Worker areas include Dashboard, My Relief Records, Activity History, Record Relief, Register Citizen, Field Notes, Community Updates, Daily Reports, and Help Guide.',
      'Vulnerable Citizen areas include Home, My Information, My Relief History, Send Feedback, Community Updates, and Help Guide.',
      'When the user asks what to do, give short numbered steps that match the signed-in role and current page when possible.',
      'When an Administrator asks what data exists, summarize the database catalog and then describe the relevant current records. When they ask for a person, account, barangay, household, relief entry, announcement, feedback item, resource, field note, notification, registration draft, document metadata, or request, use the query-aware lookup instead of giving a generic navigation answer.',
      'AUTHORITATIVE MATCH RULE: If AUTHORITATIVE USER MATCHES or AUTHORITATIVE VULNERABLE PROFILE MATCHES contains a row, that record exists in CRMS. Never say the record was not found. When the user asks whether a named person exists, answer from those rows first and include the matched full name and role. A zero-row match is the only basis for saying no matching record was found.',
      'Do not expose password hashes, OTP state, API keys, or other authentication secrets. Those fields are intentionally never supplied.',
      'FORMAT RESPONSES AS CLEAN MARKDOWN. Prefer a short heading when useful, bullet points for record details, numbered steps for procedures, and **bold labels** for important fields. Never place several labeled fields in one run-on paragraph. Never show raw Markdown markers as plain text.',
      'For a single person or record, use one short heading followed by one bullet per important field. For multiple records, use a numbered list with nested bullets. Keep answers concise and operational unless the user asks for detail.',
      '',
      'CURRENT LIVE CRMS CONTEXT:',
      liveContext,
      '',
      'QUERY-AWARE CRMS DATABASE LOOKUP:',
      queryAwareContext,
    ].join('\n')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            ...history,
            {
              role: 'user',
              parts: [{ text: message }],
            },
          ],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 650,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        'Gemini assistant request failed:',
        response.status,
        errorText.slice(0, 1000),
      )

      return NextResponse.json(
        {
          success: false,
          code: 'AI_PROVIDER_ERROR',
          error:
            'The AI provider did not accept the request. Check GEMINI_API_KEY, GEMINI_TEXT_MODEL/GEMINI_MODEL, and the server console.',
        },
        { status: 502 },
      )
    }

    const data = await response.json()
    const reply = cleanText(
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) =>
          part?.text || '',
        )
        .join('\n'),
      6000,
    )

    return NextResponse.json({
      success: true,
      provider: 'gemini',
      model,
      contextUpdatedAt: new Date().toISOString(),
      reply:
        reply ||
        'The model returned an empty response. Please try again.',
    })
  } catch (error) {
    console.error('CRMS assistant error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'The assistant is temporarily unavailable',
      },
      { status: 500 },
    )
  }
}
