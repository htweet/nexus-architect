@echo off
cd /d "C:\Users\frank\Downloads\NexusWP"
del /f ".git\index.lock" 2>nul
del /f ".git\HEAD.lock" 2>nul
del /f ".git\COMMIT_EDITMSG.lock" 2>nul
git add -A
git commit -m "feat: Phase 10 Developer Experience — API Docs, Sandbox, Changelog, Observability Stack"
git push origin main
echo.
echo DONE — Phase 10 pushed to GitHub
pause
