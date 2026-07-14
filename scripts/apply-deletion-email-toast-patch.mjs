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

const oldRequest = `await apiFetch(\`/api/admin/users/\${deleteTarget.id}\`, {
        method: "DELETE",
        body: JSON.stringify({ adminId: getAdminId() }),
      });`

const newRequest = `const result = await apiFetch(\`/api/admin/users/\${deleteTarget.id}\`, {
        method: "DELETE",
        useUserHeader: true,
        userId: getAdminId() || undefined,
        body: JSON.stringify({ adminId: getAdminId() }),
      });`

if (source.includes(oldRequest)) {
  source = source.replace(
    oldRequest,
    newRequest,
  )
  changed = true
}

const oldToast = `toast.success("User deleted", {
        description: \`\${deleteTarget.name || deleteTarget.email || "The user"} was removed successfully.\`,
      });`

const newToast = `toast.success("User deleted", {
        description: result?.emailDelivery?.sent
          ? \`\${deleteTarget.name || deleteTarget.email || "The user"} was removed and the deletion email was sent.\`
          : \`\${deleteTarget.name || deleteTarget.email || "The user"} was removed, but the deletion email was not sent: \${result?.emailDelivery?.message || "Email delivery failed."}\`,
      });`

if (source.includes(oldToast)) {
  source = source.replace(
    oldToast,
    newToast,
  )
  changed = true
}

if (
  !source.includes(
    'result?.emailDelivery?.sent',
  )
) {
  throw new Error(
    'Could not patch the deletion result toast. Use MANUAL_PATCH.txt.',
  )
}

if (!changed) {
  console.log(
    'Deletion email result patch is already installed.',
  )
  process.exit(0)
}

fs.writeFileSync(
  dashboardPath,
  source,
  'utf8',
)

console.log(
  'Deletion email delivery feedback installed successfully.',
)
