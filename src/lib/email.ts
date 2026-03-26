import nodemailer from 'nodemailer'

// Export transporter so notification-service.ts can reuse it

// Create Brevo SMTP transporter
// Docs: https://developers.brevo.com/docs/send-a-transactional-email
// user = your Brevo account login email
// pass = SMTP key generated from Brevo dashboard (Settings → SMTP & API)
export const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_KEY
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certs on relay
  }
})

// Verify SMTP connection at startup and log result clearly
async function verifyEmailConnection() {
  if (!process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_KEY) {
    console.warn('⚠️  [Email] Brevo SMTP not configured — BREVO_SMTP_LOGIN or BREVO_SMTP_KEY is missing.')
    return
  }
  try {
    await transporter.verify()
    console.log('✅ [Email] Brevo SMTP connection verified — emails will send.')
  } catch (err: any) {
    console.error('❌ [Email] Brevo SMTP connection FAILED:', err.message)
    console.error('   → Check BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and that your sender is verified at app.brevo.com')
  }
}

// Call once at module load (dev server startup)
verifyEmailConnection()

export async function sendWelcomeEmail(email: string, name: string, role: string, temporaryPassword?: string) {
  try {
    const msg = {
      from: `"San Policarpo CRMS" <${process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph'}>`,
      to: email,
      subject: 'Your Account Has Been Created - San Policarpo Community Resource Mapping System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .role-badge { display: inline-block; background: #ecfdf5; color: #10b981; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 12px; margin-top: 10px; }
            .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 12px; }
            .button { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🏘️ Community Resource Mapping System</div>
              <p>San Policarpo, Eastern Samar</p>
            </div>
            
            <div class="content">
              <h2 style="color: #10b981;">Welcome to the Community Resource Mapping System!</h2>
              
              <p>Dear <strong>${name}</strong>,</p>
              
              <p>We're pleased to inform you that your account has been successfully created in the San Policarpo Community Resource Mapping System. You can now access the system to:</p>
              
              <div class="info-box">
                <ul style="margin: 0; padding-left: 20px;">
                  <li>View announcements and updates about relief distributions</li>
                  <li>Track your relief distribution history</li>
                  <li>Submit feedback and reports</li>
                  <li>Stay informed about community services</li>
                </ul>
              </div>
              
              <div class="info-box">
                <p><strong>Your Role:</strong> ${role.charAt(0) + role.slice(1).toLowerCase()}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${temporaryPassword ? `
                <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
                <p style="font-size: 12px; color: #e11d48; margin-top: 8px;"><strong>⚠️ Security Notice:</strong> Please log in and change this temporary password immediately.</p>
                ` : ''}
              </div>
              
              <p>You can now log in to your account at any time using your email address and password.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="button">
                  Log In to Your Account
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
                If you have any questions or need assistance, please contact the system administrator.
              </p>
            </div>
            
            <div class="footer">
              <p>© 2026 San Policarpo Municipal Government | Community Resource Mapping System</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    const info = await transporter.sendMail(msg)
    console.log('Email sent:', info.messageId)
    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, message: 'Failed to send email', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendAccountApprovedEmail(email: string, name: string, temporaryPassword?: string) {
  try {
    const msg = {
      from: `"San Policarpo CRMS" <${process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph'}>`,
      to: email,
      subject: 'Account Approved - You Can Now Access the System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .success-box { background: #d1fae5; color: #065f46; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>🏘️</div>
              <h1>Account Approved!</h1>
            </div>
            
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              
              <div class="success-box">
                <h2>🎉 Good News!</h2>
                <p>Your account has been approved by the administrator.</p>
              </div>
              
              <p>You now have full access to all features of the Community Resource Mapping System.</p>
              
              <p><strong>What You Can Do:</strong></p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>View and manage your profile information</li>
                <li>Check relief distribution schedules</li>
                <li>Submit feedback on received assistance</li>
                <li>View important announcements</li>
              <br>
              <div class="info-box" style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6;">
                <p><strong>Email:</strong> ${email}</p>
                ${temporaryPassword ? `
                <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
                <p style="font-size: 12px; color: #e11d48; margin-top: 8px;"><strong>⚠️ Security Notice:</strong> Please log in and change this temporary password immediately.</p>
                ` : ''}
              </div>
              <p>You can now log in to your account at any time.</p>
            </div>
            
            <div class="footer">
              <p>© 2026 San Policarpo Municipal Government</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    const info = await transporter.sendMail(msg)
    console.log('Email sent:', info.messageId)
    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, message: 'Failed to send email', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendAnnouncementEmail(email: string, name: string, announcement: any) {
  try {
    const msg = {
      from: `"San Policarpo CRMS" <${process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph'}>`,
      to: email,
      subject: `📢 ${announcement.title} - ${announcement.type}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .info-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .event-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>📢</div>
              <h1>${announcement.title}</h1>
              <p>${announcement.type.replace(/_/g, ' ')}</p>
            </div>

            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              <p>${announcement.content}</p>

              ${announcement.eventDate || announcement.eventTime || announcement.location ? `
                <div class="event-details">
                  <h3>Event Details:</h3>
                  ${announcement.eventDate ? `<p><strong>Date:</strong> ${new Date(announcement.eventDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                  ${announcement.eventTime ? `<p><strong>Time:</strong> ${announcement.eventTime}</p>` : ''}
                  ${announcement.location ? `<p><strong>Location:</strong> ${announcement.location}</p>` : ''}
                </div>
              ` : ''}

              <p>Please check your dashboard for more details.</p>
            </div>

            <div class="footer">
              <p>© 2026 San Policarpo Municipal Government</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    const info = await transporter.sendMail(msg)
    console.log('Email sent:', info.messageId)
    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, message: 'Failed to send email', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendVulnerableRegistrationApprovedEmail(
  email: string,
  name: string,
  temporaryPassword?: string
) {
  try {
    const msg = {
      from: `"San Policarpo CRMS" <${process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph'}>`,
      to: email,
      subject: '✅ Registration Approved - Your Account is Ready',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .success-box { background: #d1fae5; color: #065f46; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 12px; }
            .button { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>🏘️</div>
              <h1>Registration Approved!</h1>
              <p>San Policarpo Community Resource Mapping System</p>
            </div>

            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>

              <div class="success-box">
                <h2>🎉 Congratulations!</h2>
                <p>Your registration has been reviewed and approved by the administrator.</p>
              </div>

              <p>Your account has been created and you now have access to the Community Resource Mapping System. You will be able to:</p>

              <ul style="margin: 20px 0; padding-left: 20px;">
                <li>View announcements and updates about relief distributions</li>
                <li>Track your relief distribution history</li>
                <li>Submit feedback on received assistance</li>
                <li>View important community announcements</li>
              </ul>

              <div class="info-box">
                <p><strong>Email:</strong> ${email}</p>
                ${temporaryPassword ? `
                <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
                <p style="font-size: 12px; color: #e11d48; margin-top: 8px;"><strong>⚠️ Security Notice:</strong> Please log in and change this temporary password immediately.</p>
                ` : `
                <p><strong>Login Instructions:</strong> Please use your email address and your existing password to log in to your account.</p>
                `}
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="button">
                  Log In to Your Account
                </a>
              </div>

              <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
                If you have any questions or need assistance, please contact the system administrator.
              </p>
            </div>

            <div class="footer">
              <p>© 2026 San Policarpo Municipal Government | Community Resource Mapping System</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    const info = await transporter.sendMail(msg)
    console.log('Email sent:', info.messageId)
    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, message: 'Failed to send email', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendVulnerableRegistrationRejectedEmail(
  email: string,
  name: string,
  rejectionReason: string
) {
  try {
    const msg = {
      from: `"San Policarpo CRMS" <${process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph'}>`,
      to: email,
      subject: '📋 Account Registration Update — San Policarpo Community Resource Mapping System',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#fff7ed; font-family:'Segoe UI',Arial,sans-serif; }
    .wrapper { padding:30px 15px; }
    .container { max-width:600px; margin:0 auto; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.10); }
    .header { background:linear-gradient(135deg,#f97316 0%,#ea580c 60%,#c2410c 100%); padding:40px 30px 35px; text-align:center; }
    .header-icon { font-size:48px; margin-bottom:12px; }
    .header h1 { color:#fff; margin:0 0 6px; font-size:26px; font-weight:700; }
    .header p { color:rgba(255,255,255,.85); margin:0; font-size:14px; }
    .body { background:#fff; padding:36px 32px; }
    .greeting { font-size:18px; color:#111827; font-weight:600; margin:0 0 12px; }
    .intro { color:#4b5563; line-height:1.7; font-size:15px; margin:0 0 24px; }
    .reason-box { background:#fff7ed; border:2px solid #f97316; border-radius:12px; padding:22px 24px; margin:0 0 28px; }
    .reason-label { font-size:12px; font-weight:700; color:#9a3412; text-transform:uppercase; letter-spacing:1px; margin:0 0 10px; }
    .reason-text { font-size:15px; color:#1f2937; line-height:1.7; font-style:italic; margin:0; padding:12px 16px; background:#fff; border-radius:8px; border-left:4px solid #f97316; }
    .steps-title { font-size:15px; font-weight:700; color:#111827; margin:0 0 14px; }
    .step { display:flex; align-items:flex-start; gap:12px; margin-bottom:12px; }
    .step-num { background:#f97316; color:#fff; border-radius:50%; width:24px; height:24px; min-width:24px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; }
    .step-text { color:#374151; font-size:14px; line-height:1.6; margin-top:2px; }
    hr { border:none; border-top:1px solid #e5e7eb; margin:24px 0; }
    .note { color:#6b7280; font-size:13px; line-height:1.6; margin:0; }
    .footer { background:#f9fafb; padding:20px 32px; text-align:center; border-top:1px solid #e5e7eb; }
    .footer p { color:#9ca3af; font-size:12px; margin:4px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-icon">📋</div>
        <h1>Registration Update</h1>
        <p>San Policarpo Community Resource Mapping System</p>
      </div>
      <div class="body">
        <p class="greeting">Dear ${name},</p>
        <p class="intro">
          Thank you for submitting your registration to the San Policarpo Community Resource Mapping System.
          After careful review by our administrators, we regret to inform you that your registration
          could <strong>not be approved</strong> at this time.
        </p>

        <div class="reason-box">
          <div class="reason-label">📌 Reason from the Administrator</div>
          <p class="reason-text">"${rejectionReason}"</p>
        </div>

        <p class="steps-title">📋 What You Can Do Next:</p>
        <div class="step">
          <span class="step-num">1</span>
          <span class="step-text">Read the administrator's reason carefully and identify what needs to be corrected or provided</span>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <span class="step-text">Prepare any missing documents or information mentioned in the reason above</span>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <span class="step-text">Visit your nearest barangay office or contact a community worker for assistance</span>
        </div>
        <div class="step">
          <span class="step-num">4</span>
          <span class="step-text">Submit a new registration once you have addressed the concerns</span>
        </div>

        <hr>
        <p class="note">
          If you believe this decision was made in error or you need further clarification,
          please reach out to the system administrator or visit the San Policarpo municipal office.
          We are committed to helping every member of our community. 🙏
        </p>
      </div>
      <div class="footer">
        <p>© 2026 San Policarpo Municipal Government</p>
        <p>Community Resource Mapping System &nbsp;|&nbsp; Eastern Samar</p>
        <p style="margin-top:8px;color:#d1d5db;">This is an automated message — please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`
    }
    const info = await transporter.sendMail(msg)
    console.log('📧 Rejection email sent to:', email, '| ID:', info.messageId)
    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, message: 'Failed to send email', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendWorkerSignupRejectedEmail(
  email: string,
  name: string,
  rejectionReason: string
) {
  try {
    const msg = {
      from: `"San Policarpo CRMS" <${process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph'}>`,
      to: email,
      subject: '📋 Worker Application Update — San Policarpo Community Resource Mapping System',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#fff7ed; font-family:'Segoe UI',Arial,sans-serif; }
    .wrapper { padding:30px 15px; }
    .container { max-width:600px; margin:0 auto; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.10); }
    .header { background:linear-gradient(135deg,#f97316 0%,#ea580c 60%,#c2410c 100%); padding:40px 30px 35px; text-align:center; }
    .header-icon { font-size:48px; margin-bottom:12px; }
    .header h1 { color:#fff; margin:0 0 6px; font-size:26px; font-weight:700; }
    .header p { color:rgba(255,255,255,.85); margin:0; font-size:14px; }
    .body { background:#fff; padding:36px 32px; }
    .greeting { font-size:18px; color:#111827; font-weight:600; margin:0 0 12px; }
    .intro { color:#4b5563; line-height:1.7; font-size:15px; margin:0 0 24px; }
    .reason-box { background:#fff7ed; border:2px solid #f97316; border-radius:12px; padding:22px 24px; margin:0 0 28px; }
    .reason-label { font-size:12px; font-weight:700; color:#9a3412; text-transform:uppercase; letter-spacing:1px; margin:0 0 10px; }
    .reason-text { font-size:15px; color:#1f2937; line-height:1.7; font-style:italic; margin:0; padding:12px 16px; background:#fff; border-radius:8px; border-left:4px solid #f97316; }
    hr { border:none; border-top:1px solid #e5e7eb; margin:24px 0; }
    .note { color:#6b7280; font-size:13px; line-height:1.6; margin:0; }
    .footer { background:#f9fafb; padding:20px 32px; text-align:center; border-top:1px solid #e5e7eb; }
    .footer p { color:#9ca3af; font-size:12px; margin:4px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-icon">📋</div>
        <h1>Application Update</h1>
        <p>San Policarpo Community Resource Mapping System</p>
      </div>
      <div class="body">
        <p class="greeting">Dear ${name},</p>
        <p class="intro">
          Thank you for applying to be a community worker in the San Policarpo Community Resource Mapping System.
          After careful review by our administrators, we regret to inform you that your application
          could <strong>not be approved</strong> at this time.
        </p>

        <div class="reason-box">
          <div class="reason-label">📌 Reason from the Administrator</div>
          <p class="reason-text">"${rejectionReason}"</p>
        </div>

        <hr>
        <p class="note">
          If you believe this decision was made in error or you need further clarification,
          please reach out to the system administrator or visit the San Policarpo municipal office.
          We appreciate your willingness to help our community. 🙏
        </p>
      </div>
      <div class="footer">
        <p>© 2026 San Policarpo Municipal Government</p>
        <p>Community Resource Mapping System &nbsp;|&nbsp; Eastern Samar</p>
        <p style="margin-top:8px;color:#d1d5db;">This is an automated message — please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`
    }
    const info = await transporter.sendMail(msg)
    console.log('📧 Worker rejection email sent to:', email, '| ID:', info.messageId)
    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, message: 'Failed to send email', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendAccountDeletedEmail(email: string, name: string | null, role: string) {
  try {
    const msg = {
      from: `"San Policarpo CRMS" <${process.env.BREVO_FROM_EMAIL || 'noreply@sanpolicarpo.gov.ph'}>`,
      to: email,
      subject: '⚠️ Your Account Has Been Deleted — San Policarpo Community Resource Mapping System',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#fef2f2; font-family:'Segoe UI',Arial,sans-serif; }
    .wrapper { padding:30px 15px; }
    .container { max-width:600px; margin:0 auto; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.10); }
    .header { background:linear-gradient(135deg,#dc2626 0%,#b91c1c 60%,#991b1b 100%); padding:40px 30px 35px; text-align:center; }
    .header-icon { font-size:48px; margin-bottom:12px; }
    .header h1 { color:#fff; margin:0 0 6px; font-size:26px; font-weight:700; }
    .header p { color:rgba(255,255,255,.85); margin:0; font-size:14px; }
    .body { background:#fff; padding:36px 32px; }
    .greeting { font-size:18px; color:#111827; font-weight:600; margin:0 0 12px; }
    .intro { color:#4b5563; line-height:1.7; font-size:15px; margin:0 0 24px; }
    .box { background:#fef2f2; border:2px solid #ef4444; border-radius:12px; padding:22px 24px; margin:0 0 28px; }
    .box-text { font-size:15px; color:#7f1d1d; line-height:1.7; margin:0; }
    hr { border:none; border-top:1px solid #e5e7eb; margin:24px 0; }
    .note { color:#6b7280; font-size:13px; line-height:1.6; margin:0; }
    .footer { background:#f9fafb; padding:20px 32px; text-align:center; border-top:1px solid #e5e7eb; }
    .footer p { color:#9ca3af; font-size:12px; margin:4px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-icon">⚠️</div>
        <h1>Account Deleted</h1>
        <p>San Policarpo Community Resource Mapping System</p>
      </div>
      <div class="body">
        <p class="greeting">Dear ${name || 'System User'},</p>
        <p class="intro">
          We are writing to officially inform you that your <strong>${role}</strong> account
          in the San Policarpo Community Resource Mapping System has been deleted by an administrator.
        </p>

        <div class="box">
          <p class="box-text">
            <strong>What this means:</strong><br><br>
            • You will no longer be able to log in to the system.<br>
            • Your profile and personal information have been removed from our active database.<br>
            • You will stop receiving future system notifications and updates.
          </p>
        </div>

        <hr>
        <p class="note">
          We sincerely apologize for any inconvenience this may cause. If you believe this action
          was taken in error, or if you wish to rejoin the system in the future, please contact
          your local barangay office or speak directly with a community worker.
        </p>
      </div>
      <div class="footer">
        <p>© 2026 San Policarpo Municipal Government</p>
        <p>Community Resource Mapping System &nbsp;|&nbsp; Eastern Samar</p>
        <p style="margin-top:8px;color:#d1d5db;">This is an automated message — please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`
    }
    const info = await transporter.sendMail(msg)
    console.log('📧 Account deletion email sent to:', email, '| ID:', info.messageId)
    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, message: 'Failed to send email', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
