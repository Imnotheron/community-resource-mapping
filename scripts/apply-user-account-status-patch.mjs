import fs from 'node:fs'
import path from 'node:path'

const filePath = path.resolve(
  process.cwd(),
  'src/components/dashboards/admin-dashboard.tsx',
)

if (!fs.existsSync(filePath)) {
  throw new Error(
    `Admin dashboard not found: ${filePath}`,
  )
}

let source = fs.readFileSync(
  filePath,
  'utf8',
)
let changed = false

const helper = `
function AccountSetupBadge({ user }: { user: any }) {
  if (user?.vulnerableProfile) {
    return (
      <StatusBadge
        status={user.vulnerableProfile.registrationStatus}
      />
    );
  }

  const status = String(
    user?.accountSetupStatus || "ACTIVE",
  ).toUpperCase();

  if (status === "PASSWORD_CHANGE_REQUIRED") {
    return (
      <div className="flex min-w-[170px] flex-col gap-1">
        <Badge
          variant="outline"
          className="w-fit border-amber-300 bg-amber-50 font-semibold text-amber-800"
        >
          Account Created
        </Badge>
        <span className="text-[11px] font-medium text-amber-700">
          Password change pending
        </span>
      </div>
    );
  }

  if (status === "SETUP_COMPLETE") {
    return (
      <div className="flex min-w-[170px] flex-col gap-1">
        <Badge
          variant="outline"
          className="w-fit border-emerald-300 bg-emerald-50 font-semibold text-emerald-800"
        >
          Setup Complete
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          Password updated
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-[170px] flex-col gap-1">
      <Badge
        variant="outline"
        className="w-fit border-blue-200 bg-blue-50 font-semibold text-blue-700"
      >
        Active Account
      </Badge>
      <span className="text-[11px] text-muted-foreground">
        Existing account
      </span>
    </div>
  );
}
`

if (
  !source.includes(
    'function AccountSetupBadge(',
  )
) {
  const anchor =
    '// =================== USERS ==================='

  if (!source.includes(anchor)) {
    throw new Error(
      'Users section anchor not found.',
    )
  }

  source = source.replace(
    anchor,
    `${helper}\n${anchor}`,
  )
  changed = true
}

const oldHeading =
  '<TableHead>Account / Registration</TableHead>'

if (source.includes(oldHeading)) {
  source = source.replace(
    oldHeading,
    '<TableHead>Account Setup / Registration</TableHead>',
  )
  changed = true
}

const oldCell = `<TableCell>
                      {u.vulnerableProfile ? (
                        <StatusBadge
                          status={u.vulnerableProfile.registrationStatus}
                        />
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>`

const newCell = `<TableCell>
                      <AccountSetupBadge user={u} />
                    </TableCell>`

if (source.includes(oldCell)) {
  source = source.replace(
    oldCell,
    newCell,
  )
  changed = true
}

if (
  !source.includes(
    '<AccountSetupBadge user={u} />',
  )
) {
  throw new Error(
    'Could not replace the Account / Registration cell. Use MANUAL_PATCH.txt.',
  )
}

if (!changed) {
  console.log(
    'Account setup status patch is already installed.',
  )
  process.exit(0)
}

fs.writeFileSync(
  filePath,
  source,
  'utf8',
)

console.log(
  'User account setup statuses installed successfully.',
)
