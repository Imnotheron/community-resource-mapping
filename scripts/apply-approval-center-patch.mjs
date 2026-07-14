import fs from 'node:fs'
import path from 'node:path'

const dashboardPath = path.resolve(
  process.cwd(),
  'src/components/dashboards/admin-dashboard.tsx',
)

if (!fs.existsSync(dashboardPath)) {
  throw new Error(`Admin dashboard not found: ${dashboardPath}`)
}

let source = fs.readFileSync(dashboardPath, 'utf8')
let changed = false

const approvalImport =
  'import { ApprovalCenter } from "@/components/admin/approval-center";'

if (!source.includes(approvalImport)) {
  const anchor =
    "import VulnerableRegistrationModal from '@/components/modals/VulnerableRegistrationModal';"

  if (!source.includes(anchor)) {
    throw new Error(
      'Import anchor was not found. Use ADMIN_DASHBOARD_MANUAL_PATCH.txt.',
    )
  }

  source = source.replace(anchor, `${anchor}\n${approvalImport}`)
  changed = true
}

const navigationItem =
  '  { id: "approval-center", label: "Approval Center", icon: ShieldCheck },'

if (!source.includes(navigationItem)) {
  const anchor =
    '  { id: "overview", label: "Overview", icon: LayoutDashboard },'

  if (!source.includes(anchor)) {
    throw new Error(
      'Navigation anchor was not found. Use ADMIN_DASHBOARD_MANUAL_PATCH.txt.',
    )
  }

  source = source.replace(anchor, `${anchor}\n${navigationItem}`)
  changed = true
}

const viewRenderer =
  '      {view === "approval-center" && <ApprovalCenter admin={user} />}'

if (!source.includes(viewRenderer)) {
  const anchor = '      {view === "overview" && <OverviewView />}'

  if (!source.includes(anchor)) {
    throw new Error(
      'View anchor was not found. Use ADMIN_DASHBOARD_MANUAL_PATCH.txt.',
    )
  }

  source = source.replace(anchor, `${anchor}\n${viewRenderer}`)
  changed = true
}

if (changed) {
  fs.writeFileSync(dashboardPath, source, 'utf8')
  console.log('Approval Center was added to admin-dashboard.tsx.')
} else {
  console.log('Approval Center patch is already installed.')
}
