export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'

function clean(value: unknown, max = 2000) {
  return String(value || '').trim().slice(0, max)
}

function safeJson(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) =>
      item instanceof Date
        ? item.toISOString()
        : item,
  )
}

async function buildVoiceContext(
  role: string,
  userId: string,
  activeView: string,
  activeViewLabel: string,
) {
  const page = {
    activeView,
    activeViewLabel,
  }

  if (role === 'ADMIN') {
    const [
      users,
      profiles,
      relief,
      announcements,
      feedback,
      resources,
    ] = await Promise.all([
      db.user.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 80,
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
      }),
      db.vulnerableProfile.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 80,
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
          barangay: true,
          registrationStatus: true,
          vulnerabilityTypes: true,
          needsAssistance: true,
          assistanceType: true,
          mobileNumber: true,
          emailAddress: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.reliefDistribution.findMany({
        orderBy: { distributionDate: 'desc' },
        take: 60,
        select: {
          id: true,
          distributionDate: true,
          distributionType: true,
          itemsProvided: true,
          quantity: true,
          notes: true,
          status: true,
          rejectionReason: true,
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
      }),
      db.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
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
        },
      }),
      db.feedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          type: true,
          subject: true,
          message: true,
          status: true,
          adminResponse: true,
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
      db.communityResource.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          name: true,
          type: true,
          address: true,
          barangay: true,
          capacity: true,
          contactInfo: true,
          isActive: true,
          updatedAt: true,
        },
      }),
    ])

    return [
      'CURRENT PAGE: ' + safeJson(page),
      'CURRENT USERS: ' + safeJson(users),
      'CURRENT VULNERABLE PROFILES: ' + safeJson(profiles),
      'RECENT RELIEF RECORDS: ' + safeJson(relief),
      'RECENT ANNOUNCEMENTS / EVENTS: ' + safeJson(announcements),
      'RECENT GENERAL FEEDBACK: ' + safeJson(feedback),
      'COMMUNITY RESOURCES: ' + safeJson(resources),
    ].join('\n')
  }

  if (role === 'WORKER') {
    const [relief, notes, profiles, announcements] =
      await Promise.all([
        db.reliefDistribution.findMany({
          where: { workerId: userId },
          orderBy: { distributionDate: 'desc' },
          take: 50,
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
                id: true,
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
          take: 30,
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
          },
          orderBy: { updatedAt: 'desc' },
          take: 60,
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
          take: 30,
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
      'CURRENT PAGE: ' + safeJson(page),
      'YOUR RELIEF RECORDS: ' + safeJson(relief),
      'YOUR FIELD NOTES: ' + safeJson(notes),
      'APPROVED VULNERABLE PROFILES AVAILABLE TO WORKER: ' +
        safeJson(profiles),
      'WORKER-VISIBLE ANNOUNCEMENTS: ' +
        safeJson(announcements),
    ].join('\n')
  }

  const profile = await db.vulnerableProfile.findUnique({
    where: { userId },
    include: {
      household: true,
      reliefDistributions: {
        orderBy: { distributionDate: 'desc' },
        take: 40,
      },
    },
  })

  const [generalFeedback, reliefFeedback, announcements] =
    await Promise.all([
      db.feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      db.reliefFeedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
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
        take: 30,
      }),
    ])

  return [
    'CURRENT PAGE: ' + safeJson(page),
    'YOUR VULNERABLE PROFILE: ' + safeJson(profile),
    'YOUR GENERAL FEEDBACK: ' + safeJson(generalFeedback),
    'YOUR RELIEF FEEDBACK: ' + safeJson(reliefFeedback),
    'ANNOUNCEMENTS VISIBLE TO YOU: ' +
      safeJson(announcements),
  ].join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if ('error' in auth) return auth.error

    const apiKey = clean(
      process.env.GEMINI_API_KEY,
      500,
    )

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Gemini API is not configured. Add GEMINI_API_KEY and restart CRMS.',
        },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const activeView = clean(body.activeView, 100)
    const activeViewLabel = clean(
      body.activeViewLabel,
      160,
    )
    const model =
      clean(
        process.env.GEMINI_LIVE_MODEL,
        100,
      ) || 'gemini-3.8-live'

    const liveContext =
      await buildVoiceContext(
        auth.role,
        auth.userId,
        activeView,
        activeViewLabel,
      )

    const systemInstruction = [
      'You are CRMS Assistant, the real-time voice assistant inside the Community Resource Mapping System of San Policarpo, Eastern Samar.',
      'You must only discuss CRMS itself: its current records, screens, users, vulnerable profiles, registrations, relief operations, Operations or Activity History, announcements, feedback, resources, maps, analytics, reports, authentication, and instructions for using the system.',
      'If asked an unrelated question, briefly say you only assist with CRMS.',
      'Use the current CRMS database snapshot below as factual context. Search the supplied snapshot carefully before saying that a person or record is absent.',
      'Never invent a user, record, status, total, address, date, or action.',
      'Never reveal or request passwords, password hashes, OTP values, API keys, or authentication secrets.',
      `Signed-in role: ${auth.role}.`,
      auth.role === 'ADMIN'
        ? 'The Administrator may discuss the municipality-wide CRMS records supplied below.'
        : auth.role === 'WORKER'
          ? 'The Worker may discuss only Worker-accessible records supplied below.'
          : 'The Vulnerable Citizen may discuss only their own supplied records and generally visible CRMS information.',
      'Answer naturally and briefly for spoken conversation. Give step-by-step instructions when the user asks what to do.',
      '',
      'CURRENT CRMS DATABASE SNAPSHOT:',
      liveContext,
    ].join('\n')

    const now = Date.now()
    const expireTime = new Date(
      now + 25 * 60 * 1000,
    ).toISOString()
    const newSessionExpireTime = new Date(
      now + 60 * 1000,
    ).toISOString()

    const tokenResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/auth_tokens',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          uses: 1,
          expireTime,
          newSessionExpireTime,
        }),
        cache: 'no-store',
      },
    )

    const tokenData = await tokenResponse
      .json()
      .catch(() => null)

    if (
      !tokenResponse.ok ||
      !tokenData?.name
    ) {
      console.error(
        'Gemini Live token creation failed:',
        tokenResponse.status,
        tokenData,
      )

      return NextResponse.json(
        {
          success: false,
          error:
            'Could not start Gemini Live voice authentication. Check Gemini API access and the configured key.',
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      token: tokenData.name,
      model,
      systemInstruction,
      expiresAt: expireTime,
    })
  } catch (error) {
    console.error(
      'CRMS Live token error:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'The CRMS voice service could not start.',
      },
      { status: 500 },
    )
  }
}
