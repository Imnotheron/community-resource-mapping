const required = [
  'BREVO_SMTP_LOGIN',
  'BREVO_SMTP_KEY',
  'BREVO_FROM_EMAIL',
  'NEXT_PUBLIC_APP_URL',
]

console.log('Vercel production email check')
console.log('-----------------------------')
console.log(
  `VERCEL_ENV: ${process.env.VERCEL_ENV || 'not supplied to this command'}`,
)

const missing = []

for (const name of required) {
  const present = Boolean(
    String(process.env[name] || '').trim(),
  )

  console.log(
    `${name}: ${present ? 'PRESENT' : 'MISSING'}`,
  )

  if (!present) {
    missing.push(name)
  }
}

if (missing.length > 0) {
  console.error('')
  console.error(
    `Missing production variables: ${missing.join(', ')}`,
  )
  process.exitCode = 1
} else {
  console.log('')
  console.log(
    'All required production email variables are present.',
  )
}
