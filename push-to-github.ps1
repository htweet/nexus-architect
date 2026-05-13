#!/usr/bin/env pwsh
# Nexus Architect — Push to GitHub
# Run this from PowerShell or right-click → "Run with PowerShell"

$ErrorActionPreference = 'Stop'
$repo = "https://github.com/htweet/nexus-architect.git"
$dir  = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location $dir
Write-Host "📁 Working in: $dir" -ForegroundColor Cyan

# Init git if not already
if (-not (Test-Path ".git")) {
    Write-Host "🔧 Initializing git..." -ForegroundColor Yellow
    git init -b main
} else {
    Write-Host "✅ Git repo found" -ForegroundColor Green
}

# Configure identity
git config user.email "hemrontweet@gmail.com"
git config user.name  "Banji"

# Set remote
$remoteExists = git remote | Select-String "origin"
if (-not $remoteExists) {
    Write-Host "🔗 Adding remote origin..." -ForegroundColor Yellow
    git remote add origin $repo
} else {
    git remote set-url origin $repo
    Write-Host "🔗 Remote origin updated" -ForegroundColor Green
}

# Stage everything
Write-Host "📦 Staging files..." -ForegroundColor Yellow
git add -A

# Commit (skip if nothing to commit)
$status = git status --porcelain
if ($status) {
    git commit -m "feat: Nexus Architect — full builder codebase (Phases 0-7 + Widget API)"
    Write-Host "✅ Committed!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Nothing new to commit" -ForegroundColor Gray
}

# Push
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main --force

Write-Host ""
Write-Host "✅ Done! View your repo at: $repo" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
