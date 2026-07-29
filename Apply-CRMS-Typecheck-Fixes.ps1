param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Backup([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file not found: $Path"
    }

    $BackupPath = "$Path.before-typecheck-fix"
    if (-not (Test-Path -LiteralPath $BackupPath)) {
        Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
    }
}

function ReplaceStrict {
    param(
        [string]$Path,
        [string]$Old,
        [string]$New,
        [string]$Label
    )

    $Content = Get-Content -LiteralPath $Path -Raw

    if (-not $Content.Contains($Old)) {
        Write-Host "Skipped (already fixed or code differs): $Label" -ForegroundColor Yellow
        return
    }

    $Content = $Content.Replace($Old, $New)
    Set-Content -LiteralPath $Path -Value $Content -Encoding utf8
    Write-Host "Fixed: $Label" -ForegroundColor Green
}

$PackagePath = Join-Path $ProjectRoot "package.json"
if (-not (Test-Path -LiteralPath $PackagePath)) {
    throw "package.json was not found in: $ProjectRoot"
}

Step "Excluding prototype overlay projects from TypeScript"

$TsconfigPath = Join-Path $ProjectRoot "tsconfig.json"
Backup $TsconfigPath
$Tsconfig = Get-Content -LiteralPath $TsconfigPath -Raw | ConvertFrom-Json

$Excludes = @()
if ($null -ne $Tsconfig.exclude) {
    $Excludes = @($Tsconfig.exclude)
}

foreach ($Entry in @(
    "balanced-wow-ui-overlay",
    "balanced-wow-ui-overlay/**",
    "wow-motion-v2-overlay",
    "wow-motion-v2-overlay/**"
)) {
    if ($Excludes -notcontains $Entry) {
        $Excludes += $Entry
    }
}

$Tsconfig.exclude = $Excludes
$Tsconfig | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $TsconfigPath -Encoding utf8
Write-Host "Updated: tsconfig.json" -ForegroundColor Green

Step "Removing obsolete onRegister prop from the live app shell"

$AppShellPath = Join-Path $ProjectRoot "src/app/app-shell.tsx"
Backup $AppShellPath

$OldRegisterBlock = @'
            onRegister={async (
              name,
              email,
              password,
              role,
            ) => {
              const result = await register(
                name,
                email,
                password,
                role,
              )
              setMode('dashboard')
              return result
            }}
'@

ReplaceStrict `
    -Path $AppShellPath `
    -Old $OldRegisterBlock.TrimEnd() `
    -New "" `
    -Label "AuthScreen onRegister prop"

# Remove register from useUserSync destructuring only when it is now unused.
$AppShellContent = Get-Content -LiteralPath $AppShellPath -Raw
if ($AppShellContent -notmatch '\bregister\s*\(' -and $AppShellContent -match '\bregister\b') {
    $AppShellContent = $AppShellContent `
        -replace ',\s*register,', ',' `
        -replace ',\s*register\s*}', ' }' `
        -replace '{\s*register,\s*', '{ '
    Set-Content -LiteralPath $AppShellPath -Value $AppShellContent -Encoding utf8
    Write-Host "Removed unused register binding" -ForegroundColor Green
}

Step "Fixing approval-center ID typing"

$ApprovalRoute = Join-Path $ProjectRoot "src/app/api/admin/approval-center/route.ts"
Backup $ApprovalRoute

$OldIds = @'
    const ids = Array.isArray(body.ids)
      ? Array.from(
          new Set(
            body.ids
              .map((id: unknown) => String(id || '').trim())
              .filter(Boolean),
          ),
        )
      : []
'@

$NewIds = @'
    const ids: string[] = Array.isArray(body.ids)
      ? Array.from(
          new Set<string>(
            body.ids
              .map((id: unknown) => String(id || '').trim())
              .filter((id: string) => id.length > 0),
          ),
        )
      : []
'@

ReplaceStrict `
    -Path $ApprovalRoute `
    -Old $OldIds.TrimEnd() `
    -New $NewIds.TrimEnd() `
    -Label "approval-center string ID list"

Step "Removing unsupported SQLite createMany option"

$AnnouncementsRoute = Join-Path $ProjectRoot "src/app/api/announcements/route.ts"
Backup $AnnouncementsRoute
ReplaceStrict `
    -Path $AnnouncementsRoute `
    -Old @'
        status: 'PENDING',
      })),
      skipDuplicates: true,
'@.TrimEnd() `
    -New @'
        status: 'PENDING',
      })),
'@.TrimEnd() `
    -Label "notification createMany skipDuplicates"

Step "Removing unsupported MapLibre option"

$MapPath = Join-Path $ProjectRoot "src/components/maps/vulnerable-map.tsx"
Backup $MapPath
ReplaceStrict `
    -Path $MapPath `
    -Old "      preserveDrawingBuffer: false,`r`n" `
    -New "" `
    -Label "MapLibre preserveDrawingBuffer option"

# Handle LF-only file.
$MapContent = Get-Content -LiteralPath $MapPath -Raw
if ($MapContent.Contains("      preserveDrawingBuffer: false,`n")) {
    $MapContent = $MapContent.Replace("      preserveDrawingBuffer: false,`n", "")
    Set-Content -LiteralPath $MapPath -Value $MapContent -Encoding utf8
    Write-Host "Fixed: MapLibre preserveDrawingBuffer option (LF)" -ForegroundColor Green
}

Step "Updating verification scripts to regenerate Prisma"

Backup $PackagePath
$Package = Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json
$Package.scripts | Add-Member `
    -MemberType NoteProperty `
    -Name "typecheck" `
    -Value "prisma generate && tsc --noEmit" `
    -Force

$Package.scripts | Add-Member `
    -MemberType NoteProperty `
    -Name "check" `
    -Value "bun run lint && bun run typecheck && bun run build" `
    -Force

$Package | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $PackagePath -Encoding utf8
Write-Host "Updated: package.json" -ForegroundColor Green

Step "Regenerating Prisma client"
Push-Location $ProjectRoot
try {
    & bunx prisma generate
    if ($LASTEXITCODE -ne 0) {
        throw "Prisma generation failed."
    }
}
finally {
    Pop-Location
}

Step "TypeScript fixes applied"
Write-Host "Run:" -ForegroundColor White
Write-Host "  bun run lint"
Write-Host "  bun run typecheck"
Write-Host "  bun run build"
