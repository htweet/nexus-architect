@echo off
echo ================================================================
echo  Nexus Architect — Fix Git State (Remove Locks + Reset Bad Commit)
echo ================================================================
cd /d "C:\Users\frank\Downloads\NexusWP"

:: Remove stale lock files
if exist ".git\index.lock" del /f ".git\index.lock" && echo Removed index.lock
if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"  && echo Removed HEAD.lock

:: Undo the bad commit (it was done with a fresh custom index, deleted 181 files)
git reset --soft HEAD~1
if %errorlevel% neq 0 (
  echo ERROR: git reset failed
  pause
  exit /b 1
)
echo.
echo Bad commit undone. Now staging the correct files...

:: Stage only the z-index + save-persistence fix files
git add apps/builder/src/components/panels/SettingsModal.tsx
git add apps/builder/src/components/panels/AiPanel.tsx
git add apps/builder/src/components/panels/PublishDialog.tsx
git add apps/builder/src/components/panels/TemplatesModal.tsx
git add apps/builder/src/components/panels/MarketplacePanel.tsx
git add apps/builder/src/components/ShortcutsModal.tsx
git add apps/builder/src/components/WelcomeWizard.tsx
git add apps/builder/src/components/dynamic-data/DynamicDataPicker.tsx
git add packages/core/src/migration/
git add apps/builder/src/lib/sandbox-adapter.ts
git add apps/builder/e2e/persistence-save.spec.ts
git add clear-cache-restart.ps1
git add push-zindex-save-fixes.bat
git add fix-git-state.bat

:: Make the correct commit
git commit -m "fix(ui): All modals z-[99999] + save persistence hardening

Z-Index (fixes canvas toolbar bleeding over all modals):
- SettingsModal:      z-[9990]  -> z-[99999]
- ShortcutsModal:     z-[9000]  -> z-[99999]
- WelcomeWizard:      z-[9999]  -> z-[99999]
- DynamicDataPicker:  z-[9999]  -> z-[99999]
- MarketplacePanel:   z-[9500]  -> z-[99999]
- AiPanel:            z-[200]   -> z-[99999]
- PublishDialog:      z-[200]   -> z-[99999]
- TemplatesModal:     z-[200]   -> z-[99999]

Canvas toolbar (StableNodeOverlay) stays at zIndex 9998/9999.
All modals now consistently beat the toolbar.

Save Persistence:
- migration/index.ts: v0->v1 now stamps variables:[] and
  sharedPipelines:[] on pages missing these VAE-era fields
- sandbox-adapter.ts: updatePage() now upserts when page not
  found instead of throwing Error

NTFS Truncation Fixes:
- AiPanel.tsx, PublishDialog.tsx, TemplatesModal.tsx,
  sandbox-adapter.ts: all restored from closing-brace truncation

Tooling:
- clear-cache-restart.ps1: kills :3000, wipes .vite cache,
  clears package dists, relaunches dev server with --force
- persistence-save.spec.ts: E2E test for full save-reload cycle"

if %errorlevel% neq 0 (
  echo ERROR: git commit failed
  pause
  exit /b 1
)

:: Push to GitHub
echo.
echo Pushing to GitHub...
git push origin main

if %errorlevel% neq 0 (
  echo ERROR: git push failed
  pause
  exit /b 1
)

echo.
echo ================================================================
echo  SUCCESS! Pushed fix(ui) commit to GitHub.
echo  Now run clear-cache-restart.ps1 for a clean dev server.
echo ================================================================
pause
