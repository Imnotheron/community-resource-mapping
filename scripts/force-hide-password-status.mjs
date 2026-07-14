import fs from 'node:fs'
import path from 'node:path'

const dashboardPath = path.resolve(
  process.cwd(),
  'src/components/dashboards/admin-dashboard.tsx',
)

if (!fs.existsSync(dashboardPath)) {
  throw new Error(`Dashboard file not found: ${dashboardPath}`)
}

const original = fs.readFileSync(dashboardPath, 'utf8')
let source = original

const backupPath = `${dashboardPath}.before-hide-password-status.bak`
fs.writeFileSync(backupPath, original, 'utf8')

const simpleBadgeFunction = `function AccountSetupBadge({ user }: { user: any }) {
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

function replaceAccountSetupFunction(text) {
  const start = text.indexOf('function AccountSetupBadge(')

  if (start < 0) {
    return {
      text,
      replaced: false,
    }
  }

  const usersMarker =
    '// =================== USERS ==================='
  const markerIndex = text.indexOf(usersMarker, start)

  if (markerIndex > start) {
    return {
      text:
        text.slice(0, start) +
        simpleBadgeFunction +
        text.slice(markerIndex),
      replaced: true,
    }
  }

  // Fallback: find the matching closing brace for the function.
  const openingBrace = text.indexOf('{', start)

  if (openingBrace < 0) {
    throw new Error(
      'AccountSetupBadge was found but its opening brace was not found.',
    )
  }

  let depth = 0
  let inSingle = false
  let inDouble = false
  let inTemplate = false
  let escaped = false
  let end = -1

  for (let index = openingBrace; index < text.length; index += 1) {
    const character = text[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (character === '\\') {
      escaped = true
      continue
    }

    if (!inDouble && !inTemplate && character === "'") {
      inSingle = !inSingle
      continue
    }

    if (!inSingle && !inTemplate && character === '"') {
      inDouble = !inDouble
      continue
    }

    if (!inSingle && !inDouble && character === '`') {
      inTemplate = !inTemplate
      continue
    }

    if (inSingle || inDouble || inTemplate) {
      continue
    }

    if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1

      if (depth === 0) {
        end = index + 1
        break
      }
    }
  }

  if (end < 0) {
    throw new Error(
      'Could not find the end of AccountSetupBadge.',
    )
  }

  return {
    text:
      text.slice(0, start) +
      simpleBadgeFunction +
      text.slice(end).replace(/^\s*/, '\n'),
    replaced: true,
  }
}

const functionResult = replaceAccountSetupFunction(source)
source = functionResult.text

// Normalize the table heading.
source = source
  .replaceAll(
    '<TableHead>Account Setup / Registration</TableHead>',
    '<TableHead>Account / Registration</TableHead>',
  )
  .replaceAll(
    '<TableHead>Account Setup</TableHead>',
    '<TableHead>Account / Registration</TableHead>',
  )

// Remove any leftover user-visible labels even if another block renders them.
const forbiddenLabels = [
  'Password change pending',
  'Password updated',
  'Setup Complete',
  'Active Account',
  'Existing account',
]

for (const label of forbiddenLabels) {
  source = source.replaceAll(label, '')
}

// Remove empty helper text elements created by literal removal.
source = source
  .replace(
    /<span className="text-\[11px\][^"]*">\s*<\/span>/g,
    '',
  )
  .replace(
    /<span className="text-\[11px\][^"]*">\s*\{?\s*\}?\s*<\/span>/g,
    '',
  )

if (!source.includes('Account Created')) {
  throw new Error(
    'The patch could not find or create the Account Created badge.',
  )
}

const remaining = forbiddenLabels.filter((label) =>
  source.includes(label),
)

if (remaining.length > 0) {
  throw new Error(
    `These labels still remain: ${remaining.join(', ')}`,
  )
}

if (source === original) {
  console.log('No source changes were needed.')
  console.log(`Checked: ${dashboardPath}`)
  process.exit(0)
}

fs.writeFileSync(dashboardPath, source, 'utf8')

console.log('Password-change details removed successfully.')
console.log(`Updated: ${dashboardPath}`)
console.log(`Backup:  ${backupPath}`)
console.log(
  'Verified that Password change pending, Password updated, Setup Complete, Active Account, and Existing account are absent.',
)
