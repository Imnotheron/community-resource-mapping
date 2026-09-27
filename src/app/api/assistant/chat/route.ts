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

function localAnswer(message: string, role: string) {
  const text = message.toLowerCase()

  if (text.includes('operations history') || text.includes('activity history')) {
    return role === 'WORKER'
      ? 'Open Activity History from the Worker navigation. Use Relief Distribution History for your recorded relief transactions and Events & Activities for worker-visible municipal events. Search and filters can narrow the list by date and other available fields.'
      : 'Open Operations History from the Administrator navigation. It combines relief records and municipal events. Use the search, type, barangay, status, audience, and date controls to narrow historical records.'
  }

  if (text.includes('register') || text.includes('registration')) {
    return role === 'VULNERABLE'
      ? 'Your account lets you review your registered information. If a record needs correction, use the official feedback or municipal support process instead of creating a duplicate profile.'
      : 'Use the registration section and complete each required step carefully. Confirm identity, contact information, barangay, map location, vulnerability details, and required documents before submitting.'
  }

  if (text.includes('report')) {
    return 'Open Daily Reports, choose the date and available filters, then review the generated values before printing. Report templates and signatories are managed from the report controls when your role is allowed to edit them.'
  }

  if (text.includes('map') || text.includes('marker')) {
    return 'The vulnerable map uses red for households needing assistance or whose recent-relief window has expired, yellow for approved citizens with no approved relief yet, and green for recently given approved relief. Green automatically expires after the configured marker cycle.'
  }

  if (text.includes('announcement')) {
    return role === 'ADMIN'
      ? 'Administrators can create announcements, choose the audience and priority, reuse presets, and review the message before publishing.'
      : 'Community Updates shows active official notices for your role. Use the available search and filters to find the notice you need.'
  }

  if (text.includes('feedback')) {
    return role === 'ADMIN'
      ? 'Open Feedback to review submitted concerns, respond when appropriate, and track the current feedback status.'
      : 'Open Feedback to send a factual concern or assistance-related message. Do not include passwords or unrelated sensitive information.'
  }

  return 'I can explain CRMS navigation and workflows such as registration, relief recording, Operations or Activity History, reports, announcements, feedback, analytics, and the vulnerable map. Ask me what you want to do and I will give the steps.'
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
      ) || 'gemini-2.5-flash-lite'

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        provider: 'local-help',
        reply: localAnswer(message, auth.role),
      })
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

      return NextResponse.json({
        success: true,
        provider: 'local-help',
        reply: localAnswer(message, auth.role),
      })
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
      reply:
        reply ||
        localAnswer(message, auth.role),
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
