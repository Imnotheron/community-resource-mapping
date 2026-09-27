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

type GoogleApiError = {
  httpStatus: number
  code?: number
  status?: string
  message: string
}

async function readGoogleApiError(
  response: Response,
): Promise<GoogleApiError> {
  const payload = await response
    .json()
    .catch(async () => {
      const text = await response
        .text()
        .catch(() => '')
      return {
        error: {
          message:
            text ||
            response.statusText ||
            'Unknown Google API error',
        },
      }
    })

  const error =
    payload?.error || payload || {}

  return {
    httpStatus: response.status,
    code:
      typeof error?.code === 'number'
        ? error.code
        : undefined,
    status:
      typeof error?.status === 'string'
        ? error.status
        : undefined,
    message:
      String(
        error?.message ||
          response.statusText ||
          'Unknown Google API error',
      ).slice(0, 1000),
  }
}

function formatGoogleApiError(
  label: string,
  error: GoogleApiError,
) {
  const status = [
    `HTTP ${error.httpStatus}`,
    error.status,
  ]
    .filter(Boolean)
    .join(' · ')

  return `${label}: ${status} — ${error.message}`
}

async function listAccessibleGeminiModels(
  apiKey: string,
) {
  const controller =
    new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    10_000,
  )

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        headers: {
          'x-goog-api-key': apiKey,
        },
        cache: 'no-store',
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      return {
        ok: false as const,
        error:
          await readGoogleApiError(
            response,
          ),
      }
    }

    const payload =
      await response.json()
    const names = new Set<string>(
      Array.isArray(payload?.models)
        ? payload.models
            .map((item: any) =>
              String(item?.name || ''),
            )
            .filter(Boolean)
        : [],
    )

    return {
      ok: true as const,
      names,
    }
  } catch (error: any) {
    return {
      ok: false as const,
      error: {
        httpStatus: 0,
        status:
          error?.name === 'AbortError'
            ? 'TIMEOUT'
            : 'NETWORK_ERROR',
        message:
          error?.name === 'AbortError'
            ? 'Gemini model-access check timed out.'
            : String(
                error?.message ||
                  'Gemini model-access check failed.',
              ),
      } satisfies GoogleApiError,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function chooseLiveModel(
  accessibleNames: Set<string>,
  configuredModel: string,
) {
  const candidates = [
    configuredModel,
    'gemini-3.8-live',
    'gemini-3.1-flash-live-preview',
    'gemini-2.5-flash-native-audio-preview-12-2025',
  ].filter(
    (model, index, all) =>
      Boolean(model) &&
      all.indexOf(model) === index,
  )

  const selected = candidates.find(
    (model) =>
      accessibleNames.has(
        `models/${model}`,
      ),
  )

  return {
    selected: selected || null,
    candidates,
  }
}

function chooseTurnVoiceModel(
  accessibleNames: Set<string>,
) {
  const configured =
    clean(
      process.env.GEMINI_VOICE_FALLBACK_MODEL ||
        process.env.GEMINI_TEXT_MODEL ||
        process.env.GEMINI_MODEL,
      100,
    ) || 'gemini-3.5-flash-lite'

  const candidates = [
    configured,
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ].filter(
    (model, index, all) =>
      Boolean(model) &&
      all.indexOf(model) === index,
  )

  return (
    candidates.find((model) =>
      accessibleNames.has(
        `models/${model}`,
      ),
    ) || configured
  )
}

function turnVoiceResponse(
  model: string,
  reason: string,
) {
  return NextResponse.json({
    success: true,
    mode: 'turn',
    model,
    reason,
  })
}

async function createLiveToken(
  apiKey: string,
  body: Record<string, unknown>,
) {
  const controller =
    new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    10_000,
  )

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/auth_tokens',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      return {
        ok: false as const,
        error:
          await readGoogleApiError(
            response,
          ),
      }
    }

    const payload =
      await response.json()

    if (!payload?.name) {
      return {
        ok: false as const,
        error: {
          httpStatus: response.status,
          status: 'INVALID_RESPONSE',
          message:
            'Google returned a token response without a token name.',
        } satisfies GoogleApiError,
      }
    }

    return {
      ok: true as const,
      token: String(payload.name),
    }
  } catch (error: any) {
    return {
      ok: false as const,
      error: {
        httpStatus: 0,
        status:
          error?.name === 'AbortError'
            ? 'TIMEOUT'
            : 'NETWORK_ERROR',
        message:
          error?.name === 'AbortError'
            ? 'Gemini Live token request timed out.'
            : String(
                error?.message ||
                  'Gemini Live token request failed.',
              ),
      } satisfies GoogleApiError,
    }
  } finally {
    clearTimeout(timeout)
  }
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
    const configuredModel =
      clean(
        process.env.GEMINI_LIVE_MODEL,
        100,
      ) || 'gemini-3.8-live'

    const modelAccess =
      await listAccessibleGeminiModels(
        apiKey,
      )

    if (!modelAccess.ok) {
      const detail =
        formatGoogleApiError(
          'Gemini API access check failed',
          modelAccess.error,
        )

      console.error(detail)

      return NextResponse.json(
        {
          success: false,
          code:
            'GEMINI_API_ACCESS_FAILED',
          error: detail,
          diagnostics: {
            stage: 'models',
            configuredModel,
            keyType:
              apiKey.startsWith('AQ.')
                ? 'AQ auth key'
                : apiKey.startsWith(
                      'AIza',
                    )
                  ? 'legacy API key'
                  : 'unknown key format',
          },
        },
        {
          status:
            modelAccess.error
              .httpStatus || 502,
        },
      )
    }

    const modelChoice =
      chooseLiveModel(
        modelAccess.names,
        configuredModel,
      )
    const model =
      modelChoice.selected

    if (!model) {
      const fallbackModel =
        chooseTurnVoiceModel(
          modelAccess.names,
        )

      return turnVoiceResponse(
        fallbackModel,
        'This Gemini project does not expose a conversational Live model, so CRMS automatically switched to compatible voice mode using Gemini audio understanding plus spoken browser output.',
      )
    }

    if (model !== configuredModel) {
      console.warn(
        `Configured Live model ${configuredModel} is unavailable; CRMS automatically selected ${model} for this Gemini project.`,
      )
    }

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

    // First use Google's documented constrained-token shape.
    // sessionResumption is included because it is part of Google's
    // current constrained Live-token REST example.
    const constrainedToken =
      await createLiveToken(
        apiKey,
        {
          uses: 1,
          expireTime,
          newSessionExpireTime,
          liveConnectConstraints: {
            model:
              `models/${model}`,
            config: {
              sessionResumption: {},
              responseModalities: [
                'AUDIO',
              ],
            },
          },
        },
      )

    if (constrainedToken.ok) {
      return NextResponse.json({
        success: true,
        mode: 'live',
        token:
          constrainedToken.token,
        tokenMode: 'constrained',
        model,
        systemInstruction:
          systemInstruction.slice(
            0,
            28_000,
          ),
        expiresAt: expireTime,
        diagnostics: {
          stage: 'ready',
          model,
          configuredModel,
          automaticFallback:
            model !== configuredModel,
          tokenMode:
            'constrained',
          contextCharacters:
            systemInstruction.length,
        },
      })
    }

    // Some projects/keys can issue an ephemeral token but reject
    // liveConnectConstraints. Retry once using Google's minimal
    // documented token request. The WebSocket setup still locks the
    // model and AUDIO modality for the actual session.
    const minimalToken =
      await createLiveToken(
        apiKey,
        {
          uses: 1,
          expireTime,
          newSessionExpireTime,
        },
      )

    if (minimalToken.ok) {
      console.warn(
        'Gemini constrained token failed; using minimal ephemeral token:',
        constrainedToken.error,
      )

      return NextResponse.json({
        success: true,
        mode: 'live',
        token: minimalToken.token,
        tokenMode: 'minimal',
        model,
        systemInstruction:
          systemInstruction.slice(
            0,
            28_000,
          ),
        expiresAt: expireTime,
        diagnostics: {
          stage: 'ready',
          model,
          configuredModel,
          automaticFallback:
            model !== configuredModel,
          tokenMode: 'minimal',
          constrainedTokenError:
            formatGoogleApiError(
              'Constrained token',
              constrainedToken.error,
            ),
          contextCharacters:
            systemInstruction.length,
        },
      })
    }

    const constrainedDetail =
      formatGoogleApiError(
        'Constrained token',
        constrainedToken.error,
      )
    const minimalDetail =
      formatGoogleApiError(
        'Minimal token',
        minimalToken.error,
      )

    console.warn(
      'Gemini Live token creation failed; switching to compatible voice mode:',
      constrainedDetail,
      minimalDetail,
    )

    return turnVoiceResponse(
      chooseTurnVoiceModel(
        modelAccess.names,
      ),
      'Gemini Live authentication is unavailable for this project, so CRMS automatically switched to compatible voice mode.',
    )

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
