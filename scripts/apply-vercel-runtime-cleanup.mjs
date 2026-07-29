import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function updateEmailModule() {
  const emailPath = path.resolve(
    root,
    'src/lib/email.ts',
  )

  if (!fs.existsSync(emailPath)) {
    throw new Error(
      `Email module not found: ${emailPath}`,
    )
  }

  let source = fs.readFileSync(
    emailPath,
    'utf8',
  )

  const before = source

  source = source.replace(
    /\r?\n\/\/ Verify SMTP connection at startup and log result clearly[\s\S]*?\r?\nverifyEmailConnection\(\)\r?\n/,
    '\n',
  )

  if (
    source.includes(
      'verifyEmailConnection()',
    )
  ) {
    throw new Error(
      'The startup SMTP verification block could not be removed automatically.',
    )
  }

  if (source !== before) {
    fs.writeFileSync(
      emailPath,
      source,
      'utf8',
    )
    console.log(
      'Removed module-load SMTP verification from src/lib/email.ts.',
    )
  } else {
    console.log(
      'No startup SMTP verification remained in src/lib/email.ts.',
    )
  }
}

function migrateMiddlewareToProxy() {
  const middlewarePath = path.resolve(
    root,
    'src/middleware.ts',
  )
  const proxyPath = path.resolve(
    root,
    'src/proxy.ts',
  )

  if (!fs.existsSync(middlewarePath)) {
    if (fs.existsSync(proxyPath)) {
      console.log(
        'src/proxy.ts already exists.',
      )
      return
    }

    console.log(
      'No src/middleware.ts file was found.',
    )
    return
  }

  let source = fs.readFileSync(
    middlewarePath,
    'utf8',
  )

  source = source.replace(
    /export function middleware\s*\(/,
    'export function proxy(',
  )

  if (
    !source.includes(
      'export function proxy(',
    )
  ) {
    throw new Error(
      'Could not change the middleware export to proxy.',
    )
  }

  fs.writeFileSync(
    proxyPath,
    source,
    'utf8',
  )
  fs.unlinkSync(middlewarePath)

  console.log(
    'Migrated src/middleware.ts to src/proxy.ts.',
  )
}

function correctCreateStaffMessages() {
  const routePath = path.resolve(
    root,
    'src/app/api/admin/create-staff/route.ts',
  )

  if (!fs.existsSync(routePath)) {
    throw new Error(
      `Create-staff route not found: ${routePath}`,
    )
  }

  let source = fs.readFileSync(
    routePath,
    'utf8',
  )

  const replacements = [
    [
      'Production email is not configured in Vercel. Add BREVO_API_KEY and BREVO_FROM_EMAIL, then redeploy.',
      'Production email is missing the Brevo SMTP variables. Add BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_FROM_EMAIL to Vercel Production, then redeploy.',
    ],
    [
      'Production email is not configured in Vercel. Add BREVO_API_KEY and BREVO_FROM_EMAIL to the Production environment, then redeploy.',
      'Production email is missing the Brevo SMTP variables. Add BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_FROM_EMAIL to Vercel Production, then redeploy.',
    ],
    [
      'Brevo rejected the credentials. Replace BREVO_API_KEY in Vercel with a valid Brevo v3 API key and redeploy.',
      'Brevo rejected the SMTP credentials. Replace BREVO_SMTP_LOGIN and BREVO_SMTP_KEY in Vercel Production, then redeploy.',
    ],
  ]

  let changed = false

  for (const [oldText, newText] of replacements) {
    if (source.includes(oldText)) {
      source = source.replaceAll(
        oldText,
        newText,
      )
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(
      routePath,
      source,
      'utf8',
    )
    console.log(
      'Corrected Vercel SMTP guidance in the create-staff route.',
    )
  } else {
    console.log(
      'Create-staff SMTP messages were already corrected.',
    )
  }
}

updateEmailModule()
migrateMiddlewareToProxy()
correctCreateStaffMessages()

console.log(
  'Runtime cleanup completed.',
)
