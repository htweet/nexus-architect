# Nexus Architect — Master Development Blueprint
### From Zero to Production: A Phased Strategic Roadmap

> **Prime Directive:** Build a platform-agnostic, AI-native, performance-first page builder that does not just replicate Elementor — it obsoletes it. Every phase decision must serve decoupled architecture, frictionless UX, and long-term SaaS portability.

> **Timeline Reality:** The phase headers below show minimum durations for a focused solo developer with AI assistance. A realistic production v1.0 launch is **12–15 months**, not 35 weeks. Phase 3 (Canvas) and Phase 8 (Premium Tier) are the two most consistently underestimated phases in page builder development — budget double what feels right for each. The summary table at the end reflects adjusted, defensible timelines.

---

## PHASE 0 — Foundation & Governance (Weeks 1–2)

This phase exists before a single line of code is written. Skipping it is the #1 reason ambitious projects collapse at scale.

### 0.1 — Architecture Decision Records (ADRs)
Document every major architectural choice with its rationale *before* building. Key decisions to lock in:
- The Adapter Pattern contract: how the core engine communicates with any backend (WordPress today, Supabase tomorrow) through a single, typed interface.
- The JSON schema standard for page data: what a "Node," a "Section," and a "Widget" look like as data objects — this schema is the backbone of everything.
- Feature flag strategy: how `isPremium` gates are woven into the system without branching the codebase.
- Versioning strategy: how the JSON schema evolves without breaking saved pages.
- **CRDT vs. last-write-wins:** This is a non-negotiable Phase 0 decision. If real-time multi-user collaboration is in the 18-month product vision (it should be — Figma normalized it as a baseline expectation), the data schema in Phase 2 must be CRDT-ready from day one. Retrofitting CRDT onto a last-write-wins schema later requires a near-total rewrite. The decision: adopt a **flat, operation-based mutation log** (compatible with Yjs or Automerge) alongside the Node tree, even if live collaboration is not shipped until Phase 13. Choosing last-write-wins now is a decision to never ship real-time collaboration without a rewrite.

### 0.2 — Repository & Tooling Setup
- Monorepo structure separating `core` (platform-agnostic React engine), `wp-adapter` (WordPress integration layer), and `addons` (premium micro-packages). **Turborepo** is the monorepo manager — not just "a monorepo." Turborepo's remote caching cuts CI build times by 60–80% as the addon ecosystem grows and its task pipeline handles cross-package dependencies cleanly. This must be decided and configured in Phase 0, not added later when the repo already has inertia.
- TypeScript strict mode enforced globally — no escape hatches.
- ESLint, Prettier, and Husky pre-commit hooks established so code quality is non-negotiable from day one.
- Vite configured as the build pipeline for the React frontend.
- Vitest for unit testing, Playwright for end-to-end browser testing.
- **Storybook** configured from Phase 0. Every widget and UI primitive in the builder must have a Storybook story. Developing and reviewing 30+ widget components without Storybook — having to spin up the full WordPress stack to see a button state — wastes weeks of iteration time. Storybook is the development environment for components; the browser is the integration environment.
- **Chromatic** (built by the Storybook team) wired to CI from day one as the visual regression testing layer. For a page builder, visual regressions are silent killers — a renderer change that makes a widget look wrong on 1,000 existing pages. Chromatic screenshots every component story at every breakpoint and flags pixel-level diffs before they ship. This is not optional tooling; it is the quality gate that makes confident refactoring possible.
- **Sentry** for runtime error tracking and **PostHog** for product analytics both configured before the first beta user is invited. You cannot fix what you cannot observe.

### 0.3 — The Design System Foundation
Before any UI is built, establish the builder's own internal design language:
- Color tokens, spacing scale, and typography — stored as CSS custom properties so the builder UI itself is themeable.
- Component primitives (buttons, inputs, panels, tooltips, dropdowns, modals) designed and documented before they are implemented. **Do not build these from scratch.** Use **Radix UI** primitives as the unstyled, fully accessible foundation, styled with Tailwind. Radix has already solved keyboard navigation, focus trapping, ARIA roles, and screen reader compatibility for every common UI pattern. Building a custom dropdown with correct keyboard behavior and accessibility is a full week of work; Radix provides it in an import. The builder's UI sits on Radix; the builder's *output* remains framework-agnostic.
- Accessibility standards defined: keyboard navigation, ARIA roles, and focus management must be first-class from the start, not retrofitted later.

### 0.4 — The Competitive Audit
A structured teardown of Elementor, WPBakery, Bricks Builder, and Oxygen. Document specifically: what makes each one slow, what UX friction points users complain about in public forums and reviews, and what each one has never shipped despite years of requests. This audit becomes the product roadmap's north star — build what they *refused* to fix. Apply a Jobs-to-be-Done (JTBD) lens to the audit: don't just catalog features — document the *outcome* each user segment is trying to achieve. A freelancer's JTBD ("deliver a client site in 3 days without the client breaking it later") is entirely different from an agency's JTBD ("white-label a builder and resell it under our brand"). These different jobs drive different premium feature priorities and different pricing tier structures.

### 0.5 — Pricing Architecture Design (Business Model)
The pricing model is an architectural input, not a post-launch decision. It determines which features must be free, which must be premium, and how the feature flag system in Phase 8 is wired. Lock this in Phase 0.

**Three-tier annual model (validated against comparable WordPress plugin market data):**

The **Personal tier** targets freelancers and solo site owners: one site license, all core free widgets, the full builder UI. Priced at $69/year. This tier's purpose is not significant revenue — it is the conversion bridge for free users who hit the white-label wall.

The **Professional tier** targets independent agency operators and power users: unlimited sites, all core widgets, white-labeling (this is the headline conversion driver — remove all Nexus Architect branding for client handovers), priority support, and advanced dynamic data binding. Priced at $179/year. This tier is where the majority of recurring revenue will come from.

The **Agency tier** targets established agencies and resellers: everything in Professional, plus Cloud Sync (managing components across a client portfolio), team seat licensing (up to 5 users), client portal access, and SLA-backed support. Priced at $349/year.

**White-labeling must be the headline premium feature, not a footnote.** Agencies charge clients $150–300/month for "website management." The builder saying "Nexus Architect" in the footer or admin panel destroys that positioning. This single feature drives more agency-tier conversions than any technical capability. It must be prominent in all upgrade prompts shown to free users.

**Lifetime Deal (LTD) Strategy:** At launch, offer a time-limited lifetime deal at 3–4× the annual Professional price (approximately $497–$597). Route this through AppSumo or a direct launch sale. AppSumo placed FluentCRM, Amelia, and WS Form into tens of thousands of hands within weeks of listing. The LTD serves two purposes: it generates launch cash flow that funds infrastructure and marketing, and it creates a vocal early-adopter base of invested users who become the product's public advocates.

**Unit Economics for Cloud Sync:** Before Phase 8 builds the cloud infrastructure, model the cost. Cloud sync requires hosting JSON repositories and running sync operations at scale. A rough model: if 5,000 Agency tier users each have an average of 10 sites syncing a 50 KB component library daily, that is 2.5 GB of data transfer per day. At AWS/Cloudflare pricing, this is manageable at $349/year, but the model must be run and documented here — not discovered post-launch when the infrastructure bill arrives.

### 0.6 — Go-to-Market Foundation (GTM Parallel Track)
GTM is not a Phase 12 activity. It is a parallel workstream that begins in Phase 0 and runs throughout development. The goal: by launch day, the acquisition infrastructure is already built and generating awareness.

**WordPress.org Listing Strategy:** The free plugin's WordPress.org listing is a primary organic acquisition asset. The plugin name, short description, and long description are indexed by both WordPress.org's internal search and Google. Research and lock in the target keyword positioning in Phase 0 — "lightweight Elementor alternative," "fast WordPress page builder," or similar long-tail terms with high intent and lower competition than "page builder" alone. The listing copy is written by a copywriter with SEO expertise, not by the developer who built the product.

**Creator Outreach Program:** The WordPress tutorial YouTube ecosystem — WPTuts, Ferdy Korpershoek, Darrel Wilson, and comparable channels — is the highest-ROI distribution channel for WordPress tools. A single video from a channel with 100K+ subscribers drives thousands of installs. Begin building relationships with these creators starting at Phase 4, when the canvas is functional enough to demo. Offer beta access, affiliate commission, and early access to premium features in exchange for authentic coverage. Do not wait until launch day to make first contact.

**Comparison Content Strategy:** "Nexus Architect vs. Elementor," "Nexus Architect vs. Bricks Builder," and "Best Elementor alternative 2026" are high-intent search queries where users already have a problem and a budget. A well-researched, benchmark-driven comparison page can rank in 3–6 months and converts at 8–12%. These pages must be live at or before launch — not started after launch when the product needs them immediately. Commission this content in Phase 9 so it can be SEO-indexed during the beta period.

**Affiliate Program:** The WordPress ecosystem runs on affiliate commissions. Tutorial bloggers and YouTubers promote tools they are compensated for recommending — this is not corruption, it is the market structure. Standard is 30–40% recurring commission on the first year of a referred subscription, managed through a platform like Lemon Squeezy or Paddle. The affiliate program must be live on Day 1 of launch, not "coming soon."

---

## PHASE 1 — The Core Plugin Shell (Weeks 3–4)

The goal of this phase is one thing: load a React app inside WordPress without coupling them together.

### 1.1 — WordPress Plugin Scaffold
A minimal, clean PHP plugin that:
- Registers a custom post type (`nexus_page`) for storing page designs as JSON.
- Registers the REST API endpoints the adapter will consume.
- Enqueues the Vite-compiled React app on the builder admin page and on front-end preview routes.
- Implements nonce-based security and capability checks on all REST endpoints.
- Includes an auto-update mechanism wired to a licensing system for future premium delivery.

### 1.2 — The WP Adapter (The Bridge Layer)
This is arguably the most important architectural component of the entire project. The Adapter:
- Implements a standard `DataAdapter` interface that the React core engine calls for all read/write/media operations.
- Translates between the REST API's response shape and the builder's internal data model.
- Handles authentication context (nonces, user permissions) so the core engine never touches WordPress globals directly.
- Exposes a `MediaAdapter` interface for the WordPress media library — later swappable for Cloudinary, S3, or any media provider.

### 1.3 — The Builder Entry Point
The React app bootstraps, receives the adapter as a dependency injection, and renders the builder shell. At the end of Phase 1, the builder loads inside WordPress, talks to the database through the adapter, and the two layers have zero direct knowledge of each other.

### End-to-End Test Gate
Before proceeding to Phase 2: a browser test must confirm that a page can be created, data can be saved via the adapter, and the data can be retrieved — fully round-tripped through the REST API and persisted in the database.

---

## PHASE 2 — The Data Schema & State Engine (Weeks 5–6)

The page data schema is the DNA of the entire product. Everything — rendering, undo/redo, collaboration, AI generation, cloud sync — depends on getting this right.

### 2.1 — The Page Tree Schema
Every page is a tree of `Nodes`. Define the universal Node schema:
- `id` — UUID, generated client-side for optimistic updates.
- `type` — the widget or container type identifier.
- `children` — ordered array of child Node IDs (not nested objects — a flat map is essential for performance and tree manipulation).
- `props` — the widget's own configuration (text content, image source, link URL, etc.).
- `styles` — a responsive style map keyed by breakpoint (`base`, `md`, `lg`, `xl`).
- `visibility` — per-breakpoint show/hide flags.
- `interactions` — future-proofed slot for hover states, click actions, and AI-driven behaviors.
- `_v` — schema version stamp on every node. Required for the migrator system in Phase 10.3 to transform old nodes cleanly.
- `_ops` — an append-only operation log per node, initially empty but structurally present. This is the CRDT-readiness slot decided in Phase 0. If real-time collaboration ships in Phase 13, this log becomes the Yjs or Automerge operation history. If it never ships, it costs nothing. If it is absent now and needed later, it costs a full schema migration and rewrite.

### 2.2 — The Zustand State Architecture
The builder's client-side state is split into focused stores to prevent unnecessary re-renders:
- **CanvasStore:** The live page tree. Every drag, drop, and style change mutates this store.
- **SelectionStore:** The currently selected Node(s) and the active panel state.
- **HistoryStore:** The undo/redo stack — a time-travel log of CanvasStore snapshots.
- **UIStore:** Sidebar visibility, active breakpoint, zoom level, and other pure UI concerns.
- **UserStore:** Authentication state, plan tier, and feature flags.
- **CollaborationStore:** Initially a stub — tracks presence cursors and pending operation acknowledgements. At free-tier launch this store does nothing visible. When real-time collaboration ships (Phase 13), this store activates without requiring changes to the CanvasStore or any other store. Designing it as a stub now costs nothing; not designing it now means rewriting the state architecture later.

### 2.3 — The History Engine (Undo/Redo)
Undo/redo is not a "nice to have" — it is the single biggest trust signal for a page builder. Users will hammer `Ctrl+Z` from day one. The history engine must:
- Record granular actions (not full-page snapshots) for performance.
- Support at least 100 levels of undo without memory pressure.
- Distinguish between "record-worthy" mutations (content changes, additions, deletions) and ephemeral state changes (hover, scroll position) that should not pollute the undo stack.

### 2.4 — Optimistic UI Contract
Define the contract for how all state mutations work: the UI updates *instantly* from local state, and the adapter syncs to the database in the background. If the sync fails, the error is surfaced non-intrusively without reverting the user's work.

### End-to-End Test Gate
A browser test must confirm that a multi-node page tree can be built in state, serialized to JSON, saved to the database, retrieved, deserialized back into state, and rendered identically — with undo/redo operating correctly across all mutations.

---

## PHASE 3 — The Visual Canvas (Weeks 7–14)

> **Timeline Warning:** This is the most underestimated phase in every page builder project. Cross-parent drag-and-drop alone — moving an element from one container to another while correctly updating both parent trees — is routinely a week of work. Keyboard-accessible drag-and-drop is another week. Touch support on tablets is another. Nested containers (columns inside sections inside grid wrappers) each introduce new edge cases. Budget 8 weeks minimum, not 4.

The canvas is the heart of the product. Everything the user sees and interacts with lives here.

### 3.1 — The Recursive Renderer
A React component that walks the page tree and renders each Node as its corresponding widget component. Performance is everything here:
- Each Node component is memoized — it only re-renders when its own data changes, not when a sibling changes.
- The renderer must handle deeply nested trees without noticeable lag.
- Isolated rendering scope: changes to one section of the page must not trigger re-renders in unrelated sections.

### 3.2 — The Drag-and-Drop Engine (dnd-kit)
This is the most complex UI system in the builder. It must support:
- Dragging new widgets from the panel onto the canvas.
- Reordering existing elements within a container.
- Moving elements across containers (cross-parent drag).
- A visual drop indicator that shows exactly where the element will land.
- Nested containers: columns inside sections inside layout wrappers — all draggable at every level.
- Keyboard-accessible drag-and-drop as a baseline accessibility requirement.

### 3.3 — The Inline Editing System (Tiptap)
Users should be able to double-click any text element and edit it directly on the canvas — not in a sidebar panel. This means:
- **Use Tiptap v3** as the inline rich text editor — not a custom implementation. A custom rich text editor is a notorious time sink; teams routinely underestimate it by 3–5× because getting selection state, keyboard shortcuts, copy-paste behavior, and IME input correct across browsers is genuinely hard. Tiptap is headless (zero default styling), built on ProseMirror (battle-tested at Notion, GitLab, and Atlassian scale), has first-class React support, and is extensible via its own extension API. The builder's inline editor is a Tiptap instance with a constrained extension set — headings, bold, italic, link, alignment, and lists. Nothing more in the free tier.
- A floating formatting toolbar activates above selected text — not a fixed sidebar panel. The toolbar is a Radix UI Popover anchored to the selection range.
- The inline editor writes directly to the CanvasStore, triggering optimistic saves in the background.
- Tiptap's extension API doubles as the mechanism for premium inline editing features in future addons (advanced typography, AI writing assistance inline, custom block types).

### 3.4 — The Selection & Context System
When a user clicks an element:
- A visible selection outline appears with resize handles.
- A context toolbar appears with quick-access actions: duplicate, delete, move up/down, lock, and hide.
- A right-click context menu reinforces discoverability.
- Multi-select (shift-click or drag-select) enables bulk operations like alignment, distribution, and batch deletion.

### 3.5 — The Responsive Preview Engine
The canvas must demonstrate exactly how the page looks at different screen sizes:
- A breakpoint switcher (desktop, tablet, mobile) toggles the canvas viewport.
- Style overrides set at the tablet or mobile breakpoint are scoped and do not bleed up to desktop.
- The preview is live — changes made in any breakpoint view are reflected instantly.

### End-to-End Test Gate
Browser tests must confirm: widgets can be dragged onto the canvas, reordered, nested, and deleted; inline text editing saves correctly; undo/redo works across drag operations; and responsive breakpoint styles render correctly per viewport.

---

## PHASE 4 — The Widget Library (Weeks 11–14)

The widget library is what users actually evaluate the builder on. Quantity matters less than quality and reliability.

### 4.1 — Core Free Widget Set (Launch Minimum)
Every widget below must be fully functional, accessible, and responsive out of the box:

**Layout Primitives:** Section, Container, Column, Grid, Flexbox Wrapper, Spacer, Divider.

**Content Widgets:** Heading, Paragraph, Rich Text, Image, Video (embed + self-hosted), Button, Icon, Icon Box, Image Box.

**Navigation & Structure:** Navigation Menu, Breadcrumb, Anchor.

**Media:** Image Carousel, Image Gallery, Video Player with custom controls.

**Interactive:** Accordion, Tabs, Toggle, Tooltip, Modal/Popup (trigger-based).

**WordPress-Specific (via Adapter):** Post Title, Post Content, Post Featured Image, Post Meta, Author Box, Comments — these are rendered through the adapter and are WP-aware, but the widget interface is not.

### 4.2 — The Widget Registration API
Every widget — core or addon — is registered through a single API. The registration manifest defines:
- The widget's unique type key.
- The props schema (what configuration options it accepts, with their types and defaults).
- The style schema (which CSS properties are configurable, and at which breakpoints).
- The renderer component.
- The panel component (the controls shown in the settings sidebar).
- The `isPremium` flag.

This API is the gateway to the plugin ecosystem. It must be documented and stable before launch.

### 4.3 — The Global Styles System
Users should be able to define site-wide defaults — primary color, heading font, body font, button style — that automatically apply to all widgets. Individual widget instances can override global styles. This cascade model mirrors CSS specificity and should feel familiar to developers and intuitive to designers.

### End-to-End Test Gate
Every widget must pass a browser test confirming: it renders on canvas, its props are editable in the panel, style changes apply responsively, and the output JSON round-trips correctly through save/load.

---

## PHASE 5 — The Style Engine & CSS Compiler (Weeks 15–17)

The style engine translates the JSON style map into optimized CSS. This is where performance claims live or die.

### 5.1 — The Style Panel Architecture
A unified style panel that adapts to the selected widget:
- Organized into logical groups: Layout (display, flex/grid, sizing, spacing), Typography (for text-bearing widgets), Visual (background, border, shadow, opacity), and Transforms & Transitions.
- Every control has a breakpoint indicator showing whether the value is inherited or overridden at the current viewport.
- CSS value inputs accept raw values, Tailwind utility shorthands, and visual pickers — all three produce the same underlying data.

### 5.2 — The Tailwind Compiler Strategy
The builder does not ship Tailwind to the end-user's page. Instead:
- As the user styles elements, the builder accumulates a set of used utility classes.
- At publish time, a compiler walks the final page tree and generates a scoped, minimal CSS file containing only the styles actually used on that page.
- This output is typically 2–8 KB per page — compared to Elementor's 200–500 KB of inline styles.

### 5.3 — CSS Custom Properties (Design Tokens)
Global styles and brand tokens are stored as CSS custom properties and injected at the `:root` level. All widget styles reference these tokens where possible. This means changing the brand color in one place truly updates the entire site — not just the places the user remembered to update manually.

### 5.4 — Animation & Transition System
A non-code animation interface allowing users to assign entrance animations, hover transitions, and scroll-triggered effects to any element. This is implemented as CSS animations and Intersection Observer logic — not JavaScript-heavy GSAP at the free tier. GSAP-powered advanced animations are scoped to a premium Nexus Motion addon.

### End-to-End Test Gate
Browser tests must confirm that style changes at each breakpoint produce correct CSS output, that the compiler generates minimal scoped CSS at publish time, and that design token changes cascade across all widgets using those tokens.

---

## PHASE 6 — Save, Publish & Preview Pipeline (Weeks 18–19)

This phase wires the full user workflow: draft → preview → publish.

### 6.1 — The Auto-Save System
- Changes are auto-saved to a draft revision every 30 seconds and on every significant mutation.
- Auto-save is non-blocking — it happens in the background without any visible loading state.
- A subtle "Saved" / "Saving…" indicator in the header communicates status without interrupting the user.
- The revision history UI allows users to restore any prior auto-saved version.

### 6.2 — The Preview System
- A "Preview" action renders the current draft state in a new tab without publishing it.
- The preview uses the same renderer as the canvas — there is no separate PHP template path.
- The preview URL is shareable for stakeholder review without requiring the recipient to have builder access.

### 6.3 — The Publish Pipeline (Static HTML Compilation)
On publish, the output strategy is **static HTML compilation** — not a PHP template that re-renders the JSON on every page request. This is the single highest-impact architectural decision for the product's performance story and the one most likely to be cited in every head-to-head comparison.

How it works:
1. The final page tree JSON is validated against the schema.
2. The CSS compiler runs and generates the page's minimal scoped stylesheet (typically 2–8 KB).
3. The Node tree is walked by a server-side compiler that outputs a complete, self-contained HTML file. No React, no JSON parsing, no PHP database query at page-load time — the output is pure HTML and CSS, identical to what a hand-coded page would produce.
4. The compiled HTML file and its scoped CSS file are both saved to the database and simultaneously written to a WordPress-managed static file cache.
5. The WordPress front-end serves the static HTML file directly. PHP only runs to check cache validity — the actual page content is served from the static cache.
6. On subsequent page edits, only the changed page's cache is invalidated and recompiled. All other pages are unaffected.

This strategy yields sub-100ms Time to First Byte on any competent hosting — including shared hosting. It is the architectural reason Nexus Architect can honestly claim "Lighthouse 95+ by default" as a marketing differentiator, because the front-end has zero runtime overhead. Elementor's front-end executes hundreds of PHP functions and loads 200–500 KB of CSS on every page load. Nexus Architect's front-end is a file read.

The WordPress-specific implementation of this compilation step lives in the WP Adapter — the core engine's compiler is platform-agnostic and will work identically for the Supabase/SaaS adapter in Phase 13.

### 6.4 — The Template Library
A library of pre-built page and section templates stored as JSON. Users can insert a template onto the canvas, and it populates as fully editable, live widgets — no locked shortcodes, no mystery markup. Templates are organized by industry, purpose, and style category.

### End-to-End Test Gate
Browser tests must confirm the full draft → auto-save → preview → publish → front-end render pipeline works end-to-end; the correct CSS is scoped to the published page; the front-end page loads as static HTML with zero PHP template execution; the static cache is correctly invalidated and recompiled on edit; and a Lighthouse audit of the published output scores LCP under 2.5s and CLS under 0.1 on a standard shared hosting environment.

---

## PHASE 7 — The AI Layer (Weeks 20–23)

AI features are built on top of a stable foundation — not rushed in to compensate for a weak product. This phase requires Phase 1–6 to be complete and stable.

### 7.1 — Natural Language Layout Generation
Users type a plain-English description ("a hero section with a video background, centered headline, and two CTA buttons side by side") and the AI returns a valid Node tree JSON that the canvas renders instantly. This requires:
- A well-documented prompt schema so the AI reliably returns valid JSON.
- A validation layer that catches malformed AI output before it reaches the canvas.
- A user-facing "refine" UI so users can iterate on the generated layout conversationally.
- **Cost Model:** AI generation calls cost money per request. Before shipping, model the economics: at 1,000 free-tier users making an average of 5 AI generation requests per month, the monthly LLM API cost must be calculated and either absorbed into the free tier (as a capped monthly allowance, e.g. 10 free AI generations/month), metered (pay-per-generation above the free cap), or bundled into the premium tier only. Do not launch an unlimited free AI tier without first modeling the cost — this is a common startup mistake that creates unsustainable infrastructure bills at scale.
- **Offline / API Failure Fallback:** The builder must function fully when the AI API is unavailable. AI generation degrades gracefully to a template picker — never to a broken UI state. Error states must be explicit: "AI generation is temporarily unavailable — choose from templates below."

### 7.2 — AI Content Population
When a template or generated layout contains placeholder text and images, the AI can populate it with:
- Contextually appropriate placeholder copy based on the page type and industry.
- Image suggestions from a licensed stock library or the user's media library.
- SEO-optimized heading hierarchies based on the page's declared purpose.

### 7.3 — Predictive Global Style Suggestions
When a user changes a brand color or font on one page, the AI analyzes the site's design patterns and offers a one-click suggestion to harmonize the change across all pages. The user sees a before/after diff before accepting — they are never surprised by an AI-initiated global change.

### 7.4 — Auto-Performance Advisor
This is the most commercially differentiable AI feature in the entire roadmap. No major page builder has shipped a first-class, built-in performance audit that is actionable *inside the builder*. This feature is what justifies the headline claim "Nexus Architect pages score 95+ on Lighthouse by default" — because the advisor makes that outcome achievable by non-technical users.

After a publish action, the AI scans the output and surfaces actionable advice:
- Images that should be converted to AVIF or WebP — with a one-click conversion trigger.
- Widgets that are adding render-blocking overhead — with a one-click defer/async fix.
- Layout patterns that are causing cumulative layout shift (CLS) — with an explanation of why and a suggested structural fix.
- Missing semantic HTML (no H1, improper heading hierarchy) — with inline correction prompts.
- Each advisory is scored by impact (High / Medium / Low) so users address the most important issues first.
- The before/after Lighthouse score delta is shown when advisories are resolved, making the improvement tangible and shareable.

This feature is a marketing asset, not just a UX feature. "Your Nexus Architect page went from 67 to 96 in one click" is a screenshot that spreads organically.

### 7.5 — Real-Time Collaboration Infrastructure (Foundation)
This section does not ship visible features at Phase 7 — it lays the groundwork decided in Phase 0. With the CRDT-ready `_ops` field in the schema and the CollaborationStore stub in the state architecture, this phase wires the underlying transport layer:
- A WebSocket connection manager in the adapter layer (WP adapter uses a lightweight WebSocket server or a managed service like Ably or Pusher; the SaaS adapter will use Supabase Realtime).
- Presence awareness: when two users have the same page open, each sees the other's cursor position and selected element — even before collaborative editing is enabled.
- The "last editor" indicator in the header: "Jane is editing this page" replaces the auto-save indicator when another user is active. This single feature, which costs almost nothing to build once the WebSocket layer exists, prevents dozens of accidental overwrites and positions the product clearly above all current WordPress page builders.
- Full simultaneous co-editing (Figma-style) is a Phase 13 feature — but the transport layer, schema slots, and state architecture built here mean Phase 13 is an activation, not a rewrite.

### End-to-End Test Gate
Browser tests must confirm: AI layout generation produces valid, renderable JSON; malformed AI output is caught by the validator and never reaches the canvas; API failure degrades gracefully to the template picker; AI-generated content populates widgets correctly; global style suggestions are previewed and applied (or rejected) correctly; performance advisor one-click fixes produce measurable Lighthouse score improvements; and presence awareness shows a second user's cursor when two sessions have the same page open.

---

## PHASE 8 — The Premium & Addon Architecture (Weeks 24–30)

The freemium infrastructure must be built before launch — not retrofitted after. The pricing tiers designed in Phase 0.5 are implemented here. This is the second most underestimated phase after Phase 3 — budget 6 weeks, not 3.

### 8.1 — The Feature Flag System
A centralized `FeatureFlags` service that:
- Reads the user's license tier from the UserStore.
- Exposes boolean flags aligned to the three-tier model from Phase 0.5: `canWhiteLabel`, `canUseDynamicData`, `canUseCloudSync`, `hasTeamSeats`, `canAccessPremiumAddons`, etc.
- Any UI component or widget registration checks its relevant flag before rendering premium controls.
- When a premium feature is encountered by a free user, a consistent, non-intrusive upgrade prompt is shown — it names the specific tier that unlocks the feature, shows the annual price, and links to the checkout flow. Never a hard block that destroys their work.
- The upgrade prompt for white-labeling must be the most polished, conversion-optimized UI surface in the entire product. It is the most financially important screen in the builder.

### 8.2 — White-Label System (Professional & Agency Tiers)
White-labeling is the headline premium feature. Its implementation covers:
- Complete removal of all "Nexus Architect" branding from the builder admin interface — replaced by the agency's own logo, color scheme, and product name, configured through an admin panel.
- Suppression of "Built with Nexus Architect" from any front-end output, meta tags, and generator headers.
- A branded admin URL slug — so the builder opens at `/wp-admin/admin.php?page=my-agency-builder` rather than revealing the underlying tool.
- Custom email notifications for client-facing actions (save confirmations, publish alerts) sent from the agency's domain.
- A client access mode: agencies can grant their clients a restricted builder view that hides advanced settings, locks certain elements, and prevents template deletion — without exposing the full builder to a non-technical client.

### 8.3 — Dynamic Data Binding (Professional & Agency Tiers)
Dynamic data is the technical differentiator that separates a page builder from a business tool. It is the feature that wins agencies away from Bricks Builder and Oxygen, and it belongs in Phase 8 as a core premium capability.

Dynamic data allows any widget prop to be bound to a live data source rather than static content:
- **ACF Pro fields:** Bind a Heading widget's text to an ACF text field on the current post type. Bind an Image widget's source to an ACF image field. This turns the builder into a custom post type display engine without writing PHP templates.
- **WooCommerce product data:** Bind widgets to product price, name, gallery, SKU, and stock status — enabling fully custom product page layouts without a theme.
- **WordPress core fields:** Post title, excerpt, featured image, author name, publication date, category, and tag are all bindable sources.
- **Custom REST API endpoints:** An advanced binding option allows users to point a widget at any REST API endpoint and map response fields to widget props — the foundation for headless data consumption.

The dynamic data binding UI is a "source picker" panel that appears when a widget prop is clicked while in "dynamic mode." It shows available data sources for the current page context and allows field mapping with a live preview.

### 8.4 — The Addon Micro-Package System
Addons are registered through the same Widget Registration API from Phase 4, but delivered as separate installable packages. The core plugin loads addons dynamically — it does not bundle them. This means:
- The core plugin stays lightweight regardless of how many addons exist.
- Premium addons are gated at the license verification layer, not by absent code.
- Third-party developers can build and sell addons through the same API — future marketplace potential.
- **Storybook stories are required for every addon widget** — this is enforced by the addon submission review process in Phase 13, ensuring visual regression testing coverage extends to the entire ecosystem.

### 8.5 — The License & Activation System
- License keys are validated against a remote licensing server (not hardcoded logic). Use an established licensing platform — **Lemon Squeezy** or **Paddle** — rather than building custom licensing infrastructure. Both handle payment processing, tax compliance (VAT/GST across 100+ jurisdictions), and license key management. The cost (3–5% transaction fee) is far less than the engineering and legal cost of building compliant payment infrastructure from scratch.
- The licensing server is the single source of truth for tier, seat count, and expiry.
- Offline grace periods are supported so licensed users are not broken by temporary network issues.
- The same licensing system handles the AppSumo LTD codes from the launch strategy in Phase 0.5 — design for code-based license activation from the start.

### 8.6 — Cloud Sync Infrastructure (Agency Tier)
The architectural groundwork for the cross-site component management feature — now positioned correctly as an Agency tier feature, not the generic "premium" hook:
- A `CloudAdapter` that implements the same `DataAdapter` interface as the `WPAdapter`.
- Global components (headers, footers, design tokens, section templates) stored in a cloud-hosted JSON repository, not in any single WordPress installation.
- A sync daemon that watches for remote updates and applies them to connected installations — with a conflict resolution UI for when two sites modified the same component simultaneously.
- A portfolio dashboard: a cloud-hosted view showing all connected client sites, their sync status, last-published date, and any pending component updates awaiting rollout. This dashboard is the Agency tier's visible value differentiator — it makes managing 20 client sites feel like managing one.

### End-to-End Test Gate
Browser tests must confirm: free-tier users encounter tier-specific upgrade prompts (not generic errors) on premium features; white-label configuration removes all Nexus Architect branding from the admin interface and front-end output; dynamic data binds ACF field values to widget props and updates live on canvas; addon registration and loading works dynamically; license validation correctly gates features per tier; LTD code activation works correctly; and cloud sync round-trips a component change from one installation to another with conflict detection firing on simultaneous edits.

---

## PHASE 9 — Performance, Security & Hardening (Weeks 27–28)

This phase is non-negotiable before any public release. It is not an afterthought — it is a gate.

### 9.1 — Frontend Performance Audit
- Lighthouse scores for Time to Interactive, Largest Contentful Paint, and Cumulative Layout Shift must hit target thresholds (LCP under 2.5s, CLS under 0.1) for a published page with average content.
- The builder interface itself must feel instant: canvas interactions under 16ms, panel updates under 50ms.
- Bundle size analysis: identify and eliminate unnecessary dependencies. The React app bundle must be code-split so users only load what the current view needs.

### 9.2 — Security Hardening
- All REST API endpoints reviewed for: proper authentication checks, input sanitization, output escaping, and rate limiting.
- The JSON schema validator must reject any malformed or malicious input before it reaches the database or renderer — this is a primary XSS attack surface.
- CSRF protection on all state-mutating endpoints.
- A penetration test or structured security review against OWASP Top 10 before public release.

### 9.3 — Cross-Browser & Cross-Device QA
- The builder UI must function on: Chrome, Firefox, Safari, and Edge — current and one prior major version.
- The builder UI must be usable on: 13" laptop, iPad (landscape and portrait), and a modern Android tablet.
- The *published output* must render correctly on all of the above, plus mobile phones.
- Automated Playwright browser tests covering the critical path on each supported browser.

### 9.4 — Conflict & Compatibility Testing
- The plugin must coexist without conflict with: WooCommerce, Yoast SEO, Advanced Custom Fields, and the top 10 most-used WordPress themes.
- Theme compatibility: the builder's output must not be broken by a theme's global CSS overriding widget styles.

---

## PHASE 10 — Developer Experience & Documentation (Weeks 29–30)

A page builder that no one can extend or understand is not a platform — it's a closed box.

### 10.1 — The Public API Documentation
The Widget Registration API, the Adapter interface, and the Feature Flag system must be fully documented with:
- Conceptual guides explaining *why* the architecture works the way it does.
- Reference documentation for every interface, type, and hook.
- Step-by-step tutorials for the three most common developer tasks: registering a custom widget, building an addon package, and implementing a custom adapter.

### 10.2 — The Developer Sandbox
A local development environment that addon developers can spin up in under five minutes — with hot reloading, a pre-populated demo page, and a mock adapter that does not require a live WordPress installation.

### 10.3 — The Changelog & Migration System
A formal process for versioning the JSON schema and communicating breaking changes:
- Every schema version is numbered.
- Migrators are shipped for each schema version bump that transform old page data to the new schema.
- Developers are notified of API changes with adequate deprecation notice.

### 10.4 — Observability Stack
A product that has no observability is flying blind. By the end of Phase 10, before any beta user touches the product, the following must be instrumented:

**Error Tracking (Sentry):** Every unhandled exception in the React builder and every PHP fatal error in the plugin is captured with full stack trace, user context (anonymized), and browser/environment details. The on-call developer receives an alert within minutes of a new error class appearing. Sentry's session replay feature — which records the user's actions leading up to an error — is invaluable for reproducing rare bugs that users cannot describe precisely.

**Product Analytics (PostHog):** PostHog is the self-hostable, privacy-compliant alternative to Mixpanel or Amplitude. Track: widget drag events (which widgets are used most), publish events (conversion from builder open to first publish), panel interactions (which style controls are used, which are ignored), AI generation requests (success rate, fallback rate), and upgrade prompt impressions and clicks. PostHog's funnel analysis and session recordings provide the data needed to make informed product decisions — not gut-feel roadmap prioritization.

**Uptime & API Monitoring:** The licensing server and cloud sync endpoints are monitored with a service like BetterUptime or Checkly. A licensing server outage that prevents users from activating licenses is a business-critical incident, not a minor bug.

---

## PHASE 10.5 — GTM Execution (Parallel Track, Months 5–12)

This phase runs in parallel with Phases 7 through 11. It is not a sequential gate — it is a continuous workstream. The GTM foundation designed in Phase 0.6 is executed here.

### GTM-1 — Content & SEO Engine (Starts Month 5)
With the canvas functional from Phase 3 and the widget library taking shape in Phase 4, demo-quality content can be created. Starting at month 5:
- **Comparison pages** go live for "Nexus Architect vs. Elementor," "Nexus Architect vs. Bricks Builder," and "Nexus Architect vs. Divi." These pages must include real benchmark data — Lighthouse scores, bundle sizes, time-to-publish comparisons — not marketing copy. Honest benchmarks build trust with the developer and agency audience that drives organic sharing.
- **WordPress.org listing copy** is finalized, keyword-optimized, and submitted with the first beta-ready build. The 60-day indexing lag on WordPress.org means this needs to be live during beta, not at launch.
- **Tutorial content** (written, with screenshots from the actual builder) begins publishing. Target: 2 pieces per month during beta. Topics prioritized by search volume: "how to build a landing page in WordPress without coding," "fastest WordPress page builder," "Elementor alternative free."

### GTM-2 — Creator & Community Seeding (Starts Month 6)
- **YouTube creator outreach** begins at month 6, when the builder is stable enough to record a compelling demo without hitting critical bugs. Identify 10–15 WordPress YouTube channels with 10K+ subscribers. Offer: free Agency tier license, early feature access, and 35% affiliate commission. Goal: 3–5 committed reviewers ready to publish on or before launch day.
- **WordPress Facebook Groups and Reddit communities** (r/Wordpress, r/webdev, r/PageBuilders) are engaged with genuine value — share development updates, ask for feedback, post benchmark results. Do not spam or post promotional links. Community trust is earned slowly and lost instantly.
- **A waitlist landing page** goes live at month 6, collecting email addresses with a "Get early access + founding member pricing" offer. A 500-person waitlist before launch is a launch-day activation lever. A 5,000-person waitlist is a launch event.

### GTM-3 — Affiliate Infrastructure (Starts Month 8)
- The affiliate program is configured in Lemon Squeezy or Paddle before the public beta opens.
- 30% recurring commission for the first 12 months of a referred subscription.
- Affiliate dashboard with real-time click, conversion, and payout tracking.
- An affiliate resource pack: approved logo files, product screenshots, benchmark data, and approved comparison copy — so affiliates produce accurate, compliant content without requiring one-on-one support.
- All YouTube creators and blog reviewers from GTM-2 are onboarded as affiliates before their content goes live.

### GTM-4 — AppSumo / LTD Launch Preparation (Month 10)
- AppSumo submission and negotiation happens 6–8 weeks before the desired listing date. Prepare: a demo video (2–3 minutes), a feature comparison table, support documentation, and a dedicated AppSumo onboarding flow.
- The LTD offer is structured as: one plan (Professional tier, unlimited sites, lifetime), priced at $497–$597. A second "Agency" LTD tier at $897 captures the high-value segment.
- A dedicated AppSumo support queue is staffed before the listing goes live — AppSumo buyers are high-volume, high-feedback, and will write public reviews within 48 hours of their first experience.

---

## PHASE 11 — Beta Program & Staged Rollout (Months 11–13)

Launching to the public before real humans have stress-tested the product is a category error.

### 11.1 — Closed Alpha (Month 11)
Invite 20–50 hand-selected users: WordPress developers, freelance designers, and agency owners. Prioritize users who are currently paying for Elementor Pro or Bricks Builder — their migration experience is the most commercially relevant data. Goals:
- Surface critical bugs and workflow friction the development team has gone blind to.
- Validate that the performance claims hold on real hosting environments (shared hosts, managed WP hosts, VPS, WP Engine, Kinsta, SiteGround).
- Identify the top 5 things users try to do that the builder does not support yet.
- Validate that the white-label system works end-to-end for at least 3 agency users before it is positioned as a headline feature.
- PostHog session recordings from this cohort are reviewed weekly — watch where users pause, backtrack, or abandon a task. These are the UX friction points that surveys miss.

### 11.2 — Public Beta (Month 12)
Open the waitlist collected during GTM-2 and admit users in weekly cohorts of 200–500. The public beta:
- Includes full telemetry (with user consent) to identify which features are used, which are ignored, and where users get stuck.
- Has a structured feedback channel — not just a support forum, but a structured form that categorizes feedback by type (bug, UX friction, missing feature, performance).
- Is actively monitored: every reported issue is triaged within 48 hours. The beta is where the support culture is established — the community will remember how issues were handled in the first 90 days for years.
- Creator content from GTM-2 goes live during this month — public beta + creator coverage is a deliberate overlap that creates organic social proof exactly when new users are evaluating the product.

### 11.3 — Beta-to-Launch Hardening (Month 13, Weeks 1–2)
- A formal "ship criteria" checklist reviewed before the v1.0 tag is cut. Ship criteria include: zero P0 issues open (data loss, security, activation failure), all P1 issues (core workflow broken, white-label incomplete, publish pipeline failing) resolved, Lighthouse benchmarks verified on 5 different hosting environments, and the full end-to-end test suite passing clean on Chrome, Firefox, Safari, and Edge.
- Performance benchmarks re-run on fresh installs — not just the development environment.
- AppSumo listing goes live 2 weeks before the public v1.0 launch, so LTD buyers seed the initial review count before the WordPress.org listing is promoted.

---

## PHASE 12 — Production Launch (Month 13–14)

### 12.1 — Launch Infrastructure
- A dedicated landing page with a clear value proposition structured around the three audiences: freelancers ("Build faster"), agencies ("White-label it as yours"), and developers ("Extend it your way"). Each audience's headline speaks to their JTBD from the Phase 0.4 audit — not a generic "the best page builder."
- Performance benchmarks prominently featured: real Lighthouse scores on real hosting, compared side-by-side with Elementor. These must be independently reproducible — include the test methodology so skeptics can verify.
- A public product changelog updated with every release.
- A support system (knowledge base + ticketing) staffed and documented before the first user signs up. The knowledge base must cover the 20 most common questions identified during beta.
- WordPress.org plugin listing live with keyword-optimized copy, 5+ screenshots showing the UI and published output, and a video demo.

### 12.2 — Launch Sequencing
- **Week -2 (two weeks before):** AppSumo listing live. LTD buyers onboard and begin submitting reviews. This seeds social proof before the public announcement.
- **Day 0:** WordPress.org listing published. Licensing server activated. Affiliate dashboard live. Email the entire waitlist.
- **Day 1:** Creator videos go live (coordinated across all GTM-2 partners simultaneously for a surge effect). Post a technical deep-dive on the architecture to Hacker News, Dev.to, and the WordPress subreddit. The architecture article is not marketing copy — it is a genuine engineering write-up that earns respect from the developer audience that will build addons and write comparison reviews.
- **Day 3:** Respond personally to every WordPress.org review and every AppSumo review posted in the first week. Review responses are public — they demonstrate the support culture to every prospective buyer who reads them.
- **Week 2:** Analyze the first 500 PostHog sessions. Identify the single highest-friction moment in the new-user onboarding flow and ship a fix before the end of week 2. Demonstrating this turnaround speed publicly (in a changelog post) signals that the product is actively maintained.

### 12.3 — Metrics to Track from Day One
The following are instrumented via PostHog before launch. These are not vanity metrics — each one maps to a specific product decision:
- **Activation rate:** % of installs where a user successfully publishes a page. Target: >40% within 7 days of install. Below 30% signals an onboarding problem.
- **Time-to-first-publish:** How long it takes a new user to publish their first page. Target: under 15 minutes for a user with no prior Nexus Architect experience.
- **Widget usage distribution:** Which widgets are used on >50% of published pages (core, must-never-break) vs. <5% (candidates for deprecation or premium migration).
- **AI generation adoption rate:** % of active users who use NL layout generation at least once. Below 20% signals discoverability or trust issues.
- **Upgrade prompt conversion rate:** % of free users who click an upgrade prompt and complete purchase. Below 2% signals the wrong feature is gated or the prompt UX is poor.
- **Retention at 7 / 30 / 90 days.**
- **Free-to-premium conversion rate.** Target: 3–5% of active free users within 90 days.
- **Core Web Vitals for published pages** (aggregated, anonymized). This is the data behind the Lighthouse claim.

---

## PHASE 13 — Post-Launch Growth & Iteration (Months 9–12+)

Launch is not the destination — it is the starting line for a product that compounds over time.

### 13.1 — The Feedback Loop
- Weekly review of telemetry, support tickets, and community feedback.
- A public roadmap where users can vote on features — this builds community investment and reduces roadmap guesswork.
- Every two-week release cycle: at least one user-requested improvement in every release, no matter how small. Consistency of improvement is a trust signal.

### 13.2 — The Addon Marketplace (Month 18+)
Open the Widget Registration API to third-party developers:
- A submission and review process for marketplace addons — all submissions must include Storybook stories and pass the Chromatic visual regression baseline before approval.
- Revenue sharing for addon developers (70/30 split in the developer's favor) — this is the mechanism that turns Nexus Architect from a plugin into a platform. A developer ecosystem compounds the product's value without requiring the core team to build every niche use case.
- Curated "Featured" and "Verified Compatible" designations to maintain quality standards.
- A marketplace developer program: documentation, sandbox environment, and a developer Discord channel. The addon ecosystem is only as strong as the developer experience that feeds it.

### 13.3 — Teams & Real-Time Collaboration (Month 16–19)

> **Expanded scope:** This section has been fully re-specified. See [`docs/Nexus-Teams-Collaboration-Architecture.md`](docs/Nexus-Teams-Collaboration-Architecture.md) for the complete feature specification, security architecture, business model, and implementation roadmap.

**Summary of scope change from original plan:** What was originally scoped as a single "activate CRDT" milestone is now a four-sub-phase, dedicated product pillar with its own pricing tier, security model, and competitive positioning. This is intentional — the collaboration system is the primary growth lever for post-launch ARR expansion and the feature that makes Nexus Architect defensible against Webflow and Framer in the agency market.

**New Teams tier pricing:** $79/month (up to 25 seats) — separate from and above the Agency tier ($349/year, 3 seats). The Teams tier compounds revenue with team growth: every new hire at a customer's agency is a new seat.

**Delivery sub-phases (Months 16–19):**
- **13.3a (Month 16):** Multiplayer presence + Yjs transport activation — CRDT engine live
- **13.3b (Month 17):** Concurrent editing, AI conflict resolution, element locking, design branches
- **13.3c (Month 18):** RBAC role system, approval workflow, guest review links, mobile review mode
- **13.3d (Month 19):** Shared component library, workspace analytics, async toolkit, SSO/SAML, audit log

**Three industry-first features shipping in 13.3:**
1. **AI-assisted semantic conflict resolution** — when two users make conflicting changes, AI proposes a merged result based on page context
2. **"Catch me up" AI summary** — when returning to a page after time away, plain-English summary of all changes since your last visit
3. **Immutable hash-chained audit log** — every operation signed and chain-linked, tamper-evident, suitable for SOC 2 and regulated-industry clients

**Security architecture highlights (mandatory gates before any 13.3 sub-phase ships):**
- Server-side authorization of every CRDT operation — client RBAC is UX only, not a security boundary
- Signed guest review link JWTs with expiry and revocation
- End-to-end encrypted component library (AES-256-GCM, workspace-keyed)
- SCIM 2.0 automated provisioning/deprovisioning via enterprise IdPs
- Hash-chained audit log enabling SOC 2 Type II compliance path (Month 24)

This single phase positions Nexus Architect alongside Figma in the "modern collaborative design tool" category while going beyond Figma in the areas that matter to web publishers: publishing to the live web, WordPress integration, and design-to-approval-to-publish as a single unbroken workflow.

### 13.4 — The SaaS Transition
The decoupled architecture from Phase 0 pays off here:
- A `SupabaseAdapter` implementing the same `DataAdapter` interface as the `WPAdapter` is developed as a parallel preview product. The React core engine requires zero changes — only the adapter is swapped.
- Early access users are invited to try the standalone SaaS version at a dedicated subdomain. They bring their existing Nexus Architect page designs — because the JSON schema is platform-agnostic, their work migrates without conversion.
- The SaaS pricing model is separate from the WordPress plugin pricing and is validated with this cohort. Likely model: seat-based monthly pricing ($29/month/user) with a generous free tier, targeting design agencies that want to escape WordPress entirely.
- The SaaS version's competitive frame shifts from "vs. Elementor" to "vs. Webflow and Framer" — a larger total addressable market.

### 13.5 — Community Building
The long game for beating Elementor is not just code quality — it is community density:
- A structured affiliate program (already live from GTM-3) graduates into a full ambassador program for top-performing affiliates — custom landing pages, co-branded content, and quarterly strategy calls.
- Tutorial content (video and written) produced on a regular cadence — minimum 4 pieces per month post-launch. Establish the Nexus Architect YouTube channel as a genuine resource, not a promotional channel.
- Open-sourcing non-core components (example widgets, adapter templates, Storybook stories) to earn developer goodwill and inbound contributions.
- An annual "Nexus Architect Showcase" — a curated gallery of the best sites built with the builder, submitted by the community. Showcase entries are featured on the landing page and social channels. This generates both social proof and user-contributed marketing content.

---

## Summary: Phase Gate Table

> Timelines are calibrated for a solo developer with AI assistance. A 2–3 person team compresses this by approximately 40%. Never compress Phase 3 or Phase 8 — they are the two phases where underestimating scope consistently causes project-wide delays.

| Phase | Name | Realistic Duration | Parallel Track | Key Gate |
|---|---|---|---|---|
| 0 | Foundation & Governance | Months 1 (Wks 1–3) | GTM Foundation design | ADRs + pricing + CRDT decision locked |
| 1 | Core Plugin Shell | Month 1–2 (Wks 4–6) | — | Data round-trips through adapter |
| 2 | Data Schema & State | Month 2 (Wks 7–9) | — | CRDT-ready schema + undo/redo working |
| 3 | Visual Canvas | Months 3–5 (Wks 10–18) | — | DnD (incl. cross-parent), Tiptap inline edit, responsive preview |
| 4 | Widget Library | Months 5–6 (Wks 19–24) | GTM-1 content starts | All core widgets pass Storybook + round-trip test |
| 5 | Style Engine | Month 7 (Wks 25–28) | GTM-2 creator outreach | Minimal CSS compiler + Chromatic baseline |
| 6 | Save / Publish Pipeline | Month 7–8 (Wks 29–32) | — | Static HTML compilation + Lighthouse gate |
| 7 | AI Layer | Month 8–9 (Wks 33–38) | GTM-3 affiliate setup | NL gen, cost model, fallback, presence layer |
| 8 | Premium & Addons | Months 9–10 (Wks 39–45) | — | White-label, dynamic data, tiered feature flags |
| 9 | Hardening | Month 10–11 (Wks 46–49) | GTM-4 AppSumo prep | OWASP pass + cross-browser + Sentry live |
| 10 | Developer Docs + Observability | Month 11 (Wks 50–52) | — | Public API docs + PostHog + Chromatic CI |
| 10.5 | GTM Execution | Months 5–12 (parallel) | — | Waitlist ≥500, 3+ committed creators, affiliate live |
| 11 | Beta Program | Months 11–13 | Creator videos live | Ship criteria met, AppSumo seeded |
| 12 | Production Launch | Month 13–14 | — | WordPress.org live, all GTM channels active |
| 13.1–13.2 | Post-Launch Growth | Month 15–16 | — | Feedback loop live, Marketplace open |
| 13.3a | Presence + CRDT Activation | Month 16 | — | Multiplayer cursors, Yjs engine, <150ms propagation |
| 13.3b | Concurrent Editing + Branches | Month 17 | — | CRDT edits live, AI conflict resolution, design branches |
| 13.3c | Review + Approval + RBAC | Month 18 | — | Guest links, approval workflow, role system |
| 13.3d | Team Intelligence + Security | Month 19 | — | Component library, analytics, SSO/SAML, audit log |
| 13.4–13.5 | SaaS Transition + Community | Month 20+ | — | SaaS adapter in preview, ambassador program |

---

*This blueprint is a living document. Revise phase scope and timelines based on team size, beta feedback, and market signals — but never compromise the architectural principles in Phase 0. The CRDT decision, the Adapter Pattern, the static HTML compilation strategy, and the three-tier pricing model are the four decisions that cannot be undone cheaply. Everything else is adjustable.*
