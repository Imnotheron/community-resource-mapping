import bcrypt from 'bcryptjs'
import { randomInt, randomUUID } from 'crypto'

import { db } from '@/lib/db'
import { transporter } from '@/lib/email'

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 45 * 1000
export const LOGIN_OTP_MAX_ATTEMPTS = 5

type UserColumn = {
  name: string
}

async function getUserColumns() {
  const columns = await db.$queryRaw<UserColumn[]>`
    PRAGMA table_info("User")
  `

  return new Set(columns.map((column) => column.name))
}

export async function ensureLoginOtpColumns() {
  let columns = await getUserColumns()

  if (!columns.has('loginOtpHash')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "loginOtpHash" TEXT
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('loginOtpExpiresAt')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "loginOtpExpiresAt" DATETIME
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('loginOtpChallengeId')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "loginOtpChallengeId" TEXT
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('loginOtpAttempts')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "loginOtpAttempts" INTEGER NOT NULL DEFAULT 0
    `)
  }

  columns = await getUserColumns()

  if (!columns.has('loginOtpLastSentAt')) {
    await db.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN "loginOtpLastSentAt" DATETIME
    `)
  }

  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_loginOtpChallengeId_key"
    ON "User"("loginOtpChallengeId")
  `)
}

function generateOtp() {
  return String(randomInt(100000, 1000000))
}

export function maskEmail(email: string) {
  const [localPart = '', domain = ''] = String(email).split('@')
  const visible = localPart.slice(0, Math.min(2, localPart.length))
  const hiddenLength = Math.max(2, localPart.length - visible.length)

  return `${visible}${'*'.repeat(hiddenLength)}@${domain}`
}

async function sendOtpEmail(
  email: string,
  name: string,
  otp: string,
) {
  if (
    !process.env.BREVO_SMTP_LOGIN ||
    !process.env.BREVO_SMTP_KEY
  ) {
    throw new Error(
      'Email verification is not configured. Please contact the system administrator.',
    )
  }

  const fromEmail =
    process.env.BREVO_FROM_EMAIL ||
    process.env.BREVO_SMTP_LOGIN

  await transporter.sendMail({
    from: `"San Policarpo CRMS" <${fromEmail}>`,
    to: email,
    subject: 'Your CRMS login verification code',
    text: [
      `Hello ${name},`,
      '',
      `Your CRMS verification code is: ${otp}`,
      '',
      'This code expires in 5 minutes and can be used only once.',
      'If you did not try to sign in, you can ignore this message.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <div style="background:#059669;color:#fff;padding:22px;border-radius:14px 14px 0 0">
          <strong style="font-size:20px">Community Resource Mapping System</strong>
          <div style="margin-top:4px;font-size:13px">San Policarpo, Eastern Samar</div>
        </div>
        <div style="border:1px solid #d1fae5;border-top:0;padding:24px;border-radius:0 0 14px 14px">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Enter this verification code to finish signing in:</p>
          <div style="margin:22px 0;padding:16px;text-align:center;background:#ecfdf5;border-radius:12px;font-size:32px;font-weight:800;letter-spacing:8px;color:#047857">
            ${otp}
          </div>
          <p style="font-size:13px;color:#475569">The code expires in <strong>5 minutes</strong> and can be used only once.</p>
          <p style="font-size:12px;color:#64748b">If you did not try to sign in, you can ignore this email.</p>
        </div>
      </div>
    `,
  })
}

export async function issueLoginOtp(input: {
  userId: string
  email: string
  name: string
  reuseChallengeId?: string | null
}) {
  await ensureLoginOtpColumns()

  const now = new Date()

  const current = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      loginOtpLastSentAt: true,
    },
  })

  if (current?.loginOtpLastSentAt) {
    const elapsed =
      now.getTime() -
      current.loginOtpLastSentAt.getTime()

    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - elapsed) / 1000,
      )

      const error = new Error(
        `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
      ) as Error & { retryAfterSeconds?: number }

      error.retryAfterSeconds = retryAfterSeconds
      throw error
    }
  }

  const otp = generateOtp()
  const challengeId =
    input.reuseChallengeId || randomUUID()
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(
    now.getTime() + OTP_TTL_MS,
  )

  await db.user.update({
    where: { id: input.userId },
    data: {
      loginOtpHash: otpHash,
      loginOtpExpiresAt: expiresAt,
      loginOtpChallengeId: challengeId,
      loginOtpAttempts: 0,
      loginOtpLastSentAt: now,
    },
  })

  try {
    await sendOtpEmail(
      input.email,
      input.name,
      otp,
    )
  } catch (error) {
    await db.user.update({
      where: { id: input.userId },
      data: {
        loginOtpHash: null,
        loginOtpExpiresAt: null,
        loginOtpChallengeId: null,
        loginOtpAttempts: 0,
      },
    })

    throw error
  }

  return {
    challengeId,
    maskedEmail: maskEmail(input.email),
    expiresInSeconds: Math.floor(
      OTP_TTL_MS / 1000,
    ),
    resendAfterSeconds: Math.floor(
      OTP_RESEND_COOLDOWN_MS / 1000,
    ),
  }
}

export async function clearLoginOtp(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      loginOtpHash: null,
      loginOtpExpiresAt: null,
      loginOtpChallengeId: null,
      loginOtpAttempts: 0,
    },
  })
}
