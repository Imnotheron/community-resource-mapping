import { db } from '@/lib/db'
import { NotificationType } from '@prisma/client'
import { transporter } from '@/lib/email'

// Notification templates
const notificationTemplates = {
  ACCOUNT_CREATED: {
    title: 'Account Created',
    message: 'Your account has been created successfully. Please wait for admin approval.',
  },
  ACCOUNT_APPROVED: {
    title: 'Account Approved',
    message: 'Your account has been approved. You can now log in to access the system.',
  },
  ACCOUNT_REJECTED: {
    title: 'Account Rejected',
    message: 'Your account registration was rejected. {reason}',
  },
  DOCUMENTS_NEEDED: {
    title: 'Additional Documents Required',
    message: 'Your account requires additional documents. {reason}',
  },
  RELIEF_APPROVED: {
    title: 'Relief Distribution Approved',
    message: 'Your relief distribution request has been approved. {details}',
  },
  RELIEF_REJECTED: {
    title: 'Relief Distribution Rejected',
    message: 'Your relief distribution request was rejected. {reason}',
  },
  RELIEF_SCHEDULED: {
    title: 'Relief Distribution Scheduled',
    message: 'Your relief distribution has been scheduled for {date} at {location}.',
  },
  RELIEF_DISTRIBUTED: {
    title: 'Relief Goods Received',
    message: 'You have received {items}. Thank you!',
  },
  ANNOUNCEMENT: {
    title: 'New Announcement',
    message: '{details}',
  },
}

export interface CreateNotificationOptions {
  userId: string
  type: NotificationType
  reason?: string
  details?: string
  date?: string
  location?: string
  items?: string
}

// Send email notification via Brevo SMTP (Nodemailer)
async function sendEmailNotification(
  email: string | null,
  subject: string,
  message: string
): Promise<boolean> {
  if (!email) return false

  if (!process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_KEY) {
    console.warn('⚠️ Brevo SMTP credentials not configured. Emails will not be sent.')
    console.warn('   Set BREVO_SMTP_LOGIN and BREVO_SMTP_KEY in your .env file.')
    return false
  }

  try {
    const msg = {
      from: process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph',
      to: email,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏘️ Community Resource Mapping System</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">San Policarpo, Eastern Samar</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #10b981; margin-top: 0;">${subject}</h2>
            <p style="color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              This is an automated message. Please do not reply to this email.<br>
              For inquiries, please contact your local barangay office.
            </p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(msg)
    console.log('📧 Email sent successfully via Brevo to:', email)
    return true
  } catch (error) {
    console.error('❌ Failed to send email via Brevo:', error)
    return false
  }
}

// Create a notification in the database and send email
export async function createNotification(options: CreateNotificationOptions) {
  const { userId, type, reason, details, date, location, items } = options

  const template = notificationTemplates[type]
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`)
  }

  // Replace placeholders in the message
  let message = template.message
  if (reason) message = message.replace('{reason}', reason)
  if (details) message = message.replace('{details}', details)
  if (date) message = message.replace('{date}', date)
  if (location) message = message.replace('{location}', location)
  if (items) message = message.replace('{items}', items)

  // Create notification in database
  const notification = await db.notification.create({
    data: {
      userId,
      type,
      title: template.title,
      message,
      status: 'PENDING',
    },
  })

  // Get user details
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })

  if (!user) {
    console.error('User not found for notification:', userId)
    return notification
  }

  // Send email notification via Brevo
  const emailSent = await sendEmailNotification(user.email, template.title, message)

  // Update notification status
  await db.notification.update({
    where: { id: notification.id },
    data: {
      sentViaEmail: emailSent,
      sentViaSms: false,
      emailSentAt: emailSent ? new Date() : null,
      smsSentAt: null,
      status: emailSent ? 'SENT' : 'FAILED',
    },
  })

  console.log('📬 Notification created:', {
    to: user.name,
    email: user.email,
    type,
    emailSent,
  })

  return notification
}

// Get all notifications for a user
export async function getUserNotifications(userId: string) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

// Mark notification as read
export async function markNotificationRead(notificationId: string) {
  return db.notification.update({
    where: { id: notificationId },
    data: { status: 'SENT' },
  })
}
