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

const componentImport =
  'import { CreateStaffAccountDialog } from "@/components/admin/create-staff-account-dialog";'

if (!source.includes(componentImport)) {
  const anchor =
    "import VulnerableRegistrationModal from '@/components/modals/VulnerableRegistrationModal';"

  if (!source.includes(anchor)) {
    throw new Error(
      'Could not find the import anchor. Use MANUAL_PATCH.txt.',
    )
  }

  source = source.replace(
    anchor,
    `${anchor}\n${componentImport}`,
  )
  changed = true
}

const oldButton =
  '<Button onClick={() => setShowCreate(true)}>Create Worker</Button>'

const newButton = `<Button
            type="button"
            onClick={() => setShowCreate(true)}
            className="gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Create Account
          </Button>`

if (source.includes(oldButton)) {
  source = source.replace(
    oldButton,
    newButton,
  )
  changed = true
}

const oldDialog = `<CreateWorkerDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={load}
      />`

const newDialog = `<CreateStaffAccountDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => load(false)}
      />`

if (source.includes(oldDialog)) {
  source = source.replace(
    oldDialog,
    newDialog,
  )
  changed = true
}

if (
  !source.includes(
    '<CreateStaffAccountDialog',
  )
) {
  throw new Error(
    'Could not replace CreateWorkerDialog. Use MANUAL_PATCH.txt.',
  )
}

if (!changed) {
  console.log(
    'Create Admin feature is already installed.',
  )
  process.exit(0)
}

fs.writeFileSync(
  dashboardPath,
  source,
  'utf8',
)

console.log(
  'Create Admin / Worker feature installed successfully.',
)
