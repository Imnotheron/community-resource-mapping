import fs from 'node:fs'
import path from 'node:path'

const filePath = path.resolve(
  process.cwd(),
  'src/components/dashboards/admin-dashboard.tsx',
)

if (!fs.existsSync(filePath)) {
  throw new Error(`File not found: ${filePath}`)
}

let source = fs.readFileSync(filePath, 'utf8')
let changed = false

const replacement = `function AccountSetupBadge({ user }: { user: any }) {
  if (user?.vulnerableProfile) {
    return (
      <StatusBadge
        status={user.vulnerableProfile.registrationStatus}
      />
    );
  }

  return (
    <Badge
      variant="outline"
      className="w-fit border-blue-200 bg-blue-50 font-semibold text-blue-700"
    >
      Account Created
    </Badge>
  );
}

`

const functionStart = source.indexOf(
  'function AccountSetupBadge(',
)
const usersAnchor = source.indexOf(
  '// =================== USERS ===================',
)

if (
  functionStart >= 0 &&
  usersAnchor > functionStart
) {
  source =
    source.slice(0, functionStart) +
    replacement +
    source.slice(usersAnchor)

  changed = true
} else if (
  !source.includes('function AccountSetupBadge(')
) {
  const anchor =
    '// =================== USERS ==================='

  if (!source.includes(anchor)) {
    throw new Error(
      'Users section anchor was not found.',
    )
  }

  source = source.replace(
    anchor,
    replacement + anchor,
  )
  changed = true
}

if (
  source.includes(
    '<TableHead>Account Setup / Registration</TableHead>',
  )
) {
  source = source.replace(
    '<TableHead>Account Setup / Registration</TableHead>',
    '<TableHead>Account / Registration</TableHead>',
  )
  changed = true
}

if (
  source.includes(
    '<TableHead>Account Setup</TableHead>',
  )
) {
  source = source.replace(
    '<TableHead>Account Setup</TableHead>',
    '<TableHead>Account / Registration</TableHead>',
  )
  changed = true
}

if (
  source.includes('Password change pending') ||
  source.includes('Password updated')
) {
  throw new Error(
    'Password-status text still exists after patching. Check MANUAL_PATCH.txt.',
  )
}

if (!changed) {
  console.log(
    'Password setup status is already hidden.',
  )
  process.exit(0)
}

fs.writeFileSync(filePath, source, 'utf8')

console.log(
  'Password-change status removed from User Management.',
)
