export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { transporter } from '@/lib/email'

// POST - Send a test email notification via Brevo SMTP
export async function POST(request: NextRequest) {
  try {
    const smtpLogin = process.env.BREVO_SMTP_LOGIN
    const smtpKey = process.env.BREVO_SMTP_KEY

    if (!smtpLogin || !smtpKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'Brevo SMTP credentials not configured. Please add BREVO_SMTP_LOGIN and BREVO_SMTP_KEY to .env file.',
          setup: {
            step1: 'Sign up at https://www.brevo.com (free, 300 emails/day)',
            step2: 'Go to Settings → SMTP & API',
            step3: 'Generate an SMTP Key',
            step4: 'Add to .env: BREVO_SMTP_LOGIN=your-login-email@example.com',
            step5: 'Add to .env: BREVO_SMTP_KEY=your-smtp-key',
            step6: 'Add to .env: BREVO_FROM_EMAIL=your-verified-sender@example.com',
          },
        },
        { status: 400 }
      )
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email address is required in request body. Example: { "email": "test@example.com" }' },
        { status: 400 }
      )
    }

    const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph'

    // Verify SMTP connection first
    await transporter.verify()
    console.log('✅ Brevo SMTP connection verified')

    // Send test email
    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: '✅ Test Email - Community Resource Mapping System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🏘️ Test Email</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Community Resource Mapping System</p>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <div style="background: #d1fae5; color: #065f46; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center;">
              <h2>✅ Email System Working!</h2>
              <p>This test confirms that Brevo SMTP email notifications are functioning correctly.</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6;">
              <p><strong>SMTP Host:</strong> smtp-relay.brevo.com</p>
              <p><strong>From:</strong> ${fromEmail}</p>
              <p><strong>To:</strong> ${email}</p>
              <p><strong>Sent At:</strong> ${new Date().toISOString()}</p>
            </div>
          </div>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      details: {
        messageId: info.messageId,
        from: fromEmail,
        to: email,
        smtpHost: 'smtp-relay.brevo.com',
      },
    })
  } catch (error) {
    console.error('❌ Test email failed:', error)
    const err = error as any
    const errorMessage = err?.message || 'Unknown error'
    const smtpCode = err?.responseCode || err?.code || null
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send test email',
        error: errorMessage,
        smtpCode,
        troubleshooting: {
          tip1: 'Verify BREVO_SMTP_LOGIN is your Brevo account email (the one you signed up with)',
          tip2: 'Verify BREVO_SMTP_KEY is a valid SMTP key from Settings → SMTP & API (NOT the API key)',
          tip3: 'Verify BREVO_FROM_EMAIL is a verified sender in Brevo → Senders & IPs',
          tip4: 'Check Brevo dashboard logs for delivery errors',
          tip5: smtpCode === 535 ? '535 = Invalid credentials — regenerate your SMTP key in Brevo' : null,
          tip6: smtpCode === 550 ? '550 = Sender not verified — verify your sender email in Brevo' : null,
        },
      },
      { status: 500 }
    )
  }
}

// GET - Show usage instructions
export async function GET() {
  const isConfigured = !!(process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP_KEY)

  return NextResponse.json({
    message: 'POST to this endpoint to send a test email notification via Brevo SMTP',
    configured: isConfigured,
    usage: {
      method: 'POST',
      body: '{ "email": "recipient@example.com" }',
      contentType: 'application/json',
    },
    requirements: isConfigured
      ? 'Brevo SMTP is configured ✅'
      : 'BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must be set in .env file ❌',
  })
}
