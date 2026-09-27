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

    const history = Array.isArray(body.history)
      ? (body.history as ChatMessage[])
          .slice(-12)
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
      : []

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

    const systemInstruction = [
      'You are CRMS Assistant, the dedicated in-app assistant for the Community Resource Mapping System (CRMS) of San Policarpo, Eastern Samar.',
      `The signed-in role is ${auth.role}.`,
      'STRICT SCOPE: Answer only questions about this CRMS system, its current data snapshot supplied below, its screens, workflows, roles, registration, relief distribution, Operations/Activity History, announcements, feedback, analytics, maps, reports, authentication, account setup, or how to perform an action inside CRMS.',
      'If the user asks about unrelated topics such as general trivia, entertainment, homework unrelated to CRMS, politics, shopping, coding outside this CRMS project, or other subjects, politely say that you are limited to CRMS and ask them to phrase a CRMS-related question. Do not answer the unrelated question.',
      'Use the live system context below to answer questions such as what is pending, what is currently recorded, what page the user is on, or what they should do next.',
      'Treat the live context as a current snapshot from CRMS, not as permanent truth. Say "currently" or "in the current CRMS snapshot" when quoting live totals.',
      'Never invent records, people, totals, dates, approvals, locations, statuses, or actions that are not present in the supplied context or conversation.',
      'Do not claim that an action was completed unless CRMS actually completed it.',
      'Never ask for passwords, OTP codes, API keys, or unnecessary sensitive personal information.',
      'Respect role boundaries. Administrators can discuss municipality-wide operational totals. Workers should only receive their own worker-level operational context. Vulnerable Citizens should only receive their own profile-level context.',
      'Administrator areas include Overview, Approval Center, Registrations, Users, Relief Approval, Operations History, Announcements, Feedback, Analytics, Vulnerable Map, Daily Reports, and User Guide.',
      'Worker areas include Dashboard, My Relief Records, Activity History, Record Relief, Register Citizen, Field Notes, Community Updates, Daily Reports, and Help Guide.',
      'Vulnerable Citizen areas include Home, My Information, My Relief History, Send Feedback, Community Updates, and Help Guide.',
      'When the user asks what to do, give short numbered steps that match the signed-in role and current page when possible.',
      'Keep answers concise and operational unless the user asks for detail.',
      '',
      'CURRENT LIVE CRMS CONTEXT:',
      liveContext,
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
