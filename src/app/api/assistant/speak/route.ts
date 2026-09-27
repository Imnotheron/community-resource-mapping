export const dynamic = 'force-dynamic'

import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  assistantSpeechStyle,
  normalizeAssistantLanguage,
} from '@/lib/assistant-language'
import { requireRequestUser } from '@/lib/request-user-session'

function clean(
  value: unknown,
  max = 3_000,
) {
  return String(value || '')
    .trim()
    .slice(0, max)
}

type TtsResult =
  | {
      ok: true
      data: string
      mimeType: string
      model: string
    }
  | {
      ok: false
      status: number
      error: string
      model: string
    }

async function generateSpeech({
  apiKey,
  model,
  voice,
  text,
  style,
}: {
  apiKey: string
  model: string
  voice: string
  text: string
  style: string
}): Promise<TtsResult> {
  const controller =
    new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    18_000,
  )

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          'x-goog-api-key':
            apiKey,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              type: 'user_input',
              content: [
                {
                  type: 'text',
                  text,
                  annotations: [
                    {
                      type:
                        'speech_metadata',
                      style,
                    },
                  ],
                },
              ],
            },
          ],
          response_format: {
            type: 'audio',
            mime_type:
              'audio/wav',
            sample_rate: 24_000,
          },
          generation_config: {
            speech_config: [
              {
                voice,
              },
            ],
          },
        }),
        cache: 'no-store',
        signal:
          controller.signal,
      },
    )

    const payload =
      await response
        .json()
        .catch(() => null)

    if (!response.ok) {
      return {
        ok: false,
        status:
          response.status,
        error:
          clean(
            payload?.error?.message ||
              payload?.message ||
              response.statusText ||
              'Gemini TTS rejected the request.',
            900,
          ),
        model,
      }
    }

    const audioBlocks =
      (
        Array.isArray(
          payload?.steps,
        )
          ? payload.steps
          : []
      ).flatMap(
        (step: any) =>
          step?.type ===
            'model_output' &&
          Array.isArray(
            step?.content,
          )
            ? step.content
            : [],
      )

    const audio =
      [...audioBlocks]
        .reverse()
        .find(
          (item: any) =>
            item?.type ===
              'audio' &&
            typeof item?.data ===
              'string' &&
            item.data.length > 0,
        )

    if (!audio?.data) {
      return {
        ok: false,
        status: 502,
        error:
          'Gemini TTS returned no playable audio.',
        model,
      }
    }

    return {
      ok: true,
      data: audio.data,
      mimeType:
        clean(
          audio.mime_type ||
            audio.mimeType ||
            'audio/wav',
          100,
        ) || 'audio/wav',
      model,
    }
  } catch (error: any) {
    return {
      ok: false,
      status: 502,
      error:
        error?.name ===
        'AbortError'
          ? 'Gemini TTS timed out.'
          : clean(
              error?.message ||
                'Gemini TTS request failed.',
              900,
            ),
      model,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const auth =
      await requireRequestUser(
        request,
      )

    if ('error' in auth) {
      return auth.error
    }

    const apiKey = clean(
      process.env.GEMINI_API_KEY,
      500,
    )

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Gemini API is not configured.',
        },
        { status: 503 },
      )
    }

    const body = await request
      .json()
      .catch(() => ({}))
    const text = clean(
      body.text,
      3_000,
    )
    const language =
      normalizeAssistantLanguage(
        body.language,
      )

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Speech text is required.',
        },
        { status: 400 },
      )
    }

    const voice =
      clean(
        process.env
          .GEMINI_TTS_VOICE,
        100,
      ) || 'Kore'
    const configuredModel =
      clean(
        process.env
          .GEMINI_TTS_MODEL,
        100,
      )

    const candidates = [
      configuredModel,
      'gemini-3.8-flash-tts',
      'gemini-3.8-flash-lite-tts',
    ].filter(
      (
        model,
        index,
        all,
      ): model is string =>
        Boolean(model) &&
        all.indexOf(model) ===
          index,
    )

    const errors: string[] = []

    for (const model of candidates) {
      const result =
        await generateSpeech({
          apiKey,
          model,
          voice,
          text,
          style:
            assistantSpeechStyle(
              language,
            ),
        })

      if (!result.ok) {
        errors.push(
          `${model}: ${result.error}`,
        )
        continue
      }

      const bytes =
        new Uint8Array(
          Buffer.from(
            result.data,
            'base64',
          ),
        )

      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type':
            result.mimeType,
          'Cache-Control':
            'no-store',
          'X-CRMS-TTS-Model':
            result.model,
          'X-CRMS-TTS-Voice':
            voice,
        },
      })
    }

    console.error(
      'CRMS TTS failed:',
      errors,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'High-quality voice generation is temporarily unavailable.',
        details:
          errors.slice(0, 3),
      },
      { status: 502 },
    )
  } catch (error) {
    console.error(
      'CRMS speak route error:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'Speech generation is temporarily unavailable.',
      },
      { status: 500 },
    )
  }
}
