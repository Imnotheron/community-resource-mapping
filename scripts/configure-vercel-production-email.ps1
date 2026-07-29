$ErrorActionPreference = "Stop"

function Invoke-Npx {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & npx.cmd @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "npx command failed: $($Arguments -join ' ')"
    }
}

function ConvertTo-PlainText {
    param(
        [Parameter(Mandatory = $true)]
        [Security.SecureString]$SecureValue
    )

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
        $SecureValue
    )

    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
            $pointer
        )
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Set-VercelProductionVariable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Value,

        [switch]$Sensitive
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "$Name cannot be empty."
    }

    $tempFile = [IO.Path]::GetTempFileName()

    try {
        [IO.File]::WriteAllText(
            $tempFile,
            $Value.Trim(),
            [Text.UTF8Encoding]::new($false)
        )

        $arguments = @(
            "vercel",
            "env",
            "add",
            $Name,
            "production",
            "--force"
        )

        if ($Sensitive) {
            $arguments += "--sensitive"
        }
        else {
            $arguments += "--no-sensitive"
        }

        $process = Start-Process `
            -FilePath "npx.cmd" `
            -ArgumentList $arguments `
            -RedirectStandardInput $tempFile `
            -NoNewWindow `
            -Wait `
            -PassThru

        if ($process.ExitCode -ne 0) {
            throw "Failed to set $Name in Vercel Production."
        }

        Write-Host "Configured $Name for Production." -ForegroundColor Green
    }
    finally {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "CRMS Vercel Production Email Setup" -ForegroundColor Cyan
Write-Host ""

# Prevent an invalid environment token from overriding interactive login.
Remove-Item Env:VERCEL_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:VERCEL_OIDC_TOKEN -ErrorAction SilentlyContinue

& npx.cmd vercel whoami

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Vercel CLI is not authenticated." -ForegroundColor Red
    Write-Host "Run this first:" -ForegroundColor Yellow
    Write-Host "powershell -ExecutionPolicy Bypass -File scripts/repair-vercel-cli-login.ps1" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path ".vercel\project.json")) {
    Write-Host "This folder is not linked to a Vercel project." -ForegroundColor Yellow
    Invoke-Npx @("vercel", "link")
}

Write-Host ""
Write-Host "Use a NEW Brevo SMTP key. Do not reuse the exposed key." -ForegroundColor Yellow
Write-Host ""

$smtpLogin = Read-Host "Brevo SMTP login"
$smtpKeySecure = Read-Host "NEW Brevo SMTP key" -AsSecureString
$smtpKey = ConvertTo-PlainText $smtpKeySecure
$fromEmail = Read-Host "Brevo verified sender email"
$fromName = Read-Host "Sender name [San Policarpo CRMS]"

if ([string]::IsNullOrWhiteSpace($fromName)) {
    $fromName = "San Policarpo CRMS"
}

$appUrl = Read-Host "Production website URL (https://...)"

if (-not $appUrl.StartsWith("https://")) {
    throw "NEXT_PUBLIC_APP_URL must begin with https://"
}

Set-VercelProductionVariable `
    -Name "BREVO_SMTP_LOGIN" `
    -Value $smtpLogin `
    -Sensitive

Set-VercelProductionVariable `
    -Name "BREVO_SMTP_KEY" `
    -Value $smtpKey `
    -Sensitive

Set-VercelProductionVariable `
    -Name "BREVO_FROM_EMAIL" `
    -Value $fromEmail

Set-VercelProductionVariable `
    -Name "BREVO_FROM_NAME" `
    -Value $fromName

Set-VercelProductionVariable `
    -Name "NEXT_PUBLIC_APP_URL" `
    -Value $appUrl

$smtpKey = $null
$smtpKeySecure = $null

Write-Host ""
Write-Host "Production variables registered:" -ForegroundColor Cyan
Invoke-Npx @("vercel", "env", "ls", "production")

Write-Host ""
Write-Host "Checking Production environment variables..." -ForegroundColor Cyan
Invoke-Npx @(
    "vercel",
    "env",
    "run",
    "-e",
    "production",
    "--",
    "node",
    "scripts/check-vercel-production-email.mjs"
)

Write-Host ""
Write-Host "Creating a fresh Production deployment..." -ForegroundColor Cyan
Invoke-Npx @("vercel", "--prod", "--force")

Write-Host ""
Write-Host "Production email variables verified and deployment started." -ForegroundColor Green
