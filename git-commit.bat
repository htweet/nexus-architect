@echo off
cd /d "C:\Users\frank\Downloads\NexusWP"
del /f ".git\index.lock" 2>nul
del /f ".git\HEAD.lock" 2>nul
del /f ".git\COMMIT_EDITMSG.lock" 2>nul
git add apps/builder/src/components/Canvas.tsx
git add apps/builder/src/components/canvas/NodeRenderer.tsx
git add apps/builder/src/components/canvas/CanvasErrorBoundary.tsx
git add apps/builder/src/components/canvas/WidgetErrorBoundary.tsx
git add apps/builder/src/components/canvas/PerformanceOverlay.tsx
git add apps/builder/src/lib/css-sanitizer.ts
git add apps/builder/src/widgets/html-embed-widget.tsx
git add apps/builder/vite.config.ts
git add packages/core/src/security/validator.ts
git add packages/core/src/index.ts
git add apps/builder/src/components/layers/LayersTree.tsx
git add apps/builder/src/lib/serialization-engine.ts
git add git-commit.bat
git add git-commit.ps1
git commit -m "feat: Phase 9 Performance Security and Hardening"
git push origin main
echo.
echo DONE press any key to close
pause
