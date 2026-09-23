export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import {
  clearLoginOtp,
  ensureLoginOtpColumns,
  LOGIN_OTP_MAX_ATTEMPTS,
} from '@/lib/login-otp'

export async function POST(request: NextRequest) {
  try {
    const { challengeId, otp } =
      await request.json()

    if (
      !challengeId ||
      !/^\d{6}$/.test(String(otp || ''))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Enter the 6-digit verification code.',
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
        role: true,
        phone: true,
        profilePicture: true,
        temporaryPasswordIssued: true,
        passwordChangedAt: true,
        onboardingReminderDismissedAt: true,
        createdAt: true,
        loginOtpHash: true,
        loginOtpExpiresAt: true,
        loginOtpAttempts: true,
        vulnerableProfile: {
          select: {
            registrationStatus: true,
          },
        },
      },
    })

    if (!user || !user.loginOtpHash) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This verification request is no longer valid. Please sign in again.',
        },
        { status: 400 },
      )
    }

    if (
      !user.loginOtpExpiresAt ||
      user.loginOtpExpiresAt.getTime() <
        Date.now()
    ) {
      await clearLoginOtp(user.id)

      return NextResponse.json(
        {
          success: false,
          message:
            'Your verification code has expired. Please sign in again.',
        },
        { status: 410 },
      )
    }

    if (
      user.loginOtpAttempts >=
      LOGIN_OTP_MAX_ATTEMPTS
    ) {
      await clearLoginOtp(user.id)

      return NextResponse.json(
        {
          success: false,
          message:
            'Too many incorrect attempts. Please sign in again.',
        },
        { status: 429 },
      )
    }

    const valid = await bcrypt.compare(
      String(otp),
      user.loginOtpHash,
    )

    if (!valid) {
      const attempts =
        user.loginOtpAttempts + 1
      const remaining = Math.max(
        0,
        LOGIN_OTP_MAX_ATTEMPTS - attempts,
      )

      if (
        attempts >= LOGIN_OTP_MAX_ATTEMPTS
      ) {
        await clearLoginOtp(user.id)
      } else {
        await db.user.update({
          where: { id: user.id },
          data: {
            loginOtpAttempts: attempts,
          },
        })
      }

      return NextResponse.json(
        {
          success: false,
          message:
            remaining > 0
              ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
              : 'Too many incorrect attempts. Please sign in again.',
          remainingAttempts: remaining,
        },
        {
          status: remaining > 0 ? 401 : 429,
        },
      )
    }

    await clearLoginOtp(user.id)

    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
    ).toString('base64')

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        phone: user.phone || null,
        profilePicture:
          user.profilePicture || null,
        registrationStatus:
          user.vulnerableProfile
            ?.registrationStatus || null,
        temporaryPasswordIssued: Boolean(
          user.temporaryPasswordIssued,
        ),
        passwordChangedAt:
          user.passwordChangedAt
            ? user.passwordChangedAt.toISOString()
            : null,
        onboardingReminderDismissedAt:
          user.onboardingReminderDismissedAt
            ? user.onboardingReminderDismissedAt.toISOString()
            : null,
        createdAt:
          user.createdAt.toISOString(),
      },
      token,
    })

    const isDevelopment =
      process.env.NODE_ENV !== 'production'

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error(
      'OTP verification error:',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to verify the code. Please try again.',
      },
      { status: 500 },
    )
  }
}
