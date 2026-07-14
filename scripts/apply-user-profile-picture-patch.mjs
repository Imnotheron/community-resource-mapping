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

const avatarImport =
  'import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";'

if (!source.includes(avatarImport)) {
  const importAnchor =
    'import { Badge } from "@/components/ui/badge";'

  if (!source.includes(importAnchor)) {
    throw new Error(
      'Badge import anchor was not found. Add the Avatar import manually.',
    )
  }

  source = source.replace(
    importAnchor,
    `${importAnchor}\n${avatarImport}`,
  )
  changed = true
}

const helper = `
function userInitials(user: any) {
  return String(user?.name || user?.email || "User")
    .split(/\\\\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UserManagementAvatar({ user }: { user: any }) {
  const picture =
    user?.profilePicture ||
    user?.profileImage ||
    user?.profilePhoto ||
    user?.photoUrl ||
    user?.avatarUrl ||
    null;

  return (
    <Avatar className="h-10 w-10 border border-slate-200 bg-slate-100 shadow-sm">
      {picture ? (
        <AvatarImage
          src={picture}
          alt={user?.name || "User profile"}
          className="object-cover"
        />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
        {userInitials(user)}
      </AvatarFallback>
    </Avatar>
  );
}
`

if (!source.includes('function UserManagementAvatar(')) {
  const helperAnchor =
    '// =================== USERS ==================='

  if (!source.includes(helperAnchor)) {
    throw new Error(
      'Users section anchor was not found. Add the avatar helper manually.',
    )
  }

  source = source.replace(
    helperAnchor,
    `${helper}\n${helperAnchor}`,
  )
  changed = true
}

if (source.includes('<TableHead>Name</TableHead>')) {
  source = source.replace(
    '<TableHead>Name</TableHead>',
    '<TableHead>User</TableHead>',
  )
  changed = true
}

const oldNameCell =
  '<TableCell className="font-medium">{u.name}</TableCell>'

const newNameCell = `<TableCell>
                      <div className="flex min-w-[220px] items-center gap-3">
                        <UserManagementAvatar user={u} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {u.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {u.profilePicture ? "Profile photo uploaded" : "Initials avatar"}
                          </p>
                        </div>
                      </div>
                    </TableCell>`

if (source.includes(oldNameCell)) {
  source = source.replace(oldNameCell, newNameCell)
  changed = true
}

if (!changed) {
  console.log('User profile-picture patch is already installed.')
  process.exit(0)
}

fs.writeFileSync(filePath, source, 'utf8')
console.log('User profile pictures added to User Management.')
