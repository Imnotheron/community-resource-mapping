import nodemailer from 'nodemailer'
import { db } from '@/lib/db'

type AnnouncementEmailInput = {
  id: string
  title: string
  content: string
  type?: string | null
  priority?: string | null
  targetRole?: string | null
  eventDate?: string | null
  eventTime?: string | null
  location?: string | null
  createdAt?: string | null
}

type Recipient = {
  id: string
  name: string | null
  email: string | null
  role: string | null
}

const ROLE_LABELS: Record<string, string> = {
  ALL: 'Everyone',
  ADMIN: 'Administrators',
  WORKER: 'Field workers',
  VULNERABLE: 'Citizens',
}

function clean(value: unknown) {
  return String(value || '').trim()
}

function htmlEscape(value: unknown) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(value?: string | null) {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return clean(value)
  }
}

function normalizeTargetRole(value?: string | null) {
  const role = clean(value).toUpperCase()
  if (!role || role === 'ALL' || role === 'EVERYONE') return 'ALL'
  if (role.includes('WORKER')) return 'WORKER'
  if (role.includes('VULNERABLE') || role.includes('CITIZEN')) return 'VULNERABLE'
  if (role.includes('ADMIN')) return 'ADMIN'
  return 'ALL'
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  )
}

function getFromAddress() {
  const fromEmail =
    process.env.BREVO_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.BREVO_SMTP_LOGIN ||
    ''

  if (!fromEmail) return ''

  const fromName = process.env.BREVO_FROM_NAME || process.env.SMTP_FROM_NAME || 'CRMS San Policarpo'
  return `${fromName} <${fromEmail}>`
}

function getSmtpConfig() {
  const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com'
  const port = Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587)
  const user = process.env.BREVO_SMTP_LOGIN || process.env.SMTP_USER || process.env.SMTP_USERNAME || ''
  const pass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''
  const from = getFromAddress()

  return {
    configured: Boolean(host && port && user && pass && from),
    host,
    port,
    user,
    pass,
    from,
  }
}

function createTransporter() {
  const config = getSmtpConfig()

  if (!config.configured) return null

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

async function getRecipients(targetRole: string): Promise<Recipient[]> {
  const role = normalizeTargetRole(targetRole)

  const users = await db.user.findMany({
    where: role === 'ALL' ? {} : { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 500,
  })

  return users
}

function buildAnnouncementEmail(announcement: AnnouncementEmailInput, recipient: Recipient) {
  const priority = clean(announcement.priority || 'NORMAL').toUpperCase()
  const type = clean(announcement.type || 'GENERAL').toUpperCase().replace(/_/g, ' ')
  const audience = ROLE_LABELS[normalizeTargetRole(announcement.targetRole)] || 'Everyone'
  const appUrl = getAppUrl()
  const eventDate = formatDate(announcement.eventDate)
  const eventTime = clean(announcement.eventTime)
  const location = clean(announcement.location)
  const isUrgent = priority === 'URGENT' || priority === 'HIGH'

  const subjectPrefix = isUrgent ? `[${priority} CRMS Advisory]` : '[CRMS Announcement]'
  const subject = `${subjectPrefix} ${announcement.title}`

  const metaRows = [
    ['Type', type],
    ['Priority', priority],
    ['Audience', audience],
    eventDate ? ['Event date', eventTime ? `${eventDate} · ${eventTime}` : eventDate] : null,
    location ? ['Location', location] : null,
  ].filter(Boolean) as Array<[string, string]>

  const text = [
    `Hello ${recipient.name || 'CRMS user'},`,
    '',
    announcement.title,
    '',
    announcement.content,
    '',
    ...metaRows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Open CRMS: ${appUrl}`,
    '',
    'This is an official announcement from the Community Resource Mapping System of San Policarpo.',
  ].join('\n')

  const htmlMetaRows = metaRows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;width:110px;">${htmlEscape(label)}</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;">${htmlEscape(value)}</td>
        </tr>`
    )
    .join('')

  const html = `
  <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
      <div style="border:1px solid #dbe7e2;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
        <div style="padding:22px 24px;background:linear-gradient(135deg,#0f766e,#064e3b);color:white;">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.85;">Community Resource Mapping System</div>
          <h1 style="margin:10px 0 0;font-size:22px;line-height:1.25;font-weight:700;">${htmlEscape(announcement.title)}</h1>
        </div>

        <div style="padding:24px;">
          <p style="margin:0 0 14px;font-size:14px;color:#334155;">Hello ${htmlEscape(recipient.name || 'CRMS user')},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#0f172a;white-space:pre-line;">${htmlEscape(announcement.content)}</p>

          <div style="margin:18px 0;border:1px solid #e2e8f0;background:#f8fafc;border-radius:16px;padding:14px 16px;">
            <table role="presentation" style="border-collapse:collapse;width:100%;">
              ${htmlMetaRows}
            </table>
          </div>

          <a href="${htmlEscape(appUrl)}" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;padding:12px 16px;border-radius:12px;font-size:14px;font-weight:700;">Open CRMS</a>

          <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
            This is an official announcement from the Community Resource Mapping System of San Policarpo.
          </p>
        </div>
      </div>
    </div>
  </div>`

  return { subject, text, html }
}

export async function sendAnnouncementEmailNotifications(announcement: AnnouncementEmailInput) {
  const smtp = getSmtpConfig()

  if (!smtp.configured) {
    return {
      configured: false,
      sent: 0,
      failed: 0,
      attempted: 0,
      recipients: 0,
      skippedNoEmail: 0,
      message:
        'SMTP email is not configured. Add BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_FROM_EMAIL to .env.local.',
    }
  }

  const transporter = createTransporter()

  if (!transporter) {
    return {
      configured: false,
      sent: 0,
      failed: 0,
      attempted: 0,
      recipients: 0,
      skippedNoEmail: 0,
      message: 'SMTP transporter could not be created.',
    }
  }

  const recipients = await getRecipients(normalizeTargetRole(announcement.targetRole))
  const deliverable = recipients.filter((user) => clean(user.email))
  const skippedNoEmail = recipients.length - deliverable.length

  let sent = 0
  let failed = 0

  // Send one-by-one to avoid exposing citizen emails to other recipients.
  for (const recipient of deliverable) {
    try {
      const email = buildAnnouncementEmail(announcement, recipient)

      await transporter.sendMail({
        from: smtp.from,
        to: recipient.email!,
        subject: email.subject,
        text: email.text,
        html: email.html,
      })

      sent += 1
    } catch (error) {
      failed += 1
      console.error(`Failed to send announcement email to ${recipient.email}:`, error)
    }
  }

  return {
    configured: true,
    sent,
    failed,
    attempted: deliverable.length,
    recipients: recipients.length,
    skippedNoEmail,
    message:
      failed > 0
        ? `Announcement saved. ${sent} email(s) sent, ${failed} failed.`
        : `Announcement saved. ${sent} email(s) sent.`,
  }
}
