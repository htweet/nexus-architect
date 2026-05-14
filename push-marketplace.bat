@echo off
cd /d "%~dp0"

echo [1/4] Clearing stale git lock...
if exist ".git\index.lock" del /f ".git\index.lock"

echo [2/4] Staging Phase M changes...
git add packages/core/src/store/ui.store.ts
git add packages/core/src/plugin-api/index.ts
git add packages/core/src/types/addon.ts
git add packages/core/src/store/addon.store.ts
git add packages/core/src/index.ts
git add packages/core/package.json
git add apps/builder/tsconfig.json
git add apps/builder/src/lib/addon-loader.ts
git add apps/builder/src/widgets/registry.ts
git add apps/builder/src/main.tsx
git add apps/builder/src/hooks/useMarketplace.ts
git add apps/builder/src/hooks/useWidgetRegistryVersion.ts
git add apps/builder/src/components/panels/MarketplacePanel.tsx
git add apps/builder/src/components/LeftPanel.tsx
git add apps/builder/e2e/phase-marketplace.spec.ts

echo [3/4] Committing...
git commit -m "Phase M1-M7: Production Marketplace Addons — full runtime implementation

Phase M1 — Plugin API Contract (packages/core/src/plugin-api/index.ts):
- NexusAddonBundle + NexusPluginContext TypeScript contract
- PluginWidgetDefinition interface (decoupled from WidgetDefinition)
- isValidAddonBundle() runtime validation guard
- Subpath export: @nexus/core/plugin-api (package.json + tsconfig paths)

Phase M2 — Dynamic Bundle Loader (apps/builder/src/lib/addon-loader.ts):
- loadAddon(manifest): dynamic ESM import via import(/*@vite-ignore*/ entryPoint)
- unloadAddon(manifest): cleanup callbacks + unregisterWidget per addon
- createPluginContext(manifest): scoped NexusPluginContext per addon bundle
- setFeatureFlags(flags): DI setter (no circular dep — injected from main.tsx)
- exactOptionalPropertyTypes-safe WidgetDefinition bridge

Phase M3 — Reactive Widget Registry:
- subscribeRegistry() / getRegistryVersion() pub/sub in addon-loader.ts
- useWidgetRegistryVersion() hook: re-renders palette on addon install/uninstall
- unregisterWidget() added to widgets/registry.ts

Phase M4 — Addon Store (packages/core/src/store/addon.store.ts):
- AddonLoaderRef interface + setAddonLoader() DI function
- Real installAddon(): license gate + loader.loadAddon + error state
- fetchCatalogue(endpoint): fetch remote catalogue + merge installed state
- retryCatalogue(), uninstallAddon(), toggleAddon()
- licenseKey: string state + setLicenseKey() action
- Zustand persist: partialises catalogue + licenseKey
- LeftPanelTab union extended: 'marketplace' added (ui.store.ts)

Phase M5 — MarketplacePanel UI (apps/builder/src/components/panels/MarketplacePanel.tsx):
- UpsellModal: Professional/Agency/License Key plan comparison
  - License key input + mock activation + error state
  - Upgrade CTA link (nexusarchitect.io/pricing)
- AddonCard: 2-col grid card with category icon, name, premium badge,
  rating/install count, Install/Activate/Configure/Deactivate/Uninstall
  - data-testid='addon-card-{id}' and data-testid='install-btn-{id}'
- OfflineState: WifiOff icon + retry button for catalogue error
- MarketplacePanel: search input, 5 category filter pills, loading skeleton,
  2-col addon grid, upsell modal portal

Phase M6 — useMarketplace hook (apps/builder/src/hooks/useMarketplace.ts):
- Fetches from VITE_MARKETPLACE_ENDPOINT or /wp-json/nexus/v1/addons
- Full interface: addons, isLoading, catalogueError, installingId, licenseKey,
  install, uninstall, toggle, setLicenseKey, retry

Phase M7 — LeftPanel wiring (apps/builder/src/components/LeftPanel.tsx):
- 'Store' (marketplace) tab added to left panel tab bar
- buildPaletteGroups(registryVersion): merges static PALETTE_GROUPS with
  dynamically-registered addon widgets (Addons group auto-appears after install)
- useMemo + useWidgetRegistryVersion for zero-latency palette updates

Integration (apps/builder/src/main.tsx):
- setAddonLoader({ loadAddon, unloadAddon }) wires builder loader into core store

E2E suite (apps/builder/e2e/phase-marketplace.spec.ts):
- Suite 1 (5 tests):  LeftPanel Marketplace tab navigation
- Suite 2 (3 tests):  Search input + empty state + clear
- Suite 3 (3 tests):  Category filter pills
- Suite 4 (4 tests):  Offline state, retry, loading skeleton
- Suite 5 (8 tests):  Install/uninstall/toggle via mock catalogue
- Suite 6 (3 tests):  Addon card metadata (rating, install count)
- Suite 7 (2 tests):  Reactive palette regression
- Suite 8 (2 tests):  Addon store localStorage persistence
- Suite 9 (3 tests):  UpsellModal plan comparison + license key

TypeScript: 0 errors (packages/core + apps/builder)"

echo [4/4] Pushing...
git push origin main

echo.
echo Done! Phase M (Marketplace Addons) pushed to GitHub.
pause
