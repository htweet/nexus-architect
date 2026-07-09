################################################################################
# Nexus Architect — Build & Package WordPress Plugin
#
# Creates a production-ready distributable ZIP that can be installed directly
# in WordPress via Plugins → Add New → Upload Plugin.
#
# Usage:
#   .\build-plugin.ps1                    # uses version from nexus-architect.php
#   .\build-plugin.ps1 -SkipBuild        # re-package without re-building React
#   .\build-plugin.ps1 -Version 1.2.0    # override version string in ZIP name
#
# Output:
#   dist\nexus-architect-<version>.zip
#
# What goes in the ZIP:
#   nexus-architect\
#   ├── nexus-architect.php   (main plugin file)
#   ├── readme.txt            (WordPress plugin directory readme)
#   ├── includes\             (PHP backend classes)
#   │   ├── AiDatabase.php
#   │   ├── AiService.php
#   │   ├── AuditLog.php
#   │   ├── Database.php
#   │   ├── Enqueue.php
#   │   ├── InputValidator.php
#   │   ├── Loader.php
#   │   ├── RateLimiter.php
#   │   ├── RestApi.php
#   │   ├── Security.php
#   │   └── SecurityHeaders.php
#   └── apps\builder\dist\    (compiled React builder — Vite output)
#       ├── .vite\manifest.json
#       └── assets\
#           ├── react-vendor-[hash].js
#           ├── dnd-vendor-[hash].js
#           ├── ...
#           └── index-[hash].css
################################################################################

param(
    [string] $Version    = '',
    [switch] $SkipBuild  = $false
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# ── Helpers ─────────────────────────────────────────────────────────────────

function Write-Step([string]$label) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $label" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Write-OK([string]$msg)   { Write-Host "  ✅  $msg" -ForegroundColor Green  }
function Write-Warn([string]$msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "  ❌  $msg" -ForegroundColor Red; exit 1 }

# ── 1. Resolve version ───────────────────────────────────────────────────────

Write-Step "1 / 5 — Resolving version"

if (-not $Version) {
    $phpContent = Get-Content "nexus-architect.php" -Raw
    if ($phpContent -match "define\('NEXUS_VERSION',\s+'(\d+\.\d+\.\d+)'") {
        $Version = $Matches[1]
    } else {
        Write-Fail "Could not read NEXUS_VERSION from nexus-architect.php"
    }
}

Write-OK "Version: $Version"

$ZipName   = "nexus-architect-$Version.zip"
$StagingDir = "dist\_staging\nexus-architect"
$OutputZip  = "dist\$ZipName"

# ── 2. TypeScript check ──────────────────────────────────────────────────────

Write-Step "2 / 5 — TypeScript verification"

$tsResult = & npx tsc --noEmit -p apps/builder/tsconfig.json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $tsResult -ForegroundColor Red
    Write-Fail "TypeScript errors found. Fix before packaging."
}
Write-OK "TypeScript: 0 errors"

# ── 3. Build React app ───────────────────────────────────────────────────────

if (-not $SkipBuild) {
    Write-Step "3 / 5 — Building React app (Vite)"

    $env:NODE_ENV = 'production'
    & npm run build --workspace=apps/builder
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Vite build failed — check errors above"
    }

    # Verify manifest was generated
    $manifestPath = "apps\builder\dist\.vite\manifest.json"
    if (-not (Test-Path $manifestPath)) {
        Write-Fail "Vite manifest not found at $manifestPath — check vite.config.ts has manifest:true"
    }
    Write-OK "React app built successfully"
} else {
    Write-Warn "Skipping build (-SkipBuild flag set)"
    if (-not (Test-Path "apps\builder\dist\.vite\manifest.json")) {
        Write-Fail "No existing dist found. Run without -SkipBuild first."
    }
}

# ── 4. Assemble staging directory ────────────────────────────────────────────

Write-Step "4 / 5 — Assembling plugin package"

# Clean and recreate staging
if (Test-Path "dist\_staging") {
    Remove-Item "dist\_staging" -Recurse -Force
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null
New-Item -ItemType Directory -Path "$StagingDir\includes" -Force | Out-Null
New-Item -ItemType Directory -Path "$StagingDir\apps\builder" -Force | Out-Null

# PHP files
Copy-Item "nexus-architect.php" "$StagingDir\"
Copy-Item "readme.txt"          "$StagingDir\"
Copy-Item "includes\*"          "$StagingDir\includes\" -Recurse

# Compiled React bundle (dist only — no source, no node_modules)
Copy-Item "apps\builder\dist" "$StagingDir\apps\builder\dist" -Recurse

# Docs (API reference) — optional but helpful for developers
if (Test-Path "docs\api") {
    New-Item -ItemType Directory -Path "$StagingDir\docs" -Force | Out-Null
    Copy-Item "docs\api" "$StagingDir\docs\api" -Recurse
}

# ── File size summary ────────────────────────────────────────────────────────

$distSizeMB = [math]::Round((Get-ChildItem "$StagingDir\apps\builder\dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
$phpFiles   = (Get-ChildItem "$StagingDir\includes" -Filter "*.php").Count + 1

Write-OK "PHP files: $phpFiles"
Write-OK "React bundle: $distSizeMB MB"

# ── 5. Create ZIP ────────────────────────────────────────────────────────────

Write-Step "5 / 5 — Creating distributable ZIP"

if (Test-Path $OutputZip) { Remove-Item $OutputZip -Force }
New-Item -ItemType Directory -Path "dist" -Force | Out-Null

Compress-Archive -Path "dist\_staging\nexus-architect" -DestinationPath $OutputZip -Force

$zipSizeMB = [math]::Round((Get-Item $OutputZip).Length / 1MB, 2)

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  ✅  BUILD COMPLETE" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "  Package:  $OutputZip" -ForegroundColor White
Write-Host "  Size:     $zipSizeMB MB" -ForegroundColor White
Write-Host "  Version:  $Version" -ForegroundColor White
Write-Host ""
Write-Host "  Install via WordPress Admin → Plugins → Add New → Upload Plugin" -ForegroundColor DarkGray
Write-Host ""

# Clean up staging
Remove-Item "dist\_staging" -Recurse -Force
