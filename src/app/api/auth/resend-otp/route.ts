export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  ensureLoginOtpColumns,
  issueLoginOtp,
} from '@/lib/login-otp'

export async function POST(request: NextRequest) {
  try {
    const { challengeId } =
      await request.json()

    if (!challengeId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing verification request.',
        },
        { status: 400 },
      )
    }

    await ensureLoginOtpColumns()

    const user = await db.user.findUnique({
      where: {
        loginOtpChallengeId:
          String(challengeId),
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This verification request is no longer valid. Please sign in again.',
        },
        { status: 400 },
      )
    }

    try {
      const challenge = await issueLoginOtp({
        userId: user.id,
        email: user.email,
        name: user.name,
        reuseChallengeId:
          String(challengeId),
      })

      return NextResponse.json({
        success: true,
        otpRequired: true,
        message:
          'A new verification code was sent to your email.',
        ...challenge,
      })
    } catch (error) {
      const retryAfterSeconds =
        error instanceof Error &&
        'retryAfterSeconds' in error
          ? Number(
              (
                error as Error & {
                  retryAfterSeconds?: number
                }
              ).retryAfterSeconds,
            )
          : undefined

      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to resend the verification code.',
          ...(retryAfterSeconds
            ? { retryAfterSeconds }
            : {}),
        },
        {
          status: retryAfterSeconds ? 429 : 503,
        },
      )
    }
  } catch (error) {
    console.error('OTP resend error:', error)

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to resend the verification code.',
      },
      { status: 500 },
    )
  }
}
