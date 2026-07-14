import { transporter } from '@/lib/email'

export type StaffWelcomeRole = 'ADMIN' | 'WORKER'

export type StaffWelcomeEmailResult = {
  success: boolean
  provider: 'BREVO_API' | 'BREVO_SMTP' | 'NONE'
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

const BREVO_API_URL =
  'https://api.brevo.com/v3/smtp/email'

function resolveSenderEmail() {
  return (
    process.env.BREVO_FROM_EMAIL?.trim() ||
    process.env.BREVO_SMTP_LOGIN?.trim() ||
    ''
  )
}

function resolveSenderName() {
  return (
    process.env.BREVO_FROM_NAME?.trim() ||
    'San Policarpo CRMS'
  )
}

function resolveAppUrl() {
  const explicitUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (explicitUrl) {
    return explicitUrl
  }

  const productionHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()

  if (productionHost) {
    return `https://${productionHost}`
  }

  const deploymentHost =
    process.env.VERCEL_URL?.trim()

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

function timeoutPromise<T>(
  milliseconds: number,
  message: string,
) {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message))
    }, milliseconds)
  })
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error)
}

async function readBrevoError(
  response: Response,
) {
  try {
    const data = await response.json()

    const message =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : `Brevo returned HTTP ${response.status}.`

    const code =
      typeof data?.code === 'string'
        ? data.code
        : `HTTP_${response.status}`

    return { message, code }
  } catch {
    return {
      message: `Brevo returned HTTP ${response.status}.`,
      code: `HTTP_${response.status}`,
    }
  }
}

async function sendThroughBrevoApi(
  input: DeliveryInput,
): Promise<StaffWelcomeEmailResult> {
  const apiKey =
    process.env.BREVO_API_KEY?.trim()
  const senderEmail = resolveSenderEmail()

  if (!apiKey || !senderEmail) {
    return {
      success: false,
      provider: 'BREVO_API',
      message:
        'Brevo API is not fully configured.',
      errorCode: !apiKey
        ? 'MISSING_BREVO_API_KEY'
        : 'MISSING_BREVO_FROM_EMAIL',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    18_000,
  )

  try {
    const response = await fetch(
      BREVO_API_URL,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'content-type':
            'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: resolveSenderName(),
            email: senderEmail,
          },
          to: [
            {
              email: input.email,
              name: input.name,
            },
          ],
          subject:
            'Your CRMS account and temporary password',
          htmlContent:
            buildWelcomeHtml(input),
          textContent:
            buildWelcomeText(input),
          tags: [
            'crms',
            'staff-welcome',
          ],
        }),
      },
    )

    if (!response.ok) {
      const failure =
        await readBrevoError(response)

      return {
        success: false,
        provider: 'BREVO_API',
        message: failure.message,
        errorCode: failure.code,
      }
    }

    const data = await response
      .json()
      .catch(() => ({}))

    return {
      success: true,
      provider: 'BREVO_API',
      message:
        'Brevo accepted the welcome email.',
      messageId:
        typeof data?.messageId ===
        'string'
          ? data.messageId
          : undefined,
    }
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      error.name === 'AbortError'

    return {
      success: false,
      provider: 'BREVO_API',
      message: isTimeout
        ? 'Brevo API request timed out.'
        : safeErrorMessage(error),
      errorCode: isTimeout
        ? 'BREVO_API_TIMEOUT'
        : 'BREVO_API_REQUEST_FAILED',
    }
  } finally {
    clearTimeout(timer)
  }
}

async function sendThroughBrevoSmtp(
  input: DeliveryInput,
): Promise<StaffWelcomeEmailResult> {
  const smtpLogin =
    process.env.BREVO_SMTP_LOGIN?.trim()
  const smtpKey =
    process.env.BREVO_SMTP_KEY?.trim()
  const senderEmail = resolveSenderEmail()

  if (
    !smtpLogin ||
    !smtpKey ||
    !senderEmail
  ) {
    const missing = [
      !smtpLogin
        ? 'BREVO_SMTP_LOGIN'
        : null,
      !smtpKey
        ? 'BREVO_SMTP_KEY'
        : null,
      !senderEmail
        ? 'BREVO_FROM_EMAIL'
        : null,
    ].filter(Boolean)

    return {
      success: false,
      provider: 'BREVO_SMTP',
      message: `Brevo SMTP is not fully configured. Missing: ${missing.join(
        ', ',
      )}.`,
      errorCode:
        'BREVO_SMTP_NOT_CONFIGURED',
    }
  }

  try {
    const info = await Promise.race([
      transporter.sendMail({
        from: `"${resolveSenderName()}" <${senderEmail}>`,
        to: {
          address: input.email,
          name: input.name,
        },
        subject:
          'Your CRMS account and temporary password',
        html: buildWelcomeHtml(input),
        text: buildWelcomeText(input),
      }),
      timeoutPromise<never>(
        18_000,
        'Brevo SMTP request timed out.',
      ),
    ])

    return {
      success: true,
      provider: 'BREVO_SMTP',
      message:
        'Brevo SMTP accepted the welcome email.',
      messageId:
        typeof info?.messageId ===
        'string'
          ? info.messageId
          : undefined,
    }
  } catch (error) {
    return {
      success: false,
      provider: 'BREVO_SMTP',
      message:
        safeErrorMessage(error),
      errorCode:
        'BREVO_SMTP_SEND_FAILED',
    }
  }
}

function shouldRetry(
  result: StaffWelcomeEmailResult,
) {
  return [
    'BREVO_API_TIMEOUT',
    'BREVO_API_REQUEST_FAILED',
    'HTTP_408',
    'HTTP_429',
    'HTTP_500',
    'HTTP_502',
    'HTTP_503',
    'HTTP_504',
    'BREVO_SMTP_SEND_FAILED',
  ].includes(result.errorCode || '')
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

export function getStaffEmailConfiguration() {
  const senderEmail = resolveSenderEmail()
  const apiConfigured = Boolean(
    process.env.BREVO_API_KEY?.trim() &&
      senderEmail,
  )
  const smtpConfigured = Boolean(
    process.env.BREVO_SMTP_LOGIN?.trim() &&
      process.env.BREVO_SMTP_KEY?.trim() &&
      senderEmail,
  )

  return {
    configured:
      apiConfigured || smtpConfigured,
    apiConfigured,
    smtpConfigured,
    senderEmailConfigured: Boolean(
      senderEmail,
    ),
    preferredProvider:
      apiConfigured
        ? 'BREVO_API'
        : smtpConfigured
          ? 'BREVO_SMTP'
          : 'NONE',
  } as const
}

export async function sendStaffWelcomeEmail(
  input: DeliveryInput,
): Promise<StaffWelcomeEmailResult> {
  const configuration =
    getStaffEmailConfiguration()

  if (!configuration.configured) {
    return {
      success: false,
      provider: 'NONE',
      message:
        'No production email provider is configured. Add BREVO_API_KEY and BREVO_FROM_EMAIL in Vercel, or configure BREVO_SMTP_LOGIN and BREVO_SMTP_KEY.',
      errorCode:
        'EMAIL_PROVIDER_NOT_CONFIGURED',
    }
  }

  const methods: Array<
    (
      input: DeliveryInput,
    ) => Promise<StaffWelcomeEmailResult>
  > = []

  if (configuration.apiConfigured) {
    methods.push(sendThroughBrevoApi)
  }

  if (configuration.smtpConfigured) {
    methods.push(sendThroughBrevoSmtp)
  }

  let lastResult: StaffWelcomeEmailResult =
    {
      success: false,
      provider: 'NONE',
      message:
        'No email delivery method was attempted.',
      errorCode:
        'NO_EMAIL_METHOD',
    }

  for (const method of methods) {
    for (
      let attempt = 1;
      attempt <= 2;
      attempt += 1
    ) {
      lastResult = await method(input)

      if (lastResult.success) {
        return lastResult
      }

      if (
        attempt < 2 &&
        shouldRetry(lastResult)
      ) {
        await wait(700)
        continue
      }

      break
    }
  }

  return lastResult
}
