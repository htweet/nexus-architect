Set-Location "C:\Users\frank\Downloads\NexusWP"
Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue
git add apps/builder/src/components/layers/LayersTree.tsx
git add apps/builder/src/lib/serialization-engine.ts
git add apps/builder/src/components/TopBar.tsx
git add apps/builder/src/components/LeftPanel.tsx
git add apps/builder/src/widgets/index.ts
git add apps/builder/src/components/Canvas.tsx
git add apps/builder/src/components/canvas/BreadcrumbBar.tsx
git commit -m "feat: Tasks 102-104 — LayersTree DnD panel, SerializationEngine, Publish state machine

- LayersTree.tsx: recursive layers sidebar with HTML5 drag-to-reorder,
  Eye/Lock visibility/lock toggles, emerald 2px left border for active
  node, 11px density, type icons from widget registry

- serialization-engine.ts: generatePublishPayload() wraps compilePage()
  returning {html, json, metadata}; mockPublish() simulates 4-step
  progress POST to /wp-json/nexus/v1/save with localStorage persistence

- TopBar.tsx: PublishPhase state machine (idle|compiling|live),
  scaleX progress bar overlay, Zap/Loader2/CheckCircle2 icons,
  Live badge for 3s then auto-reset to idle

- LeftPanel.tsx: LayersTree wired into Layers tab with search pass-through
- widgets/index.ts: NexusGridWidget registered; full import list restored
- Canvas.tsx: BreadcrumbBar mounted in edit mode
- BreadcrumbBar.tsx: TS fixes, fontFamily string correction

E2E verified: LayersTree renders 3 draggable rows + 7 toggle buttons,
progress bar 20->50->80->100->Live captured via MutationObserver,
HTML payload (1.47KB <!DOCTYPE html>) persisted to localStorage"
git push origin main
Write-Host "DONE"
Read-Host "Press Enter to close"
