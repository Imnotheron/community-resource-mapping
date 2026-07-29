$ErrorActionPreference = "Stop"

function Invoke-Vercel {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    & npx.cmd vercel @Arguments
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "Vercel command failed: vercel $($Arguments -join ' ')"
    }

    return $exitCode
}

Write-Host ""
Write-Host "Repairing Vercel CLI authentication" -ForegroundColor Cyan
Write-Host ""

# An invalid VERCEL_TOKEN overrides the normal interactive login.
if (Test-Path Env:VERCEL_TOKEN) {
    Remove-Item Env:VERCEL_TOKEN -ErrorAction SilentlyContinue
    Write-Host "Removed VERCEL_TOKEN from this PowerShell session." -ForegroundColor Yellow
}

if (Test-Path Env:VERCEL_OIDC_TOKEN) {
    Remove-Item Env:VERCEL_OIDC_TOKEN -ErrorAction SilentlyContinue
    Write-Host "Removed VERCEL_OIDC_TOKEN from this PowerShell session." -ForegroundColor Yellow
}

# Remove stale user-level values so future terminals do not restore them.
[Environment]::SetEnvironmentVariable(
    "VERCEL_TOKEN",
    $null,
    [EnvironmentVariableTarget]::User
)

[Environment]::SetEnvironmentVariable(
    "VERCEL_OIDC_TOKEN",
    $null,
    [EnvironmentVariableTarget]::User
)

Write-Host "Cleared saved user-level Vercel token variables." -ForegroundColor Green

# Best-effort logout clears a stale CLI credential file.
Invoke-Vercel -Arguments @("logout") -AllowFailure | Out-Null

Write-Host ""
Write-Host "A browser or email verification flow will open." -ForegroundColor Cyan
Write-Host "Sign in using the same Vercel account that owns the CRMS project." -ForegroundColor Cyan
Write-Host ""

Invoke-Vercel -Arguments @("login") | Out-Null

Write-Host ""
Write-Host "Verifying the new login..." -ForegroundColor Cyan
Invoke-Vercel -Arguments @("whoami") | Out-Null

Write-Host ""
Write-Host "Vercel CLI authentication is working." -ForegroundColor Green
Write-Host "Now run:" -ForegroundColor White
Write-Host "powershell -ExecutionPolicy Bypass -File scripts/configure-vercel-production-email.ps1" -ForegroundColor Yellow
