import fs from 'node:fs'
import path from 'node:path'

const dashboardPath = path.resolve(
  process.cwd(),
  'src/components/dashboards/admin-dashboard.tsx',
)

if (!fs.existsSync(dashboardPath)) {
  throw new Error(
    `Admin dashboard not found: ${dashboardPath}`,
  )
}

let source = fs.readFileSync(
  dashboardPath,
  'utf8',
)
let changed = false

const oldAction = `{u.role !== "ADMIN" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => requestDeleteUser(u)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}`

const newAction = `{u.id !== getAdminId() ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => requestDeleteUser(u)}
                          className="text-destructive"
                          aria-label={\`Delete \${u.name || u.email || "user"}\`}
                          title={
                            normalizeRole(u.role) === "ADMIN"
                              ? "Delete this Administrator account"
                              : "Delete this user account"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500"
                        >
                          Current account
                        </Badge>
                      )}`

if (source.includes(oldAction)) {
  source = source.replace(
    oldAction,
    newAction,
  )
  changed = true
}

const flexiblePattern =
  /\{u\.role\s*!==\s*["']ADMIN["']\s*&&\s*\(\s*<Button([\s\S]*?)<\/Button>\s*\)\}/

if (
  !source.includes(
    'u.id !== getAdminId() ?',
  ) &&
  flexiblePattern.test(source)
) {
  source = source.replace(
    flexiblePattern,
    newAction,
  )
  changed = true
}

const oldDescription =
  'This action will permanently remove the selected user and related account access. This cannot be undone.'

const newDescription =
  'This action permanently removes the selected account and related access. Accounts may be deleted whether password setup is pending or complete. The current Administrator and the last remaining Administrator are protected.'

if (
  source.includes(oldDescription)
) {
  source = source.replace(
    oldDescription,
    newDescription,
  )
  changed = true
}

if (
  !source.includes(
    'u.id !== getAdminId() ?',
  )
) {
  throw new Error(
    'Could not update the Actions column. Use MANUAL_PATCH.txt.',
  )
}

if (!changed) {
  console.log(
    'Admin account deletion button patch is already installed.',
  )
  process.exit(0)
}

fs.writeFileSync(
  dashboardPath,
  source,
  'utf8',
)

console.log(
  'Admin account deletion controls installed successfully.',
)
