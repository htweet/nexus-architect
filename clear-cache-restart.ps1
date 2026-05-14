################################################################################
# Nexus Architect — Clear Vite Cache & Restart Dev Server
#
# Run this whenever:
#   • Blocks stop saving / builder feels stale
#   • You see unexpected white screens or HMR not picking up changes
#   • After any source-file force-write (Python patch sessions)
#
# Usage: Right-click → "Run with PowerShell"  (or: .\clear-cache-restart.ps1)
################################################################################

Set-Location "C:\Users\frank\Downloads\NexusWP"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Nexus Architect — Cache Clear & Dev Server Restart" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ── 1. Kill any running Vite / node dev servers on port 3000 ──────────────────
Write-Host "[ 1/4 ] Stopping any running dev servers..." -ForegroundColor Yellow
$procs = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($procs) {
    $procs | ForEach-Object {
        $pid = $_.OwningProcess
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "        Killed PID $pid on :3000" -ForegroundColor DarkGray
    }
} else {
    Write-Host "        No process on :3000" -ForegroundColor DarkGray
}

# Also kill any orphaned node/vite processes matching our project
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*nexus*" -or $_.CommandLine -like "*nexus*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Milliseconds 500

# ── 2. Clear Vite dependency cache ───────────────────────────────────────────
Write-Host "[ 2/4 ] Clearing Vite cache..." -ForegroundColor Yellow

$viteDirs = @(
    "apps\builder\node_modules\.vite",
    "node_modules\.vite"
)

foreach ($dir in $viteDirs) {
    $fullPath = Join-Path (Get-Location) $dir
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "        Removed: $dir" -ForegroundColor DarkGray
    }
}

# ── 3. Clear compiled core package output ─────────────────────────────────────
Write-Host "[ 3/4 ] Clearing compiled package artifacts..." -ForegroundColor Yellow

$distDirs = @(
    "packages\core\dist",
    "packages\wp-adapter\dist"
)

foreach ($dir in $distDirs) {
    $fullPath = Join-Path (Get-Location) $dir
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "        Removed: $dir" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "[ 4/4 ] Launching dev server with --force flag..." -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  Builder will be at: http://localhost:3000" -ForegroundColor Green
Write-Host "  Press Ctrl+C in this window to stop the server" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# Start dev server with --force to re-bundle all dependencies fresh
npm run dev --workspace=apps/builder -- --force
