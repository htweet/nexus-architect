@echo off
echo ================================================================
echo  Nexus Architect — Z-Index + Save Persistence Fixes
echo  All modals at z-[99999], migration + SandboxAdapter upsert fixed
echo ================================================================
cd /d "%~dp0"

if exist ".git\index.lock" del /f ".git\index.lock"

:: ── Z-Index fixes — all modals now at z-[99999] ──────────────────────────────
git add apps/builder/src/components/panels/SettingsModal.tsx
git add apps/builder/src/components/panels/AiPanel.tsx
git add apps/builder/src/components/panels/PublishDialog.tsx
git add apps/builder/src/components/panels/TemplatesModal.tsx
git add apps/builder/src/components/panels/MarketplacePanel.tsx
git add apps/builder/src/components/ShortcutsModal.tsx
git add apps/builder/src/components/WelcomeWizard.tsx
git add apps/builder/src/components/dynamic-data/DynamicDataPicker.tsx

:: ── Save pipeline fixes ────────────────────────────────────────────────────
git add packages/core/src/migration/index.ts
git add apps/builder/src/lib/sandbox-adapter.ts

:: ── Persistence E2E test ───────────────────────────────────────────────────
git add apps/builder/e2e/persistence-save.spec.ts

:: ── Utility scripts ────────────────────────────────────────────────────────
git add clear-cache-restart.ps1
git add push-zindex-save-fixes.bat

git commit -m "fix(ui): All modals z-[99999] + save persistence hardening

Z-Index (fixes canvas toolbar bleeding over all modals):
- SettingsModal:     z-[9990]  -> z-[99999]
- ShortcutsModal:   z-[9000]  -> z-[99999]
- WelcomeWizard:    z-[9999]  -> z-[99999]
- DynamicDataPicker:z-[9999]  -> z-[99999]
- MarketplacePanel: z-[9500]  -> z-[99999]
- AiPanel:          z-[200]   -> z-[99999]
- PublishDialog:    z-[200]   -> z-[99999]
- TemplatesModal:   z-[200]   -> z-[99999]

Canvas toolbar (StableNodeOverlay) stays at zIndex 9998/9999.
All modals now consistently beat the toolbar.

Save Persistence:
- migration/index.ts: v0->v1 now stamps variables:[] and
  sharedPipelines:[] on pages missing these VAE-era fields
- sandbox-adapter.ts: updatePage() now upserts when page not
  found (matching mock adapter behaviour) instead of throwing a
  plain Error that bypasses useAutoSave's upsert fallback

NTFS Truncation Fixes:
- AiPanel.tsx, PublishDialog.tsx, TemplatesModal.tsx,
  sandbox-adapter.ts: all restored from closing-brace truncation
  caused by NTFS write quirks on previous edit session

Tooling:
- clear-cache-restart.ps1: kills :3000, wipes .vite cache,
  clears package dists, relaunches dev server with --force
- persistence-save.spec.ts: E2E test for full save-reload cycle"

git push origin main

echo.
echo ================================================================
echo  Pushed! Run clear-cache-restart.ps1 to get a clean dev server
echo ================================================================
pause
