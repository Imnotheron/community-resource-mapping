export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { requireRequestUser } from '@/lib/request-user-session'

type ChatMessage = {
  role?: string
  content?: string
}

function cleanText(value: unknown, max = 2000) {
  return String(value || '').trim().slice(0, max)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const message = cleanText(body.message)

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'A message is required' },
        { status: 400 },
      )
    }

    const history = Array.isArray(body.history)
      ? (body.history as ChatMessage[])
          .slice(-8)
          .map((item) => ({
            role:
              item.role === 'assistant'
                ? 'model'
                : 'user',
            parts: [
              {
                text: cleanText(item.content, 1500),
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

    const systemInstruction = [
      'You are the CRMS in-app assistant for the Community Resource Mapping System of San Policarpo, Eastern Samar.',
      `The signed-in role is ${auth.role}.`,
      'Give concise, practical instructions about how to use CRMS.',
      'Do not invent citizen records, distribution history, map coordinates, approvals, or report totals.',
      'Do not claim an action was completed unless the user completed it in the interface.',
      'Never ask for passwords, OTPs, or unnecessary sensitive personal information.',
      'If asked for data that is not present in the conversation, explain where in CRMS the user can verify it.',
      'Administrator areas include Overview, Approval Center, Registrations, Users, Relief Approval, Operations History, Announcements, Feedback, Analytics, Vulnerable Map, Daily Reports, and User Guide.',
      'Worker areas include Dashboard, My Relief Records, Activity History, Record Relief, Register Citizen, Field Notes, Community Updates, Daily Reports, and Help Guide.',
      'Vulnerable Citizen areas include Home, My Information, My Relief History, Send Feedback, Community Updates, and Help Guide.',
      'Keep answers short unless the user asks for detail.',
    ].join(' ')

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
            temperature: 0.25,
            maxOutputTokens: 500,
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
            'The AI provider did not accept the request. Check GEMINI_API_KEY, GEMINI_MODEL, and the server console.',
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
      5000,
    )

    return NextResponse.json({
      success: true,
      provider: 'gemini',
      model,
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
