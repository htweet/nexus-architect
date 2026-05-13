# Nexus Architect — Setup & Run Guide

## Prerequisites

- Node.js ≥ 20 (check: `node -v`)
- npm ≥ 10 (check: `npm -v`)
- For E2E tests: Playwright browsers (installed below)

---

## 1. Install Dependencies

Open a terminal in `C:\Users\frank\Downloads\NexusWP` and run:

```bash
npm install
```

This installs the entire monorepo (core, wp-adapter, builder app, Playwright).

---

## 2. Start the Dev Server

```bash
npm run dev
```

This starts the Vite dev server at **http://localhost:3000**.

The builder will open with the Mock Adapter (no WordPress required) and seed a `professional` tier user automatically.

---

## 3. Run E2E Tests

### Install Playwright browsers (first time only):

```bash
npx playwright install
```

### Run Phase 0 tests (builder shell):

```bash
npm run test:e2e -- --project=chromium apps/builder/e2e/phase0-shell.spec.ts
```

### Run Phase 1 tests (adapter integration):

```bash
npm run test:e2e -- --project=chromium apps/builder/e2e/phase1-adapter.spec.ts
```

### Run all tests (all browsers):

```bash
npm run test:e2e
```

### View HTML report after a run:

```bash
npx playwright show-report
```

---

## 4. WordPress Plugin Setup (Phase 1)

To use the plugin inside a live WordPress install:

1. Copy (or symlink) the `NexusWP` folder into your WP plugins directory:
   ```
   C:\xampp\htdocs\wordpress\wp-content\plugins\nexus-architect\
   ```

2. In `wp-config.php`, add during development:
   ```php
   define('NEXUS_DEV_SERVER_URL', 'http://localhost:3000');
   define('WP_DEBUG', true);
   ```

3. Activate **Nexus Architect** in WP Admin → Plugins.

4. The DB table `wp_nexus_pages` is created automatically on activation.

5. Navigate to **WP Admin → Nexus** to open the builder.

6. For production builds, run:
   ```bash
   npm run build --workspace=apps/builder
   ```
   Then set `NEXUS_DEV_SERVER_URL` to undefined in `wp-config.php`.

---

## Monorepo Structure

```
NexusWP/
├── nexus-architect.php         ← WP plugin entry point
├── includes/                   ← PHP classes (Loader, DB, REST, Security, Enqueue)
├── packages/
│   ├── core/                   ← Platform-agnostic types + Zustand stores
│   └── wp-adapter/             ← WPAdapter (only file allowed to use WP globals)
├── apps/
│   └── builder/
│       ├── src/                ← React app
│       ├── e2e/                ← Playwright E2E tests
│       └── dist/               ← Production build output
└── docs/adrs/                  ← Architecture Decision Records
```
