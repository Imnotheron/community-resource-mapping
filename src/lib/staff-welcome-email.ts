import nodemailer from 'nodemailer'

export type StaffWelcomeRole = 'ADMIN' | 'WORKER'

export type StaffWelcomeEmailResult = {
  success: boolean
  provider: 'BREVO_SMTP' | 'NONE'
  message: string
  messageId?: string
  errorCode?: string
}

type DeliveryInput = {
  email: string
  name: string
  role: StaffWelcomeRole
  temporaryPassword: string
}

function envValue(name: string) {
  return String(process.env[name] || '').trim()
}

function resolveAppUrl() {
  const explicitUrl = envValue('NEXT_PUBLIC_APP_URL')

  if (explicitUrl) {
    return explicitUrl
  }

  const productionHost = envValue(
    'VERCEL_PROJECT_PRODUCTION_URL',
  )

  if (productionHost) {
    return `https://${productionHost}`
  }

  const deploymentHost = envValue('VERCEL_URL')

  if (deploymentHost) {
    return `https://${deploymentHost}`
  }

  return 'http://localhost:3000'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function roleLabel(role: StaffWelcomeRole) {
  return role === 'ADMIN'
    ? 'Administrator'
    : 'Field Worker'
}

function buildWelcomeHtml(input: DeliveryInput) {
  const safeName = escapeHtml(input.name)
  const safeEmail = escapeHtml(input.email)
  const safePassword = escapeHtml(
    input.temporaryPassword,
  )
  const safeRole = roleLabel(input.role)
  const appUrl = escapeHtml(resolveAppUrl())

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px">
    <div style="overflow:hidden;border-radius:18px;background:#ffffff;box-shadow:0 12px 36px rgba(15,23,42,.12)">
      <div style="background:linear-gradient(135deg,#059669,#0f766e);padding:30px;color:#ffffff;text-align:center">
        <div style="font-size:25px;font-weight:700">Community Resource Mapping System</div>
        <div style="margin-top:7px;font-size:14px;opacity:.9">San Policarpo, Eastern Samar</div>
      </div>

      <div style="padding:30px">
        <h1 style="margin:0 0 16px;font-size:24px;color:#047857">Your account is ready</h1>
        <p style="line-height:1.7">Dear <strong>${safeName}</strong>,</p>
        <p style="line-height:1.7">
          An account has been created for you in the Community Resource Mapping System.
        </p>

        <div style="margin:22px 0;border:1px solid #d1fae5;border-left:5px solid #10b981;border-radius:12px;background:#ecfdf5;padding:18px">
          <p style="margin:0 0 10px"><strong>Role:</strong> ${safeRole}</p>
          <p style="margin:0 0 10px"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin:0"><strong>Temporary password:</strong>
            <span style="display:inline-block;margin-left:6px;padding:5px 8px;border-radius:6px;background:#ffffff;font-family:monospace;font-size:16px;font-weight:700">${safePassword}</span>
          </p>
        </div>

        <div style="margin:20px 0;border-radius:12px;background:#fff7ed;padding:16px;color:#9a3412;line-height:1.6">
          <strong>Security notice:</strong>
          Sign in using the temporary password and replace it immediately when prompted.
          Do not share this password.
        </div>

        <div style="text-align:center;margin-top:26px">
          <a href="${appUrl}" style="display:inline-block;border-radius:9px;background:#059669;padding:13px 24px;color:#ffffff;text-decoration:none;font-weight:700">
            Sign in to CRMS
          </a>
        </div>
      </div>

      <div style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:18px;text-align:center;color:#64748b;font-size:12px">
        This is an automated account notification.
      </div>
    </div>
  </div>
</body>
</html>`
}

function buildWelcomeText(input: DeliveryInput) {
  return [
    'Community Resource Mapping System',
    '',
    `Dear ${input.name},`,
    '',
    'Your account has been created.',
    `Role: ${roleLabel(input.role)}`,
    `Email: ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    '',
    'Sign in and replace the temporary password immediately.',
    resolveAppUrl(),
  ].join('\n')
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error)
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function createBrevoTransporter() {
  const smtpLogin = envValue('BREVO_SMTP_LOGIN')
  const smtpKey = envValue('BREVO_SMTP_KEY')

  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: smtpLogin,
      pass: smtpKey,
    },
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    connectionTimeout: 12_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
}

export function getStaffEmailConfiguration() {
  const required = [
    'BREVO_SMTP_LOGIN',
    'BREVO_SMTP_KEY',
    'BREVO_FROM_EMAIL',
  ] as const

  const missingVariables = required.filter(
    (name) => !envValue(name),
  )

  return {
    configured: missingVariables.length === 0,
    apiConfigured: false,
    smtpConfigured: missingVariables.length === 0,
    senderEmailConfigured: Boolean(
      envValue('BREVO_FROM_EMAIL'),
    ),
    preferredProvider:
      missingVariables.length === 0
        ? 'BREVO_SMTP'
        : 'NONE',
    missingVariables,
  } as const
}

async function sendOnce(
  input: DeliveryInput,
): Promise<StaffWelcomeEmailResult> {
  const configuration =
    getStaffEmailConfiguration()

  if (!configuration.configured) {
    return {
      success: false,
      provider: 'NONE',
      message: `Vercel Production is missing: ${configuration.missingVariables.join(
        ', ',
      )}.`,
      errorCode:
        'EMAIL_PROVIDER_NOT_CONFIGURED',
    }
  }

  const senderEmail = envValue(
    'BREVO_FROM_EMAIL',
  )
  const senderName =
    envValue('BREVO_FROM_NAME') ||
    'San Policarpo CRMS'

  const transporter =
    createBrevoTransporter()

  try {
    const info =
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: {
          address: input.email,
          name: input.name,
        },
        subject:
          'Your CRMS account and temporary password',
        html: buildWelcomeHtml(input),
        text: buildWelcomeText(input),
      })

    const accepted = Array.isArray(
      info.accepted,
    )
      ? info.accepted.length
      : 0

    if (accepted < 1) {
      return {
        success: false,
        provider: 'BREVO_SMTP',
        message:
          'Brevo did not accept the recipient address.',
        errorCode:
          'BREVO_SMTP_RECIPIENT_REJECTED',
      }
    }

    console.log(
      '[Email] Staff welcome accepted by Brevo:',
      {
        recipient: input.email,
        messageId: info.messageId,
      },
    )

    return {
      success: true,
      provider: 'BREVO_SMTP',
      message:
        'Brevo SMTP accepted the welcome email.',
      messageId:
        typeof info.messageId === 'string'
          ? info.messageId
          : undefined,
    }
  } catch (error) {
    const message =
      safeErrorMessage(error)

    console.error(
      '[Email] Staff welcome SMTP failure:',
      {
        recipient: input.email,
        message,
      },
    )

    return {
      success: false,
      provider: 'BREVO_SMTP',
      message,
      errorCode:
        'BREVO_SMTP_SEND_FAILED',
    }
  } finally {
    transporter.close()
  }
}

export async function sendStaffWelcomeEmail(
  input: DeliveryInput,
): Promise<StaffWelcomeEmailResult> {
  let lastResult =
    await sendOnce(input)

  if (lastResult.success) {
    return lastResult
  }

  if (
    lastResult.errorCode !==
    'BREVO_SMTP_SEND_FAILED'
  ) {
    return lastResult
  }

  await wait(750)
  lastResult = await sendOnce(input)

  return lastResult
}
