export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import {
  assistantLanguageInstruction,
  normalizeAssistantLanguage,
} from '@/lib/assistant-language'
import { db } from '@/lib/db'
import { requireRequestUser } from '@/lib/request-user-session'
import { getGeminiApiKey } from '@/lib/gemini-api-key'

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

const MODEL_ACCESS_CACHE_MS =
  5 * 60 * 1000
let modelAccessCache: {
  expiresAt: number
  names: string[]
} | null = null

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

async function getAccessibleGeminiModels(
  apiKey: string,
) {
  if (
    modelAccessCache &&
    modelAccessCache.expiresAt >
      Date.now()
  ) {
    return {
      ok: true as const,
      names: new Set<string>(
        modelAccessCache.names,
      ),
      cached: true,
    }
  }

  const result =
    await listAccessibleGeminiModels(
      apiKey,
    )

  if (result.ok) {
    modelAccessCache = {
      expiresAt:
        Date.now() +
        MODEL_ACCESS_CACHE_MS,
      names: Array.from(
        result.names,
      ),
    }
  }

  return result
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

    const apiKey = clean(getGeminiApiKey(), 500)

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Gemini API is not configured for this deployment. Add GEMINI_API_KEY (or GOOGLE_API_KEY) to the server environment and redeploy/restart CRMS.',
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
    const language =
      normalizeAssistantLanguage(
        body.language,
      )
    const configuredModel =
      clean(
        process.env.GEMINI_LIVE_MODEL,
        100,
      ) || 'gemini-3.8-live'

    // For Tagalog and Eastern Samar Waray, use the turn-based cascade
    // intentionally. It lets CRMS lock transcription to the selected
    // language and render the exact assistant text through Gemini TTS
    // with pronunciation/accent guidance instead of relying on browser
    // speech synthesis or Live's automatic language choice.
    if (
      language === 'tl' ||
      language === 'war'
    ) {
      return turnVoiceResponse(
        chooseTurnVoiceModel(
          new Set<string>(),
        ),
        language === 'war'
          ? 'CRMS uses controlled Gemini TTS for Eastern Samar Waray pronunciation.'
          : 'CRMS uses controlled Gemini TTS for natural Tagalog pronunciation.',
      )
    }

    const [
      modelAccess,
      liveContext,
    ] = await Promise.all([
      getAccessibleGeminiModels(
        apiKey,
      ),
      buildVoiceContext(
        auth.role,
        auth.userId,
        activeView,
        activeViewLabel,
      ),
    ])

    const accessibleNames =
      modelAccess.ok
        ? modelAccess.names
        : new Set<string>()

    if (!modelAccess.ok) {
      console.warn(
        'Gemini model listing failed; CRMS will still probe the documented Live models directly:',
        formatGoogleApiError(
          'Model list',
          modelAccess.error,
        ),
      )
    }

    const liveCandidates = [
      configuredModel,
      'gemini-3.8-live',
      'gemini-3.1-flash-live-preview',
      'gemini-2.5-flash-native-audio-preview-12-2025',
    ]
      .filter(
        (model, index, all) =>
          Boolean(model) &&
          all.indexOf(model) === index,
      )
      .sort((left, right) => {
        const leftVisible =
          accessibleNames.has(
            `models/${left}`,
          )
            ? 1
            : 0
        const rightVisible =
          accessibleNames.has(
            `models/${right}`,
          )
            ? 1
            : 0

        return (
          rightVisible -
          leftVisible
        )
      })

    const systemInstruction = [
      'You are CRMS Assistant, the real-time voice assistant inside the Community Resource Mapping System of San Policarpo, Eastern Samar.',
      'You must only discuss CRMS itself: its current records, screens, users, vulnerable profiles, registrations, relief operations, Operations or Activity History, announcements, feedback, resources, maps, analytics, reports, authentication, and instructions for using the system.',
      'If asked an unrelated question, briefly say you only assist with CRMS.',
      'Use the current CRMS database snapshot below as factual context. Search the supplied snapshot carefully before saying that a person or record is absent.',
      'Never invent a user, record, status, total, address, date, or action.',
      'Never reveal or request passwords, password hashes, OTP values, API keys, or authentication secrets.',
      `Signed-in role: ${auth.role}.`,
      assistantLanguageInstruction(
        language,
      ),
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
    const newSessionExpireTime =
      new Date(
        now + 60 * 1000,
      ).toISOString()

    const liveErrors: string[] = []

    // Do not treat GET /models as authoritative for Live availability.
    // Some projects can use a Live model even when it is not surfaced in
    // the normal model listing. Probe each documented Live model by asking
    // Google for a constrained ephemeral token; a successful token is the
    // strongest server-side proof that the project can start that model.
    for (const model of liveCandidates) {
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
                realtimeInputConfig: {
                  automaticActivityDetection: {
                    disabled: false,
                    startOfSpeechSensitivity:
                      'START_SENSITIVITY_HIGH',
                    endOfSpeechSensitivity:
                      'END_SENSITIVITY_HIGH',
                    prefixPaddingMs: 120,
                    silenceDurationMs: 650,
                  },
                },
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
          tokenMode:
            'constrained',
          model,
          systemInstruction:
            systemInstruction.slice(
              0,
              28_000,
            ),
          expiresAt:
            expireTime,
          diagnostics: {
            stage: 'ready',
            model,
            configuredModel,
            automaticFallback:
              model !==
              configuredModel,
            modelWasListed:
              accessibleNames.has(
                `models/${model}`,
              ),
            tokenMode:
              'constrained',
            contextCharacters:
              systemInstruction.length,
          },
        })
      }

      liveErrors.push(
        formatGoogleApiError(
          model,
          constrainedToken.error,
        ),
      )
    }

    // If Google lists a Live model but rejects the constrained-token shape,
    // try the minimal documented ephemeral token once and let the WebSocket
    // self-test validate the model end-to-end.
    const listedLiveModel =
      liveCandidates.find(
        (model) =>
          accessibleNames.has(
            `models/${model}`,
          ),
      )

    if (listedLiveModel) {
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
        return NextResponse.json({
          success: true,
          mode: 'live',
          token:
            minimalToken.token,
          tokenMode: 'minimal',
          model:
            listedLiveModel,
          systemInstruction:
            systemInstruction.slice(
              0,
              28_000,
            ),
          expiresAt:
            expireTime,
          diagnostics: {
            stage: 'ready',
            model:
              listedLiveModel,
            configuredModel,
            automaticFallback:
              listedLiveModel !==
              configuredModel,
            tokenMode:
              'minimal',
            constrainedAttempts:
              liveErrors,
            contextCharacters:
              systemInstruction.length,
          },
        })
      }

      liveErrors.push(
        formatGoogleApiError(
          'minimal-token',
          minimalToken.error,
        ),
      )
    }

    const fallbackModel =
      chooseTurnVoiceModel(
        accessibleNames,
      )

    console.warn(
      'No tested Gemini Live model could issue a usable ephemeral token. CRMS is switching to compatible voice mode.',
      liveErrors,
    )

    return turnVoiceResponse(
      fallbackModel,
      [
        'Real-time Gemini Live is not available to this API project right now.',
        'CRMS automatically switched to compatible voice mode, which records each spoken turn, sends the audio to Gemini for transcription/understanding, answers from current CRMS data, speaks the reply, and then listens again.',
      ].join(' '),
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
