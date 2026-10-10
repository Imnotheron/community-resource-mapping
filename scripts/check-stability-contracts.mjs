import fs from 'node:fs'

const failures = []

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function check(condition, message) {
  if (!condition) failures.push(message)
}

function contains(path, pattern, message) {
  const source = read(path)
  check(
    pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern),
    message,
  )
}

function excludes(path, pattern, message) {
  const source = read(path)
  check(
    pattern instanceof RegExp ? !pattern.test(source) : !source.includes(pattern),
    message,
  )
}

function count(path, pattern) {
  const source = read(path)
  return (source.match(pattern) || []).length
}

const adminGuardRoutes = [
  'src/app/api/admin/approve/route.ts',
  'src/app/api/admin/reject/route.ts',
  'src/app/api/admin/feedback/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/admin/create-staff/route.ts',
  'src/app/api/admin/create-worker/route.ts',
  'src/app/api/admin/approve-worker-signup/route.ts',
  'src/app/api/admin/reject-worker-signup/route.ts',
]

for (const path of adminGuardRoutes) {
  contains(
    path,
    "requireRequestUser",
    `${path}: sensitive Administrator handlers must verify the signed session against the current database user`,
  )
  contains(
    path,
    "allowedRoles: ['ADMIN']",
    `${path}: Administrator handlers must explicitly require the ADMIN database role`,
  )
}

check(
  count('src/app/api/admin/users/route.ts', /allowedRoles:\s*\['ADMIN'\]/g) >= 2,
  'src/app/api/admin/users/route.ts: both GET and POST must independently enforce Administrator authorization',
)

excludes(
  'src/proxy.ts',
  'isMobileUserAgent',
  'src/proxy.ts: authenticated Administrators must not be blocked solely for using a mobile browser',
)

for (const path of [
  'src/app/api/user/activity/route.ts',
  'src/app/api/user/heartbeat/route.ts',
]) {
  contains(
    path,
    'requireRequestUser',
    `${path}: user-state mutation must be bound to the signed-in session`,
  )
  contains(
    path,
    'requestedUserId',
    `${path}: a supplied user ID must be checked against the signed-in session`,
  )
}

contains(
  'src/hooks/use-activity.tsx',
  "apiFetch('/api/user/activity'",
  'src/hooks/use-activity.tsx: activity updates must use the authenticated API client',
)

contains(
  'src/app/api/general-feedback/route.ts',
  'requireRequestUser',
  'src/app/api/general-feedback/route.ts: feedback data must not be anonymously readable or writable',
)
contains(
  'src/app/api/general-feedback/route.ts',
  "auth.role === 'ADMIN'",
  'src/app/api/general-feedback/route.ts: only Administrators may read feedback across users',
)
contains(
  'src/app/api/general-feedback/route.ts',
  'auth.userId',
  'src/app/api/general-feedback/route.ts: non-admin feedback ownership must come from the signed session',
)

excludes(
  'src/app/api/admin/create-worker/route.ts',
  'Math.random()',
  'src/app/api/admin/create-worker/route.ts: temporary credentials must use a cryptographic RNG',
)
excludes(
  'src/app/api/admin/create-worker/route.ts',
  'tempPassword: temporaryPassword',
  'src/app/api/admin/create-worker/route.ts: generated plaintext credentials must not be returned in JSON',
)
excludes(
  'src/app/api/admin/create-worker/route.ts',
  /temporaryPassword\s*:/,
  'src/app/api/admin/create-worker/route.ts: generated plaintext credentials must not be returned as a JSON property',
)

contains(
  'src/hooks/use-user-sync.ts',
  "status === 'offline' ? 'DELETE' : 'POST'",
  'src/hooks/use-user-sync.ts: logout must send DELETE so the server records the user as offline',
)

excludes(
  'src/app/api/admin/approve-worker-signup/route.ts',
  /sendAccountApprovedEmail\([\s\S]{0,350}signupRequest\.password/,
  'src/app/api/admin/approve-worker-signup/route.ts: a stored bcrypt hash must never be emailed as a password',
)

contains(
  'src/app/api/admin/relief-approval/route.ts',
  'updatedIds',
  'src/app/api/admin/relief-approval/route.ts: bulk actions must track exactly which pending records this request changed',
)
excludes(
  'src/app/api/admin/relief-approval/route.ts',
  'distributionIds: activeIds',
  'src/app/api/admin/relief-approval/route.ts: response IDs must not claim records that lost a concurrent update race',
)
contains(
  'src/app/api/admin/relief-approval/route.ts',
  "action === 'REJECT' && !reason",
  'src/app/api/admin/relief-approval/route.ts: rejection must require an audit reason',
)

contains(
  'src/app/api/upload/route.ts',
  'requireRequestUser',
  'src/app/api/upload/route.ts: uploads must require an authenticated CRMS user',
)

excludes(
  'src/app/api/auth/login/route.ts',
  "'Login failed: ' +",
  'src/app/api/auth/login/route.ts: internal login exceptions must not be reflected to clients',
)

contains(
  'src/app/api/auth/register/route.ts',
  "cleanRole !== 'VULNERABLE'",
  'src/app/api/auth/register/route.ts: public registration must remain restricted to vulnerable accounts',
)


contains(
  'src/lib/api-client.ts',
  'attachUserId?: boolean',
  'src/lib/api-client.ts: callers must be able to opt out of legacy userId injection',
)

contains(
  'src/components/dashboards/admin-dashboard.tsx',
  'attachUserId: false',
  'src/components/dashboards/admin-dashboard.tsx: admin feedback list must not be silently filtered to the admin userId',
)


contains(
  'package-lock.json',
  '"node_modules/lightningcss-linux-x64-gnu"',
  'package-lock.json: Linux Lightning CSS native package must be locked for portable CI/deploy builds',
)

contains(
  'package-lock.json',
  '"node_modules/@tailwindcss/oxide-linux-x64-gnu"',
  'package-lock.json: Linux Tailwind Oxide native package must be locked for portable CI/deploy builds',
)

excludes(
  'src/app/api/auth/login/route.ts',
  /message:\s*\n\s*error instanceof Error\s*\n\s*\? error\.message/,
  'src/app/api/auth/login/route.ts: raw OTP/provider errors must not be exposed to clients',
)

excludes(
  'src/app/api/auth/resend-otp/route.ts',
  /message:\s*\n\s*error instanceof Error\s*\n\s*\? error\.message/,
  'src/app/api/auth/resend-otp/route.ts: raw OTP/provider errors must not be exposed to clients',
)


excludes(
  'src/lib/request-user-session.ts',
  /request\.nextUrl\.searchParams\.get\('userId'\)/,
  'src/lib/request-user-session.ts: query userId must remain application data, not implicit caller identity',
)


contains(
  'prisma/schema.prisma',
  '@@unique([announcementId, userId])',
  'prisma/schema.prisma: announcement notifications must be unique per announcement and recipient',
)

contains(
  'src/app/api/announcements/route.ts',
  'announcementId_userId',
  'src/app/api/announcements/route.ts: announcement fan-out must use the composite announcement/recipient key',
)

contains(
  'src/app/api/announcements/route.ts',
  'db.notification.upsert',
  'src/app/api/announcements/route.ts: announcement fan-out must be idempotent instead of blindly inserting duplicates',
)

contains(
  'scripts/migrate-turso.mjs',
  'Notification_announcementId_userId_key',
  'scripts/migrate-turso.mjs: Turso migration must enforce announcement notification uniqueness',
)

contains(
  'src/app/api/worker/distribute/route.ts',
  'normalizeReliefEvidence',
  'src/app/api/worker/distribute/route.ts: new relief distributions must require validated supporting photo evidence',
)

contains(
  'prisma/schema.prisma',
  'supportingDocuments String',
  'prisma/schema.prisma: relief distributions must persist supporting evidence without adding another capstone table',
)

contains(
  'src/components/dashboards/admin-dashboard.tsx',
  'Relief Distribution Details',
  'src/components/dashboards/admin-dashboard.tsx: Relief Approval must provide a minimal View workflow for supporting evidence',
)

contains(
  'src/components/reports/daily-reports-view.tsx',
  'General relief type',
  'src/components/reports/daily-reports-view.tsx: Daily Reports must expose Relief Approval general relief filtering',
)

contains(
  'src/components/reports/daily-reports-view.tsx',
  'Specific vulnerability',
  'src/components/reports/daily-reports-view.tsx: Daily Reports must expose Relief Approval vulnerability filtering',
)

check(
  !fs.existsSync('src/app/api/admin/approval-center/route.ts'),
  'The redundant Approval Center API must stay retired to prevent a parallel approval path',
)

check(
  !fs.existsSync('src/components/admin/approval-center.tsx'),
  'The duplicate Approval Center UI must stay removed',
)

excludes(
  'src/components/dashboards/admin-dashboard.tsx',
  'id: "approval-center"',
  'Admin sidebar must provide only Registrations and Relief Approval as approval workflows',
)

contains(
  'src/components/dashboards/admin-dashboard.tsx',
  'Specific vulnerability',
  'Relief View must identify the beneficiary vulnerability',
)

contains(
  'src/components/reports/daily-reports-view.tsx',
  'data-testid="daily-report-filters"',
  'Daily Reports filters must preserve a testable responsive layout',
)

contains(
  'src/components/reports/daily-reports-view.tsx',
  'SelectTrigger className="w-full min-w-0"',
  'Daily Reports select triggers must occupy their full responsive column',
)

contains(
  'src/app/api/admin/reports/relief/route.ts',
  "getReliefReport(request, 'ADMIN')",
  'Municipal relief reports must be Admin-only',
)

contains(
  'src/app/api/worker/reports/relief/route.ts',
  "getReliefReport(request, 'WORKER')",
  'Worker relief reports must be Worker-only',
)

contains(
  'src/lib/relief-report-server.ts',
  "workerId: auth.userId",
  'Worker relief report records must be filtered to the signed-in worker',
)

contains(
  'src/lib/relief-report-server.ts',
  'take: MAX_RECORDS + 1',
  'Relief reports must prevent silently truncated exports',
)

contains(
  'src/components/reports/daily-reports-view.tsx',
  '<ReliefReportsView user={user} />',
  'Daily Reports must expose a dedicated Relief Reports section',
)

contains(
  'src/components/reports/relief-reports-view.tsx',
  'approvedQuantity',
  'Relief report summaries must distinguish approved quantities',
)


// Profile pictures must not use Vercel's read-only / ephemeral public/ filesystem.
// The existing User.profilePicture field holds a bounded, normalized data URL.
excludes(
  'src/app/api/user/profile-picture/route.ts',
  "writeFile",
  'Profile picture upload must never write into the serverless filesystem',
)
excludes(
  'src/app/api/user/profile-picture/route.ts',
  "public', 'uploads",
  'Profile picture upload must not depend on the ephemeral public/uploads directory',
)
contains(
  'src/app/api/user/profile-picture/route.ts',
  'detectImageMime',
  'Profile uploads must verify file signatures rather than trust MIME headers',
)
contains(
  'src/app/api/user/profile-picture/route.ts',
  'MAX_SAVED_BYTES = 48 * 1024',
  'Stored profile photos must be bounded to prevent large auth and user-list responses',
)
contains(
  'src/app/api/user/profile-picture/route.ts',
  "contents.toString('base64')",
  'Profile photos must persist as small data URLs in the existing User field',
)
contains(
  'src/app/api/user/profile-picture/route.ts',
  "requireMatchingRequestUser(request)",
  'Profile picture updates must be tied to the signed-in session',
)
contains(
  'src/app/api/user/profile-picture/route.ts',
  'data: { profilePicture: null }',
  'Profile picture deletion must clear the database column',
)
contains(
  'src/components/profile-view.tsx',
  'prepareProfilePictureUpload(',
  'Profile photos must be resized on the client to avoid request-body limits',
)
contains(
  'src/components/profile-view.tsx',
  "useUserHeader: true,\n          body: formData",
  'Multipart uploads must use the signed-in API client',
)

if (failures.length) {
  console.error('\nCRMS stability contracts failed:\n')
  failures.forEach((failure, index) => {
    console.error(`${index + 1}. ${failure}`)
  })
  console.error(`\n${failures.length} contract(s) failed.\n`)
  process.exit(1)
}

console.log('CRMS stability contracts passed.')
