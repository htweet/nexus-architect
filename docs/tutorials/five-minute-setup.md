# Nexus Architect — 5-Minute Developer Setup

Get a fully working Nexus Architect builder running locally with **zero WordPress dependency**.

---

## Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8 (`npm i -g pnpm`)

---

## Step 1: Clone & Install

```bash
git clone https://github.com/your-org/nexus-wp.git
cd nexus-wp
pnpm install
```

---

## Step 2: Enable Sandbox Mode

Create a local environment file:

```bash
echo "VITE_SANDBOX_MODE=true" > apps/builder/.env.development.local
```

This activates `SandboxAdapter` — a full localStorage-backed data layer that
seeds a rich demo page on first launch. No WordPress, no database, no server.

---

## Step 3: Start the Dev Server

```bash
pnpm --filter @nexus/builder dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll see a pre-built demo page with a hero section, feature grid,
testimonial block, and a sandbox banner you can delete and rebuild from scratch.

---

## Step 4: Create Your First Widget

1. Create `apps/builder/src/widgets/hello-widget.tsx`:

```tsx
import { registerWidget } from '@/widgets/registry';
import { useCanvasStore } from '@nexus/core';
import { getVisualNodeStyles } from '@/lib/style-utils';
import { Smile } from 'lucide-react';

registerWidget({
  type:         'hello-widget',
  label:        'Hello Widget',
  icon:         Smile,
  category:     'content',
  defaultProps: { message: 'Hello, Nexus!' },
  controls: [
    { key: 'message', label: 'Message', type: 'text', tab: 'content' },
  ],
  Renderer({ nodeId }) {
    const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
    if (!node) return null;
    const p = node.props as { message: string };
    return (
      <div style={{ ...getVisualNodeStyles(node.styles), padding: 16 }}>
        {p.message}
      </div>
    );
  },
});
```

2. Import it in `apps/builder/src/widgets/index.ts`:

```ts
import './hello-widget';
```

3. Your widget appears instantly in the Left Panel palette under "Content".
   Drag it onto the canvas and edit the message from the Right Panel.

---

## Step 5: Run TypeScript + Tests

```bash
# Type-check everything
pnpm --filter @nexus/builder tsc --noEmit

# Run Playwright E2E tests
cd apps/builder && npx playwright test
```

---

## Connecting to WordPress

When you're ready to connect a real WordPress site:

1. Install the Nexus Architect plugin on your WP site
2. Remove `VITE_SANDBOX_MODE=true` from your `.env`
3. Visit your WP admin → Nexus Architect → any page → "Open Builder"

The builder loads with `WPAdapter` automatically — all page data persists to
the WordPress database via the REST API.

---

## Project Structure

```
nexus-wp/
├── apps/
│   └── builder/          # Vite + React builder app
│       ├── src/
│       │   ├── components/   # Builder shell, TopBar, Canvas, panels
│       │   ├── widgets/      # Widget definitions + renderers
│       │   ├── lib/          # Adapters, utilities, history
│       │   └── hooks/        # useAutoSave, usePresence, etc.
│       └── vite.config.ts
├── packages/
│   └── core/             # Platform-agnostic stores, types, migration
│       └── src/
│           ├── types/        # NexusPage, DataAdapter, WidgetAPI, etc.
│           ├── store/        # Zustand stores (canvas, UI, history, etc.)
│           ├── migration/    # Schema migrators + MigrationRunner
│           ├── observability/# Sentry + PostHog adapters + obs singleton
│           └── security/     # Zod validator + CSS sanitizer
└── docs/
    ├── api/              # Widget API, Adapter, Observability reference
    └── tutorials/        # This file + more
```

---

*Last updated: Phase 10 — Developer Experience*
