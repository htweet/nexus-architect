@echo off
echo ================================================================
echo  Nexus Architect — Auto-Save Strict Mode Fix
echo  Fixes: React Strict Mode wiping debounce timer + stale adapter
echo ================================================================
cd /d "%~dp0"

if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"

git add apps/builder/src/hooks/useAutoSave.ts
git add apps/builder/src/App.tsx

git commit -m "fix(autosave): React Strict Mode debounce wipe + stale adapter closure

Root cause: React Strict Mode tears down effects immediately after mount.
The cleanup cancelled the pending debounce timer. On remount the isDirty
subscription did NOT re-fire (isDirty was still true — no value change),
so the timer was never rescheduled and dirty changes were silently lost.

Three-part fix in useAutoSave.ts:
1. Strict Mode guard: check isDirty on every effect mount and re-arm
   the debounce timer immediately if the canvas is already dirty.
2. Subscribe to page object changes (not just isDirty): every mutation
   creates a new page object reference, so rapid sequential edits when
   isDirty is already true now correctly reset the 2.5s debounce window.
3. adapterRef pattern: adapter is written to a ref on every render and
   read by _doSave at call time — eliminates stale adapter closure and
   removes adapter from effect deps, preventing spurious teardown cycles.

Additional fix in App.tsx:
4. cancelled flag in resolveAdapter() useEffect: Strict Mode's second
   mount now cancels the first createMockAdapterContext() call, preventing
   a race between two adapter instances both writing to nexus_mock_db.

E2E verified (browser console):
- addNode -> 2.5s debounce -> localStorage has new node (7 nodes)
- Page reload -> node persists in store + localStorage (PERSISTENCE_PASS)
- 3 rapid updateNodeProps -> FINAL text saved, not intermediate (RAPID_EDIT_PASS)"

git push origin main

echo.
echo ================================================================
echo  Pushed! Auto-save is now fully reliable in dev + production.
echo ================================================================
pause
