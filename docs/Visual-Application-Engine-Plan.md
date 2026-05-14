# Nexus Architect — Visual Application Engine: Technical Implementation Plan

**Classification:** Pre-Implementation Architecture Document  
**Scope:** Four flagship features elevating Nexus from Layout Builder → Visual Application Engine  
**UI Constraint (IMMUTABLE):** All UI surfaces use Executive Dark exclusively.
- Background canvas: `#080c16`
- Panel/card surfaces: `#121821`  
- Primary accent / interactive: `#10b77f` (emerald)
- Icon stroke weight: 1.5px (Lucide standard)
- Typography: dense, monospace values in inspector fields
- Zero new UI paradigms — all controls route through existing `settingsSchema` / SchemaRenderer

---

## Feature 1: Nexus Data-Bind — Visual MVC State Management

### Architectural Overview

The core idea is a two-layer state system: a **Design-Time Model** (variable definitions stored in the page JSON) and a **Runtime Model** (a live Zustand slice that holds current values and drives reactive re-renders). The canvas render loop reads from the runtime layer, never from the page JSON directly. This separation is what makes the system both persistable and blazing-fast — serializing a page snapshot never captures transient state, only the schema of what variables exist and their defaults.

---

### 1.1 State Schema

**New top-level key in `PageDocument`:**

```typescript
// packages/core/src/types/index.ts additions

export type NexusVarType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface NexusVariable {
  id:           string;          // nanoid — stable reference key
  name:         string;          // e.g. "cart_total" — user-defined slug
  label:        string;          // e.g. "Cart Total" — display name in UI
  type:         NexusVarType;
  defaultValue: unknown;         // persisted to JSON, shown in editor
  description?: string;          // optional tooltip in inspector
  readonly?:    boolean;         // prevents canvas-side mutation (server-only vars)
}

export interface NexusBinding {
  prop:       string;            // which widget prop is bound, e.g. "text", "value"
  variable:   string;            // NexusVariable.id — stable even after rename
  transform?: string;            // optional JS expression: "$value.toFixed(2)"
}

// Added to PageDocument root:
export interface PageDocument {
  // ...existing fields
  variables: NexusVariable[];   // the Model — persisted in page JSON
}

// Added to CanvasNode:
export interface CanvasNode {
  // ...existing fields
  bindings?: NexusBinding[];    // per-node binding declarations
}
```

**New Zustand runtime slice — `useDataBindStore`:**

```typescript
// packages/core/src/store/dataBind.store.ts

interface DataBindState {
  // Live variable values — NOT persisted to page JSON
  values: Record<string, unknown>;           // variableId → current value

  // Actions
  initFromPage:    (vars: NexusVariable[]) => void;
  setVariable:     (id: string, value: unknown) => void;
  resetToDefaults: (vars: NexusVariable[]) => void;
  getResolved:     (id: string) => unknown;
}
```

The runtime store is **initialized** from `PageDocument.variables[].defaultValue` on page load and each canvas reset. It is **never written back** to the JSON — only `defaultValue` changes persist to disk.

---

### 1.2 Render Loop Updates

**Token resolver — `resolveBindings(node, runtimeValues)` — pure function, fully memoizable:**

```typescript
// packages/core/src/lib/binding-resolver.ts

export function resolveBindings(
  node: CanvasNode,
  values: Record<string, unknown>,
  variables: NexusVariable[],
): Record<string, unknown> {
  if (!node.bindings?.length) return node.props;

  const resolved = { ...node.props };

  for (const binding of node.bindings) {
    const variable = variables.find((v) => v.id === binding.variable);
    if (!variable) continue;

    let value = values[binding.variable] ?? variable.defaultValue;

    // Optional transform — sandboxed, stateless JS expression
    if (binding.transform) {
      try {
        // eslint-disable-next-line no-new-func
        value = new Function('$value', `return (${binding.transform})`)(value);
      } catch {
        // fail silently — show raw value on transform error
      }
    }

    resolved[binding.prop] = value;
  }

  return resolved;
}
```

**NodeRenderer selective subscription:**

Each `NodeRenderer` instance subscribes only to the variable IDs it actually binds to. A `cart_total` update will not re-render a `user_name` element:

```typescript
// In NodeRenderer.tsx
const boundVariableIds = useMemo(
  () => node.bindings?.map((b) => b.variable) ?? [],
  [node.bindings],
);

const resolvedValues = useDataBindStore(
  useCallback(
    (s) => {
      const subset: Record<string, unknown> = {};
      for (const id of boundVariableIds) subset[id] = s.values[id];
      return subset;
    },
    [boundVariableIds],
  ),
  shallow,
);
```

**Inline `{variable_name}` syntax for Text widgets:**

```typescript
function interpolateTokens(
  text: string,
  namedValues: Record<string, unknown>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, name) => {
    const val = namedValues[name];
    return val !== undefined ? String(val) : `{${name}}`;
  });
}
```

This handles the "magic" quick-bind feel in text content. Full property bindings (color, visibility, etc.) use the `NexusBinding` declaration system above.

---

### 1.3 UI Integration — Executive Dark Spec

**Variable Editor Panel** — new Left Panel tab (`'data-bind'`):

- Panel background: `#121821`; header stripe: `#0d1117`
- "Add Variable" button: `background: rgba(16,183,127,0.12)`, `border: 1px solid #10b77f`, `color: #10b77f`, `font-size: 11px`
- Each variable row: `background: #0d1117`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 6px`
- Variable name rendered in `font-family: 'JetBrains Mono', monospace`, `font-size: 11px`, `color: #dde4dd`
- Type pill: `background: rgba(16,183,127,0.10)`, `color: #10b77f`, `font-size: 10px`
- Delete icon: Lucide `Trash2`, `size={12}`, `strokeWidth={1.5}`, `color: #4a5f4e` → `#ef4444` on hover

**Binding picker in Right Panel** — new `SchemaRenderer` control type `'binding-picker'`:

- Added to the **Advanced** accordion section that every widget inherits
- Control row height: 28px (matches all other Right Panel controls)
- Bound state indicator: Lucide `Link2` icon, `size={11}`, `strokeWidth={1.5}`, `color: #10b77f`, inline left of the field
- Unbound state: Lucide `Link2Off`, `size={11}`, `color: #3a5040` (muted)
- Variable select dropdown: `background: #0d1117`, `border: 1px solid rgba(255,255,255,0.08)`, `color: #bbcabf`, `font-size: 11px`
- Transform input: monospace `11px`, `color: #9ab09e`, `background: #080c16`
- In edit mode, any widget with at least one active binding shows a small emerald chain badge on its canvas overlay: `background: #10b77f`, `color: #fff`, `font-size: 9px`, `border-radius: 3px`, text `BOUND`

---

### 1.4 Missing Gaps & Architectural Enhancements

| Gap | Solution |
|-----|----------|
| **Variable name collisions** | Names are slugified on input (`cart total` → `cart_total`); `id` (nanoid) is the stable reference — renaming updates `.label` only, never breaks bindings |
| **Circular computed transforms** | Transform strings are stateless JS expressions (`$value * 1.2`) — no ability to reference other variables, preventing cycles by design |
| **Type coercion in display** | Resolver coerces to declared `NexusVarType` before passing to widgets — `number` bound to a text prop gets `String()` automatically |
| **Canvas edit-mode feedback** | Bound props show emerald `BOUND` badge on canvas overlay; hovering reveals which variable |
| **Button → variable mutation** | Handled by Action Node system (Feature 3) — `setVariable` action type closes the MVC loop |
| **Server-rendered pages** | Compiler emits `<script>window.__NEXUS_STATE__ = { ...defaultValues }</script>` + a ~0.5kb runtime that applies bindings on `DOMContentLoaded` |
| **Variable not found** | `resolveBindings` fails gracefully — missing variable ID leaves the prop at its static value; editor shows an amber warning badge on the binding row |

---

### 1.5 Execution Order

1. `NexusVariable` + `NexusBinding` types; `PageDocument.variables` + `CanvasNode.bindings`
2. `useDataBindStore` Zustand slice (`initFromPage` / `setVariable`)
3. `resolveBindings()` pure resolver + `interpolateTokens()` for text
4. `NodeRenderer` selective subscription + resolved props passthrough
5. `VariableEditorPanel` (Left Panel `data-bind` tab) — Executive Dark spec above
6. `binding-picker` SchemaRenderer control + per-node Right Panel section
7. Compiler: `__NEXUS_STATE__` script block + binding runtime snippet

---
---

## Feature 2: Role-Level Security (RLS) & Visual Routing

### Architectural Overview

This feature has a critical security distinction that the original spec does not address: **client-side visibility hiding is not security.** The plan implements two completely separate enforcement layers — a **compile-time server guard** (PHP middleware wrapping protected HTML) and a **runtime client guard** (canvas renderer). Both are always in sync because they are generated from the same `VisibilityRule` data at compile time. The Right Panel exposes only the UX authoring layer; the actual security enforcement is entirely architectural and invisible to the builder.

---

### 2.1 State Schema

**New fields on `CanvasNode`:**

```typescript
export interface VisibilityRule {
  roles:      string[];          // e.g. ['admin', 'editor'] — empty = public
  condition?: {
    variableId: string;          // NexusVariable.id — integrates with Data-Bind
    operator:   '==' | '!=' | '>' | '<' | 'truthy' | 'falsy';
    value:      unknown;
  };
  action:     'hide' | 'redirect';
  redirectTo?: string;           // URL or page slug if action = 'redirect'
}

export interface CanvasNode {
  // ...existing fields
  visibility?: VisibilityRule;
}
```

**New global config in `PageDocument`:**

```typescript
export interface PageDocument {
  // ...existing fields
  roleConfig: {
    authTokenHeader: string;      // 'X-WP-Nonce' in WP phase; JWT header in SaaS
    guestRole:       string;      // role slug for unauthenticated, e.g. 'guest'
    roleHierarchy:   string[];    // low → high: ['guest','subscriber','editor','admin']
  };
}
```

`roleHierarchy` enables **role inheritance**: an `admin` automatically sees all `subscriber`-restricted elements. Enforced by `indexOf(currentRole) >= indexOf(minimumRequired)`.

---

### 2.2 Render Loop Updates

**Canvas-side visibility guard in `NodeRenderer`:**

```typescript
const previewRole = useUIStore((s) => s.previewRole);  // null = current real user
const roleConfig  = useCanvasStore((s) => s.page?.roleConfig);

function isVisible(node: CanvasNode): boolean {
  const rule = node.visibility;
  if (!rule || rule.roles.length === 0) return true;   // public — always visible

  const hierarchy    = roleConfig?.roleHierarchy ?? [];
  const currentIndex = hierarchy.indexOf(previewRole ?? roleConfig?.guestRole ?? 'guest');
  const minIndex     = Math.min(...rule.roles.map((r) => hierarchy.indexOf(r)));

  const rolePass = currentIndex >= minIndex;

  // AND logic: role check + optional Data-Bind condition
  if (rolePass && rule.condition) {
    const val = useDataBindStore.getState().getResolved(rule.condition.variableId);
    return evaluateCondition(val, rule.condition.operator, rule.condition.value);
  }

  return rolePass;
}
```

**Edit mode behaviour:** Hidden nodes are never fully invisible in the editor. They render at `opacity: 0.3` with a lock overlay badge — `background: rgba(8,12,22,0.85)`, Lucide `Lock` icon `size={12}` `strokeWidth={1.5}` `color: #10b77f`, label showing the minimum required role in `font-size: 10px` `color: #bbcabf`.

**Preview/compile mode:** Hidden nodes are fully excluded from the render tree — `return null` from `NodeRenderer`.

**New `UIStore` field:**

```typescript
previewRole: string | null;
setPreviewRole: (role: string | null) => void;
```

---

### 2.3 Compiler — Server-Side Enforcement

The PHP compiler wraps protected subtrees so restricted HTML is never transmitted to unauthorized clients:

```php
// Generated output for a node with roles: ['subscriber', 'editor', 'admin']
<?php if ( nexus_current_user_can_view( ['subscriber','editor','admin'], $role_hierarchy ) ) : ?>
  <!-- compiled HTML subtree -->
<?php endif; ?>

// redirect action variant:
<?php
if ( ! nexus_current_user_can_view( ['admin'], $role_hierarchy ) ) {
  wp_redirect( home_url('/login') ); exit;
}
?>
```

`nexus_current_user_can_view()` ships as a helper in the plugin's `includes/` directory. For the future SaaS adapter it becomes a JWT claim check.

---

### 2.4 UI Integration — Executive Dark Spec

**Right Panel — injected into base `settingsSchema` for every widget:**

New **"Visibility & Access"** accordion section, collapsed by default, `border-top: 1px solid rgba(255,255,255,0.06)`:

- **Role Restrictions toggle**: Lucide `Shield` icon `size={12}` `strokeWidth={1.5}`; toggle track `background: #10b77f` when active, `#1e2d25` when inactive
- **Role chips multi-select**: Each role pill `background: rgba(16,183,127,0.10)`, `border: 1px solid rgba(16,183,127,0.25)`, `color: #10b77f`, `font-size: 10px`, `border-radius: 4px`; active (selected) pill `background: #10b77f`, `color: #080c16`; populated dynamically from `roleConfig.roleHierarchy`
- **"If Restricted" select**: same dense select styling as existing Right Panel dropdowns — `background: #0d1117`, `font-size: 11px`, `color: #bbcabf`
- **Redirect URL input**: only rendered when action = `'redirect'`; Lucide `ArrowUpRight` prefix icon `size={11}` `strokeWidth={1.5}` `color: #4a5f4e`
- **Condition builder**: collapsed sub-section, label "Additional Condition", Lucide `GitBranch` `size={11}` `strokeWidth={1.5}`

**"Preview As" role simulator** — in TopBar, adjacent to the existing breakpoint pills:

- Lucide `Eye` icon `size={13}` `strokeWidth={1.5}` `color: #bbcabf`
- Dropdown: `background: #121821`, `border: 1px solid rgba(255,255,255,0.10)`, `font-size: 11px`
- Active (simulating) state: `Eye` icon turns `#10b77f`; selected role shown as `color: #10b77f` text inline

---

### 2.5 Missing Gaps & Architectural Enhancements

| Gap | Solution |
|-----|----------|
| **Client-side bypass** | PHP compiler wraps protected subtrees in server guards — HTML is never transmitted to unauthorized clients |
| **Role inheritance** | `roleHierarchy` array + index comparison — admins always see subscriber-restricted content |
| **Condition + role AND logic** | `VisibilityRule` supports both `roles[]` AND `condition` — both must pass simultaneously |
| **Whole-page protection** | `PageDocument` root gets its own `visibility` rule; compiler emits a top-level PHP guard before any HTML output |
| **Nested container inheritance** | If a parent container is hidden for a role, its entire subtree is skipped regardless of child rules — compiler short-circuits subtree traversal |
| **"Preview As" simulator** | `UIStore.previewRole` + TopBar dropdown — designer verifies every role's view without publishing |
| **Roles not configured** | If `roleConfig.roleHierarchy` is empty, all restrictions are ignored with a console warning — fail-open policy keeps the editor usable |
| **SSRF in proxy (Feature 3 overlap)** | WP proxy also checks `current_user_can()` before forwarding webhook calls — RLS enforces at the API layer too |

---

### 2.6 Execution Order

1. `VisibilityRule` type + `CanvasNode.visibility` + `PageDocument.roleConfig`
2. `UIStore.previewRole` + `setPreviewRole`
3. `isVisible()` guard in `NodeRenderer` (edit overlay vs full exclusion)
4. "Preview As" dropdown in TopBar
5. `role-selector` chip control in `SchemaRenderer`
6. **"Visibility & Access"** section injected into base `settingsSchema`
7. PHP compiler: `nexus_current_user_can_view()` helper + guard generation
8. `condition-builder` SchemaRenderer control (shares infrastructure with Data-Bind)

---
---

## Feature 3: The Action Node — Native Webhook & Automation Engine

### Architectural Overview

An Action Node is a declarative, **ordered** pipeline of steps attached to a DOM event on any functional widget. Each step is one of: `setVariable`, `webhookCall`, `navigate`, `showModal`, or `customJS` (premium-gated). The pipeline is stored in the page JSON, executed at runtime by a thin singleton `NexusActionEngine`, and is never compiled to custom PHP — it runs entirely client-side via `fetch()`. The engine integrates directly with `useDataBindStore` to close the MVC loop opened by Feature 1.

---

### 3.1 State Schema

```typescript
export type ActionTrigger =
  | 'click' | 'submit' | 'change' | 'focus' | 'blur' | 'load';

export type ActionStepType =
  | 'setVariable'
  | 'webhookCall'
  | 'navigate'
  | 'showModal'
  | 'customJS';    // premium

export interface ActionStep {
  id:       string;             // nanoid
  type:     ActionStepType;
  label?:   string;             // user-defined label for the pipeline UI

  // --- setVariable ---
  variableId?: string;
  setValue?:   unknown;         // literal OR "$trigger.value" expression

  // --- webhookCall ---
  url?:               string;
  method?:            'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?:           Record<string, string>;
  payloadTemplate?:   string;   // JSON string with {variable_name} interpolation
  responseMapping?:   Array<{   // map response JSON paths → NexusVariables
    jsonPath:   string;         // e.g. "$.data.total"
    variableId: string;
  }>;
  onError?:     'continue' | 'abort' | 'retry';
  retryCount?:  number;

  // --- navigate ---
  destination?: string;
  newTab?:      boolean;

  // --- showModal ---
  targetNodeId?: string;
  modalAction?:  'open' | 'close' | 'toggle';

  // --- customJS (premium gate) ---
  code?: string;
}

export interface ActionPipeline {
  id:       string;
  trigger:  ActionTrigger;
  steps:    ActionStep[];
  runAsync: boolean;            // true = fire-and-forget (don't block UI)
}

// Added to CanvasNode:
export interface CanvasNode {
  // ...existing fields
  actions?: ActionPipeline[];
}
```

---

### 3.2 The Action Engine — Singleton Runtime Executor

```typescript
// packages/core/src/lib/action-engine.ts

export class NexusActionEngine {
  async execute(
    pipeline:       ActionPipeline,
    triggerContext: { event: Event; nodeProps: Record<string, unknown> },
  ): Promise<void> {
    for (const step of pipeline.steps) {
      const abort = await this.executeStep(step, triggerContext);
      if (abort) break;
    }
  }

  private async executeStep(
    step: ActionStep,
    ctx:  ActionContext,
  ): Promise<boolean /* aborted */> {
    switch (step.type) {
      case 'setVariable':
        useDataBindStore.getState().setVariable(
          step.variableId!,
          this.resolveValue(step.setValue, ctx),
        );
        return false;

      case 'webhookCall':
        return await this.runWebhook(step, ctx);

      case 'navigate':
        if (step.newTab) window.open(step.destination!, '_blank');
        else window.location.href = step.destination!;
        return true;

      case 'showModal':
        useUIStore.getState().toggleModalNode(step.targetNodeId!, step.modalAction!);
        return false;

      case 'customJS':
        if (!isPremiumFeatureEnabled('customJS')) return false;
        // eslint-disable-next-line no-new-func
        await new Function('$ctx', '$store', step.code!)(ctx, {
          useDataBindStore,
          useCanvasStore,
        });
        return false;
    }
  }

  private async runWebhook(
    step: ActionStep,
    ctx:  ActionContext,
  ): Promise<boolean> {
    const payload = this.interpolatePayload(step.payloadTemplate ?? '{}', ctx);

    // Auto-set loading variable: __loading_<stepId> = true
    useDataBindStore.getState().setVariable(`__loading_${step.id}`, true);

    try {
      const res = await fetch(step.url!, {
        method:  step.method ?? 'POST',
        headers: { 'Content-Type': 'application/json', ...step.headers },
        body:    ['GET', 'HEAD'].includes(step.method ?? '') ? undefined : payload,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      for (const m of step.responseMapping ?? []) {
        const val = JSONPath(json, m.jsonPath);
        useDataBindStore.getState().setVariable(m.variableId, val);
      }
      return false;

    } catch (err) {
      if (step.onError === 'abort') return true;
      if (step.onError === 'retry' && (step.retryCount ?? 0) > 0) {
        return this.runWebhook({ ...step, retryCount: step.retryCount! - 1 }, ctx);
      }
      console.error('[NexusAction]', err);
      return false;

    } finally {
      useDataBindStore.getState().setVariable(`__loading_${step.id}`, false);
    }
  }
}

export const actionEngine = new NexusActionEngine();
```

**Automatic loading variable:** Every `webhookCall` step automatically creates `__loading_<stepId>` as a runtime NexusVariable (not declared in `PageDocument.variables` — injected at engine init). Users can bind a button's `disabled` prop or a spinner widget's `visibility` to this variable with zero extra config.

---

### 3.3 Widget Integration — Event Wiring

Widgets declare supported triggers in their `NexusWidget` definition:

```typescript
// button-widget NexusWidget:
actionTriggers: ['click'],

// form-widget NexusWidget:
actionTriggers: ['submit', 'change'],
```

`NodeRenderer` wraps any node with `node.actions` in the appropriate event handlers:

```typescript
const wiredHandlers = useMemo(() => {
  if (!node.actions?.length) return {};
  const handlers: Record<string, (e: Event) => void> = {};

  for (const pipeline of node.actions) {
    const domEvent = `on${capitalize(pipeline.trigger)}`;
    handlers[domEvent] = (e: Event) => {
      e.preventDefault();
      if (pipeline.runAsync) {
        void actionEngine.execute(pipeline, { event: e, nodeProps: resolvedProps });
      } else {
        actionEngine.execute(pipeline, { event: e, nodeProps: resolvedProps });
      }
    };
  }
  return handlers;
}, [node.actions, resolvedProps]);
```

---

### 3.4 UI Integration — Executive Dark Spec

**New "Actions" tab in Right Panel** — only rendered when `widget.actionTriggers` is non-empty:

- Tab label: "Actions", Lucide `Zap` icon `size={12}` `strokeWidth={1.5}` `color: #10b77f`
- Empty state: `color: #4a5f4e`, `font-size: 11px`, text "No pipelines yet. Add one below."
- "Add Pipeline" button: `background: rgba(16,183,127,0.10)`, `border: 1px solid rgba(16,183,127,0.30)`, `color: #10b77f`, `font-size: 11px`, Lucide `Plus` `size={11}` `strokeWidth={1.5}`

**Pipeline card** — each `ActionPipeline` renders as a collapsible card:

- Card: `background: #0d1117`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 6px`, `padding: 8px 10px`
- Header: trigger label in `font-size: 11px` `color: #dde4dd` + Lucide `ChevronDown` `size={11}` `strokeWidth={1.5}` `color: #4a5f4e`
- Async toggle: `font-size: 10px` label "Fire & Forget", same toggle style as Feature 2

**Step row** — each step in the pipeline:

- Left icon (per type): `Zap` for setVariable, `Globe` for webhookCall, `Navigation` for navigate, `Layers` for showModal, `Code2` for customJS — all `size={11}` `strokeWidth={1.5}`
- Step type pill: `background: rgba(16,183,127,0.08)`, `color: #10b77f`, `font-size: 10px`, `border-radius: 3px`
- Drag handle: `GripVertical` `size={10}` `strokeWidth={1.5}` `color: #3a5040` — steps are reorderable
- Delete step: `X` `size={10}` `strokeWidth={1.5}` `color: #3a5040` → `#ef4444` on hover

**Webhook step expanded UI (IDE-style JSON payload mapper):**

- URL input: `font-family: monospace`, `font-size: 11px`, `background: #080c16`, `color: #dde4dd`, `border: 1px solid rgba(255,255,255,0.08)`
- Method selector: compact pill group `GET / POST / PUT / PATCH / DELETE`, active pill `background: #10b77f`, `color: #080c16`
- Payload template: multi-line `<textarea>`, `font-family: monospace`, `font-size: 11px`, `color: #9ab09e`, `background: #080c16`, `min-height: 72px`
- Response mapping rows: `jsonPath` input (monospace, `color: #bbcabf`) + `→` separator (`color: #3a5040`) + variable dropdown
- On-error row: `font-size: 10px`, three segmented options `continue / abort / retry`

---

### 3.5 Missing Gaps & Architectural Enhancements

| Gap | Solution |
|-----|----------|
| **CORS on webhook calls** | WP phase: Action Engine calls `/wp-json/nexus/v1/proxy` which forwards the request server-side. SaaS phase: direct `fetch()`. Proxy validates against an allowlist; `localhost`/private ranges blocked (SSRF prevention) |
| **Sensitive auth headers** | Header values support `{variable_name}` tokens — API keys stored in NexusVariables flagged `readonly: true`, never hardcoded in JSON |
| **Loading state UX** | Auto-injected `__loading_<stepId>` runtime variable — bind to button `disabled` or spinner `visibility` with one click |
| **Form field values in payload** | Trigger context exposes `$trigger.value` + `$form.fields` object — interpolated in `payloadTemplate` |
| **Action chaining / error branching** | `onError: 'abort'` terminates pipeline; future: conditional branch step type |
| **Pipeline reuse** | `PageDocument.sharedPipelines[]` — named, reusable pipeline definitions; widgets reference by ID |
| **Edit-mode action prevention** | `actionEngine.execute()` is a no-op in edit mode — events wired only in preview/published output |
| **customJS premium gate** | Calls `isPremiumFeatureEnabled('customJS')` — shows `UpgradePrompt` overlay if not unlocked |

---

### 3.6 Execution Order

1. `ActionPipeline` / `ActionStep` types + `CanvasNode.actions`
2. `NexusActionEngine` singleton + `setVariable` + `navigate` step handlers (no network, testable immediately)
3. Event wiring in `NodeRenderer` (edit-mode guard)
4. `webhookCall` step + WP proxy endpoint
5. `action-pipeline-editor` SchemaRenderer control (pipeline builder UI — Executive Dark spec above)
6. **"Actions"** tab injected into Right Panel for action-capable widgets
7. `responseMapping` + JSONPath resolver
8. `customJS` step behind PremiumGate
9. `sharedPipelines` reuse system

---
---

## Feature 4: Zero-Config PWA Compilation

### Architectural Overview

PWA compilation is a **Serialization Engine upgrade**, not a canvas or Zustand store change. The compiler's `generatePublishPayload()` function gains a second output alongside HTML/CSS: a `PWABundle` containing `manifest.json`, `sw.js` (hand-crafted, ~2kb — no Workbox dependency), and a resized icon set generated via `OffscreenCanvas`. The WordPress plugin serves these files at the **domain root** via rewrite rules — this is the single most critical deployment constraint the original spec does not address, and the plan solves it explicitly.

---

### 4.1 State Schema

```typescript
export interface PWAIconInput {
  sourceDataUrl: string;    // base64 PNG/JPEG from Media Library
  bgColor:       string;    // background fill for masked icons
}

export interface PWAConfig {
  enabled:          boolean;
  appName:          string;          // defaults to page title
  shortName:        string;          // max 12 chars — home screen label
  description:      string;
  themeColor:       string;          // defaults to Global Styles primary
  backgroundColor:  string;
  display:          'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  startUrl:         string;          // defaults to page permalink
  orientation:      'portrait' | 'landscape' | 'any';
  icon:             PWAIconInput | null;

  cacheStrategy: {
    pages:  'network-first' | 'cache-first' | 'stale-while-revalidate';
    assets: 'cache-first' | 'network-first';
    images: 'cache-first' | 'network-first';
    api:    'network-only' | 'network-first';  // for Action Node webhook calls
  };

  offlinePage: string | null;        // nodeId of a canvas page to show offline
}

export interface PageDocument {
  // ...existing fields
  pwaConfig?: PWAConfig;
}
```

---

### 4.2 Compiler / Serialization Engine Updates

**`manifest.json` generator:**

```typescript
export function generateManifest(config: PWAConfig, pageUrl: string): string {
  const icons = config.icon
    ? generateIconSet(config.icon)
    : DEFAULT_NEXUS_ICONS;

  return JSON.stringify({
    name:             config.appName,
    short_name:       config.shortName.slice(0, 12),
    description:      config.description,
    theme_color:      config.themeColor,
    background_color: config.backgroundColor,
    display:          config.display,
    start_url:        config.startUrl || pageUrl,
    orientation:      config.orientation,
    scope:            '/',
    icons,
  }, null, 2);
}
```

**Icon generation — `OffscreenCanvas` in-browser, zero server processing:**

```typescript
async function generateIconSet(input: PWAIconInput): Promise<PWAIcon[]> {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const icons: PWAIcon[] = [];

  for (const size of sizes) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx    = canvas.getContext('2d')!;

    // iOS-style rounded background fill
    ctx.fillStyle = input.bgColor;
    ctx.roundRect(0, 0, size, size, size * 0.22);
    ctx.fill();

    // Source image centered with 15% padding
    const img = await loadImage(input.sourceDataUrl);
    const pad = size * 0.15;
    ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    icons.push({
      src:     `/nexus-icons/icon-${size}x${size}.png`,
      sizes:   `${size}x${size}`,
      type:    'image/png',
      purpose: size >= 192 ? 'any maskable' : 'any',
    });
    // Blob transmitted to WP plugin via publish REST call for disk storage
  }

  return icons;
}
```

**Service Worker generator — hand-crafted, ~2kb, no Workbox:**

```typescript
export function generateServiceWorker(
  config:    PWAConfig,
  assetUrls: string[],
): string {
  return `
// Nexus Architect — Auto-generated Service Worker v${Date.now()}
const CACHE = 'nexus-v${Date.now()}';
const PRECACHE = ${JSON.stringify(assetUrls)};

self.addEventListener('install', (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
);

self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);

self.addEventListener('fetch', (e) => {
  ${generateFetchStrategy(config.cacheStrategy)}
});
`.trim();
}
```

Cache version uses `Date.now()` — every publish automatically invalidates the previous SW cache.

**HTML `<head>` injections (compiler appends these):**

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="${themeColor}" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/nexus-icons/icon-192x192.png" />
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/nexus-sw.js');
  }
</script>
```

---

### 4.3 WordPress Plugin — Root-Level File Serving

`manifest.json` and `sw.js` **must** be served from `https://domain.com/manifest.json` — not from the plugin subdirectory. This is enforced via WordPress rewrite rules registered on plugin activation:

```php
// includes/Enqueue.php

add_action('init', function () {
  add_rewrite_rule('^manifest\.json$',       'index.php?nexus_manifest=1', 'top');
  add_rewrite_rule('^nexus-sw\.js$',         'index.php?nexus_sw=1',       'top');
  add_rewrite_rule('^nexus-icons/(.+)$',     'index.php?nexus_icon=$matches[1]', 'top');
  flush_rewrite_rules();
});

add_filter('query_vars', fn($v) => [...$v, 'nexus_manifest', 'nexus_sw', 'nexus_icon']);

add_action('template_redirect', function () {
  if (get_query_var('nexus_manifest')) {
    header('Content-Type: application/manifest+json');
    echo get_option('nexus_pwa_manifest', '{}');
    exit;
  }
  if (get_query_var('nexus_sw')) {
    header('Content-Type: application/javascript');
    echo get_option('nexus_pwa_sw', '');
    exit;
  }
  $icon = get_query_var('nexus_icon');
  if ($icon) {
    $icons = get_option('nexus_pwa_icons', []);
    if (isset($icons[$icon])) {
      header('Content-Type: image/png');
      echo base64_decode($icons[$icon]);
      exit;
    }
  }
});
```

On publish, the REST API save endpoint stores manifest string, SW string, and icon blobs in `wp_options`. The rewrite handler serves them at the correct root paths.

---

### 4.4 UI Integration — Executive Dark Spec

**PWA & App section in `PageSettingsPanel`** — new accordion block, collapsed by default:

- Accordion header: Lucide `Smartphone` `size={12}` `strokeWidth={1.5}` `color: #10b77f`, label "PWA & App"
- **Enable PWA** master toggle: when off, entire section dims to `opacity: 0.4` (all controls disabled)
- **App Name / Short Name**: standard Right Panel text inputs — `background: #0d1117`, `font-size: 11px`, `color: #dde4dd`, `border: 1px solid rgba(255,255,255,0.08)`
- **Theme Color**: existing color picker control, pre-populated from `GlobalStyles.primaryColor`
- **Display Mode**: compact segment control — `standalone / fullscreen / minimal-ui / browser` — active segment `background: #10b77f`, `color: #080c16`
- **App Icon upload**: existing image-upload control; below it: a live 48×48px preview tile showing the generated icon with rounded corners on `background: #121821`
- **Cache Strategy**: four compact row selects (Pages / Assets / Images / API), each `font-size: 11px` — laid out as a 2×2 grid
- **Offline Page**: node-picker dropdown (same pattern as existing page-link controls)

**Publish dialog badge** (PWA enabled):

- Existing `PublishDialog` gains a small badge row: Lucide `Smartphone` `size={11}` `strokeWidth={1.5}` `color: #10b77f` + text "PWA manifest & service worker will be generated", `font-size: 10px`, `color: #bbcabf`
- If HTTPS not detected: amber warning `color: #F59E0B`, Lucide `AlertTriangle` `size={11}` `strokeWidth={1.5}` — "PWA features require HTTPS"

---

### 4.5 Missing Gaps & Architectural Enhancements

| Gap | Solution |
|-----|----------|
| **WordPress subdirectory installs** | `start_url` and `scope` computed from `home_url()` in PHP — never hardcoded to `/` |
| **HTTPS enforcement** | Publish dialog emits amber warning (not a blocker) if `home_url()` is HTTP; SW registration is skipped silently if HTTP |
| **Cache invalidation** | SW uses `Date.now()` version key — every publish invalidates the old cache automatically |
| **Maskable icon correctness** | `roundRect()` + `bgColor` fill produces an icon that passes Google Lighthouse maskable icon audit |
| **Offline fallback page** | If `offlinePage` nodeId is set, compiler generates standalone `offline.html`; SW returns it for navigation requests when network unavailable |
| **`beforeinstallprompt` deferral** | Compiler injects a script that captures the prompt; an Action Node `showInstallPrompt` step type triggers it — users can wire a custom "Install App" button |
| **Multi-page sites** | Each published page regenerates the SW with its combined asset list; the shared manifest at root covers all pages under `scope: '/'` |
| **Safari / iOS gap** | iOS ignores `manifest.json` entirely — the `<meta apple-mobile-web-app-*>` tags handle iOS PWA; compiler emits both paths |
| **Icon not provided** | Default Nexus icon set shipped with the plugin — used as fallback so PWA is valid even if the user skips icon upload |

---

### 4.6 Execution Order

1. `PWAConfig` type + `PageDocument.pwaConfig` schema
2. `generateManifest()` compiler function (static, no icons yet)
3. `generateServiceWorker()` with static `cache-first` strategy
4. WP plugin: rewrite rules + `wp_options` storage + `template_redirect` handler
5. Publish pipeline: `compilePWA()` called alongside existing `generatePublishPayload()`
6. HTML `<head>` tag injection in existing HTML compiler
7. `generateIconSet()` via `OffscreenCanvas` + icon blob transmission on publish
8. Dynamic `generateFetchStrategy()` based on `cacheStrategy` config
9. `PWA & App` accordion in `PageSettingsPanel` — Executive Dark spec above
10. `beforeinstallprompt` deferral + Action Node `showInstallPrompt` step type

---
---

## Cross-Feature Integration Map

These four features form a unified application platform — not independent modules:

| Integration | Mechanism |
|-------------|-----------|
| **Data-Bind → Action Node** | `setVariable` is an Action Step — buttons mutate the Model, bound views react instantly |
| **Action Node → Data-Bind** | Webhook `responseMapping` writes response values into NexusVariables — completes the full MVC loop |
| **RLS → Data-Bind** | `VisibilityRule.condition` evaluates a NexusVariable — role check AND state condition can gate visibility simultaneously |
| **PWA → Data-Bind** | SW caches HTML with default values baked in; `__NEXUS_STATE__` script restores runtime bindings on offline load |
| **RLS → Compiler** | PHP guards wrap server output; Action Node WP proxy also checks `current_user_can()` — RLS enforced at the HTTP layer |
| **Action Node → PWA** | API calls use `network-only` cache strategy — stale webhook responses are never served from cache |
| **All four → Executive Dark** | All new controls enter via `settingsSchema` / `SchemaRenderer` — zero new UI surfaces, consistent `#080c16` / `#121821` / `#10b77f` / 1.5px stroke token usage throughout |

---

## Recommended Build Sequence (Cross-Feature)

Given inter-dependencies, this sequence minimizes rework:

| Step | Feature | Rationale |
|------|---------|-----------|
| 1 | Data-Bind types + `useDataBindStore` | Everything else depends on NexusVariables existing |
| 2 | RLS `VisibilityRule` types + `NodeRenderer` guard | Self-contained, no network, instantly testable |
| 3 | Action Node engine + `setVariable` step | Closes MVC loop with Data-Bind immediately |
| 4 | Webhook step + WP proxy | Unlocks the "native Zapier" demo scenario |
| 5 | Right Panel UI for features 1–3 | `binding-picker`, `role-selector`, `action-pipeline-editor` |
| 6 | PWA manifest + SW generator | Purely additive to compiler — no store changes |
| 7 | WP root-level file serving | Deployment plumbing |
| 8 | Icon generation + Page Settings PWA section | Polish layer |
| 9 | Full E2E test suite | Covers all four feature interactions end-to-end |
