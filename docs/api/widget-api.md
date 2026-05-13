# Nexus Architect — Widget API Reference

> **Version:** 1.0 (Phase 10)  
> **Package:** `@nexus/core`

---

## Overview

Widgets are the fundamental building blocks of every page in Nexus Architect.
Each widget is a self-contained package that declares its own schema, renders
itself on the canvas, and optionally spawns child nodes when dropped.

The widget system is **platform-agnostic**: widgets never import WordPress
globals. They work identically in the browser sandbox, the WP plugin, and the
future SaaS adapter.

---

## Registering a Widget

```ts
import { registerWidget } from '@/widgets/registry';

registerWidget({
  type:         'my-widget',          // unique snake-case identifier
  label:        'My Widget',          // display name shown in the widget palette
  icon:         MyIcon,               // Lucide icon component
  category:     'content',            // 'layout' | 'content' | 'media' | 'interactive' | 'advanced'
  isPremium:    false,                // set true to gate behind PremiumGate
  defaultProps: {
    text: 'Hello World',
    color: '#ffffff',
  },
  controls: [
    {
      key:   'text',
      label: 'Text',
      type:  'text',
      tab:   'content',
    },
    {
      key:   'color',
      label: 'Text Color',
      type:  'color',
      tab:   'style',
    },
  ],
  Renderer: MyWidgetRenderer,        // React component — see Renderer Contract below
});
```

---

## NexusWidgetDefinition Type

```ts
interface NexusWidgetDefinition {
  type:         string;
  label:        string;
  icon:         LucideIcon;
  category:     WidgetCategory;
  isPremium?:   boolean;
  defaultProps: Record<string, unknown>;
  controls?:    ControlSchema[];
  Renderer:     React.ComponentType<WidgetRendererProps>;
  Inspector?:   React.ComponentType<WidgetInspectorProps>;   // optional custom inspector
  createChildNodes?: (props: Record<string, unknown>) => ChildNodeSpec[];
}
```

### WidgetCategory

```ts
type WidgetCategory =
  | 'layout'       // Columns, Section, Grid
  | 'content'      // Heading, Text, Button, List
  | 'media'        // Image, Video, Icon
  | 'interactive'  // Accordion, Tabs, Form, Auth
  | 'advanced';    // HTML Embed, Dynamic Data, Custom Code
```

---

## Renderer Contract

Every widget renderer receives two props:

```ts
interface WidgetRendererProps {
  nodeId:    string;   // stable ID — use to read node data from the canvas store
  isPreview: boolean;  // true when rendering in the published preview iframe
}
```

**Do:**
- Read your own props via `useCanvasStore` + `nodeId`
- Apply styles from `getVisualNodeStyles(node.styles)`
- Be a pure React component (functional preferred)

**Don't:**
- Import WordPress globals (`wp`, `ajaxurl`)
- Read other nodes' data directly (use composition instead)
- Use `document.querySelector` to find sibling DOM nodes

### Minimal Renderer Example

```tsx
import { useCanvasStore } from '@nexus/core';
import { getVisualNodeStyles } from '@/lib/style-utils';

interface Props { nodeId: string; isPreview: boolean; }

export function MyWidgetRenderer({ nodeId }: Props) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  if (!node) return null;

  const p      = node.props as { text: string; color: string };
  const styles = getVisualNodeStyles(node.styles);

  return (
    <div style={{ ...styles, color: p.color }}>
      {p.text}
    </div>
  );
}
```

---

## Control Schema Types

Controls defined in the `controls` array are rendered automatically in the
Right Panel Content tab via `SchemaRenderer`.

| `type`       | Value type          | Notes                                   |
|--------------|---------------------|-----------------------------------------|
| `text`       | `string`            | Single-line text input                  |
| `textarea`   | `string`            | Multi-line text area                    |
| `number`     | `number`            | Numeric spinner with optional min/max   |
| `color`      | `string`            | Hex / rgba colour picker                |
| `select`     | `string`            | Dropdown; requires `options: []`        |
| `toggle`     | `boolean`           | On/off switch                           |
| `image`      | `string`            | URL string; opens media picker          |
| `richtext`   | `string`            | Tiptap inline editor                    |
| `range`      | `number`            | Slider; requires `min`, `max`, `step`   |

### Control Definition

```ts
interface ControlSchema {
  key:          string;        // must match a key in defaultProps
  label:        string;        // label shown in the panel
  type:         ControlType;
  tab:          'content' | 'style' | 'advanced';
  defaultValue?: unknown;
  placeholder?:  string;
  options?:      Array<{ label: string; value: string }>;
  min?:          number;
  max?:          number;
  step?:         number;
  isPremium?:    boolean;      // gate this control behind PremiumGate
}
```

---

## Child Node Spawning

Widgets that contain other widgets (Columns, Accordion, etc.) implement
`createChildNodes` to auto-scaffold their initial subtree:

```ts
createChildNodes(props) {
  return [
    { type: 'column', props: { width: '50%' } },
    { type: 'column', props: { width: '50%' } },
  ];
}
```

Each `ChildNodeSpec` may itself contain `children: ChildNodeSpec[]` for
deeply nested scaffolding.

---

## Feature Flags

Premium features are gated by the `isPremium` field. The `PremiumGate`
component wraps any UI element and shows an upgrade prompt when the user's
tier is insufficient:

```tsx
import { PremiumGate } from '@/components/premium/PremiumGate';

<PremiumGate feature="cloud-sync" requiredTier="professional">
  <CloudSyncPanel />
</PremiumGate>
```

### Available Tiers

| Tier            | Features                                                    |
|-----------------|-------------------------------------------------------------|
| `free`          | Core builder, 5 pages, community templates                  |
| `personal`      | Unlimited pages, all core widgets, revision history         |
| `professional`  | White-label, cloud sync, dynamic data, priority support     |
| `agency`        | Teams collaboration, client seats, advanced analytics       |

---

## Built-in Widget Types

| Type             | Category    | Premium |
|------------------|-------------|---------|
| `heading`        | content     | No      |
| `text`           | content     | No      |
| `button`         | content     | No      |
| `image`          | media       | No      |
| `video`          | media       | No      |
| `divider`        | content     | No      |
| `spacer`         | content     | No      |
| `html-embed`     | advanced    | No      |
| `columns`        | layout      | No      |
| `section`        | layout      | No      |
| `grid`           | layout      | No      |
| `icon`           | media       | No      |
| `list`           | content     | No      |
| `accordion`      | interactive | No      |
| `alert`          | content     | No      |
| `tabs`           | interactive | No      |
| `testimonial`    | content     | No      |
| `auth-widget`    | interactive | Yes     |

---

*Last updated: Phase 10 — Developer Experience*
