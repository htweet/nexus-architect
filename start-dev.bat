@echo off
cd /d "%~dp0apps\builder"
echo Starting Nexus Architect dev server...
npm run dev
pause
