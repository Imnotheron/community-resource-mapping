export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { requireRequestUser } from '@/lib/request-user-session'

function clean(
  value: unknown,
  max = 2_000,
) {
  return String(value || '')
    .trim()
    .slice(0, max)
}

function allowedAudioMime(
  value: string,
) {
  return [
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/aac',
    'audio/m4a',
    'audio/opus',
  ].some(
    (mime) =>
      value === mime ||
      value.startsWith(
        mime + ';',
      ),
  )
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

    const audio =
      String(
        body.audio || '',
      ).trim()
    const mimeType =
      clean(
        body.mimeType,
        100,
      ).toLowerCase()
    const canonicalMimeType =
      mimeType
        .split(';')[0]
        .trim()
    const requestedModel = clean(
      body.model,
      100,
    )
    const model =
      requestedModel ||
      clean(
        process.env
          .GEMINI_VOICE_FALLBACK_MODEL ||
          process.env
            .GEMINI_TEXT_MODEL ||
          process.env.GEMINI_MODEL,
        100,
      ) ||
      'gemini-3.5-flash-lite'

    if (!audio) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No voice audio was received.',
        },
        { status: 400 },
      )
    }

    if (
      audio.length >
      13_500_000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'The voice turn is too large. Please speak a shorter request.',
        },
        { status: 413 },
      )
    }

    if (
      !allowedAudioMime(
        canonicalMimeType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Unsupported voice recording format: ${canonicalMimeType || 'unknown'}.`,
        },
        { status: 415 },
      )
    }

    const controller =
      new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      20_000,
    )

    let response: Response

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text:
                      'Transcribe exactly what the speaker says. Return only the spoken words, with normal punctuation. Do not answer the request and do not add commentary. The speech may be English, Filipino/Tagalog, Waray, or a natural mix of those languages.',
                  },
                  {
                    inlineData: {
                      mimeType:
                        canonicalMimeType,
                      data: audio,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 350,
            },
          }),
          signal:
            controller.signal,
        },
      )
    } catch (error: any) {
      const timedOut =
        error?.name ===
        'AbortError'

      return NextResponse.json(
        {
          success: false,
          error: timedOut
            ? 'Voice transcription timed out.'
            : 'Voice transcription request failed.',
        },
        { status: 502 },
      )
    } finally {
      clearTimeout(timeout)
    }

    const payload =
      await response
        .json()
        .catch(() => null)

    if (!response.ok) {
      const providerMessage =
        String(
          payload?.error
            ?.message ||
            'Gemini rejected the voice transcription request.',
        ).slice(0, 700)

      console.error(
        'CRMS voice transcription failed:',
        response.status,
        providerMessage,
      )

      return NextResponse.json(
        {
          success: false,
          error:
            providerMessage,
        },
        {
          status:
            response.status,
        },
      )
    }

    const transcript =
      String(
        payload?.candidates?.[0]
          ?.content?.parts
          ?.map(
            (
              part: {
                text?: string
              },
            ) =>
              part?.text || '',
          )
          .join(' ') || '',
      )
        .trim()
        .replace(
          /^["']|["']$/g,
          '',
        )
        .slice(0, 2_000)

    if (!transcript) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No speech could be understood from that voice turn.',
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      success: true,
      transcript,
      model,
    })
  } catch (error) {
    console.error(
      'CRMS transcribe route error:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'Voice transcription is temporarily unavailable.',
      },
      { status: 500 },
    )
  }
}
