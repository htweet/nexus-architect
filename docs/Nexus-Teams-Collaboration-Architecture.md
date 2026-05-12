# Nexus Architect — Teams & Collaboration Architecture
### A Next-Generation Multiplayer Design System That Makes Every Team Drop Figma, Notion, and Elementor in One Move

> **Status:** Planned — Phase 13.3 Expansion  
> **Classification:** Core Product Pillar (not a bolt-on addon)  
> **Business Impact:** Primary growth lever for Teams tier — projected 3× ARR uplift over solo/agency tiers  
> **Design Mandate:** Must be technologically superior to Figma's collaboration model in the context of web publishing, not merely equivalent to it.

---

## 1. The Problem With Every Existing Solution

### What the competition actually offers (as of 2026)

| Tool | Collaboration Model | What's Wrong |
|---|---|---|
| **Elementor** | None. Last-write-wins. Silent overwrites. | Two people editing = data loss. No awareness. |
| **Bricks Builder** | None. Same as Elementor. | Identical problem, worse community awareness. |
| **Webflow** | Page-level locking. One editor per page. | Serialized, not parallel. Kills agency velocity. |
| **Figma** | Gold standard for design files. | Figma doesn't publish to the web. The gap from Figma frame to live webpage is a $0-revenue chasm. |
| **Framer** | Real-time co-editing on a canvas. | Framer publishes to Framer hosting only. No WordPress, no CMS integration, no dynamic data. |
| **Notion** | Block-level CRDT. Excellent for docs. | Not a page builder. Zero CSS/layout control. Not publishable as a website. |

### The Gap Nexus Architect Will Own

**No tool on the market delivers real-time collaborative web page construction with conflict-free concurrent editing, role-based layout governance, and a client approval workflow that connects the designer's canvas directly to the live URL — without any intermediary export, handoff, or deployment step.**

This is the gap. Nexus Architect Teams closes it permanently.

---

## 2. Business Model Decision: Core Tier vs. Addon

### Recommendation: **Dedicated "Teams" Tier — Neither Pure Core Nor Pure Addon**

The existing blueprint's Agency tier ($349/year) includes "team seat licensing (up to 5 users)" as a line item, but this undersells and mispositions the collaboration system. Here is the corrected model:

### Revised Pricing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FREE             │  $0/yr      │  1 user, 1 site, core builder  │
├─────────────────────────────────────────────────────────────────┤
│  PERSONAL         │  $69/yr     │  1 user, unlimited sites,      │
│                   │             │  all core widgets, no WL       │
├─────────────────────────────────────────────────────────────────┤
│  PROFESSIONAL     │  $179/yr    │  1 user, unlimited sites,      │
│                   │             │  white-label, dynamic data,    │
│                   │             │  guest review links (readonly) │
├─────────────────────────────────────────────────────────────────┤
│  AGENCY           │  $349/yr    │  3 editors, unlimited sites,   │
│                   │             │  Pro features + real-time      │
│                   │             │  co-editing, approval flows,   │
│                   │             │  client portal, cloud sync     │
├─────────────────────────────────────────────────────────────────┤
│  TEAMS            │  $79/mo     │  Up to 25 seats, everything    │
│  (new tier)       │  ($790/yr)  │  in Agency + design branches,  │
│                   │             │  SSO/SAML, audit logs,         │
│                   │             │  workspace analytics, SLA,     │
│                   │             │  API access                    │
├─────────────────────────────────────────────────────────────────┤
│  ENTERPRISE       │  Custom     │  Unlimited seats, self-hosted  │
│                   │             │  sync server, custom SLA,      │
│                   │             │  dedicated onboarding,         │
│                   │             │  SOC 2 compliance pack         │
└─────────────────────────────────────────────────────────────────┘
```

### Why a Dedicated "Teams" Tier (not Agency addon)

**1. Distinct buyer persona.** Agency buyers optimize for client delivery efficiency. Teams buyers optimize for internal design system governance. These are different jobs-to-be-done requiring different marketing, onboarding, and support touchpoints.

**2. Seat-based pricing compounds.** A 25-person design team at $79/month is $948/year — 2.7× the Agency tier annual price on a single account. The seat model scales revenue with the value delivered without requiring a price increase.

**3. Feature separation is clean.** Real-time co-editing, design branches, SSO/SAML, and audit logs are enterprise-grade features that would feel out of place in a WordPress plugin's Agency tier. A separate Teams tier sets the right expectation.

**4. Upgrade path narrative.** Free → Personal → Professional → Agency → Teams is a clear, logical escalation tied to team growth. Every milestone upgrade tells a story: "You've outgrown solo editing. Here's what's next."

**5. SaaS transition alignment.** When Phase 13.4 launches the standalone SaaS product, the Teams tier becomes the natural SaaS entry point. The pricing and feature set are already proven and recognized by existing users.

---

## 3. Feature Architecture: The Full Collaboration System

### 3.1 — Real-Time Multiplayer Presence (Phase 13.3 Activation)

**What it does:** Every user editing a page or browsing the canvas is visible to all other active users in real time.

**Technical implementation:**
- Yjs document model over the existing `_ops` CRDT field (already present in the node schema from Phase 2)
- WebSocket transport via the adapter layer (WP adapter → Ably/Pusher; SaaS adapter → Supabase Realtime)
- `CollaborationStore` activated (stub was built in Phase 2)

**Feature specifics:**

```
Presence Ring System
├── Named cursor: each user's mouse position shown as a colored dot + name label
├── Element focus halo: when user A selects a node, user B sees a faint colored halo around it
├── Section minimap: a thumbnail strip showing which sections each user is currently viewing
├── Typing indicator: when a user is inline-editing a text widget, other users see a pulsing cursor
└── Idle detection: users inactive for 60s dim to 30% opacity (still visible, not distracting)
```

**Why this beats Figma:** Figma's presence is frame-scoped. Nexus Architect's presence is section-scoped on a live publishable webpage — not a design mockup. When you see a teammate's cursor on the hero section, that section is the *actual published section*, not a frame that must be handed off to a developer.

---

### 3.2 — Conflict-Free Concurrent Editing (CRDT Engine)

**What it does:** Two users can edit the same page simultaneously without either overwriting the other. Concurrent edits to different elements are always merged. Concurrent edits to the *same* element are resolved by the CRDT algorithm with zero data loss.

**Technical implementation:**
- Yjs as the CRDT library (same library powering VS Code Live Share, Jupyter collaboration, and Linear)
- Operations flow: local mutation → Yjs Y.Doc patch → WebSocket broadcast → remote peers apply patch → canvas re-renders from merged state
- The `_ops` array per node stores the Yjs operation history, enabling time-travel and conflict audit

**Operation model:**

```typescript
// Every canvas mutation becomes a typed operation
type NexusOperation =
  | { op: 'UPDATE_PROP';   nodeId: string; key: string;   value: unknown;  by: string; ts: number }
  | { op: 'MOVE_NODE';     nodeId: string; fromParent: string; toParent: string; index: number; by: string; ts: number }
  | { op: 'ADD_NODE';      node: NexusNode; parentId: string; index: number; by: string; ts: number }
  | { op: 'DELETE_NODE';   nodeId: string; by: string; ts: number }
  | { op: 'UPDATE_STYLE';  nodeId: string; breakpoint: string; styles: Record<string,string>; by: string; ts: number }
  | { op: 'REORDER';       parentId: string; newOrder: string[]; by: string; ts: number };
```

**AI-Assisted Conflict Resolution (industry-first):**

When two users make *semantically conflicting* changes that the CRDT algorithm cannot auto-resolve (e.g., user A changes a heading to "Get Started Today" while user B simultaneously changes it to "Launch Your Business Free"), the system:

1. Detects the semantic conflict after CRDT merge
2. Shows a **Conflict Resolution Card** to both users simultaneously — a side-by-side diff with the two versions
3. Offers three options: Keep A, Keep B, or **Let AI Merge** (uses the page context — industry, tone, CTA goal — to produce a synthesized version)
4. The chosen resolution is broadcast to all peers and written to the operation log with the deciding user's signature

This is an industry-first feature. No page builder or design tool today ships AI-assisted semantic conflict resolution. It turns a workflow hazard into a workflow feature.

---

### 3.3 — Design Branches (Git-for-Pages)

**What it does:** Any page or component can be branched to a named working copy. The branch can be edited independently of the main version, previewed, reviewed, and merged back — exactly like a Git branch, but for visual page designs.

**Why this matters:** Today, agencies handle "client wants to see two design directions" by duplicating pages, manually tracking which is which, and eventually losing the history. Design branches formalize this workflow.

**Feature specifics:**

```
Branch Lifecycle
├── Create branch: "v2-redesign", "client-direction-b", "dark-mode-experiment"
├── Branch badge visible in header — always know which branch you're on
├── Full edit capability on branches — all widgets, styles, and AI features
├── Branch preview: shareable URL at /preview?branch=v2-redesign
├── Visual diff: side-by-side or overlay comparison between branch and main
├── Merge strategies:
│   ├── Full replace: discard main, promote branch
│   ├── Selective merge: cherry-pick changed sections from branch to main
│   └── Conflict merge: resolve section-by-section with AI assist
├── Branch history: all changes on a branch are independently undoable
└── Auto-archive: merged branches are preserved for 90 days before deletion
```

**Technical model:**
- Each branch is a copy of the page's node tree JSON stored with a `branchId` prefix in the database
- CRDT operations are branch-scoped — they do not pollute the main operation log
- Merge is implemented as a sequence of operations applied to main, which the CRDT resolves

**Business positioning:** This feature alone justifies the Teams tier upgrade for any agency that has ever sent a client two design directions. No competitor offers it.

---

### 3.4 — Role-Based Canvas Permissions (RBAC)

**What it does:** Every team member is assigned a role that controls what they can see, edit, and publish — at the workspace, site, page, and section level.

**Role hierarchy:**

```
WORKSPACE ROLES
├── Owner          — Billing, seat management, all permissions
├── Admin          — Manage team members, sites, and global components
├── Designer       — Full canvas access, cannot publish without approval
├── Developer      — Canvas + custom code blocks, no billing access
├── Editor         — Edit content only (text, images) — no layout changes
├── Reviewer       — View + comment only — no edits
└── Client Guest   — Shareable link access — view + pin comments only

SECTION-LEVEL LOCKS (any role can apply to any node)
├── 🔒 Hard Lock   — No one except the locker can edit this section
├── 🔑 Role Lock   — Only users with [Designer+] can edit this section
├── 👁️ Hidden      — Hidden from Editor/Client roles on canvas
└── ✅ Approved    — Frozen — only Owner/Admin can unfreeze
```

**Technical implementation:**
- Permissions are resolved in the adapter layer, not the canvas — the canvas trusts the adapter's permission grants
- Lock state stored as node-level metadata: `{ _lock: { type: 'role', minRole: 'designer', lockedBy: 'uid-123', ts: 1234567890 } }`
- WebSocket presence server enforces edit access before broadcasting operations
- Client-side: locked nodes render with a visual indicator and swallow pointer events

**The Client Guest role is the headline agency feature:** Agencies can share a review link with their client. The client sees the page live in the builder (read-only), can pin comments to specific elements, and can click "Approve" or "Request Changes." The agency sees these annotations on their canvas. No screenshot email chains. No PDF markups. No Loom videos describing where the logo should move. One click. The annotation is on the element.

---

### 3.5 — Approval Workflow Engine

**What it does:** Formalizes the design → review → approve → publish pipeline with enforced gates, automated notifications, and an auditable approval history.

**Workflow states:**

```
Draft → In Review → Changes Requested → In Review → Approved → Published
  ↑                        ↑                                        │
  └────────────────────────┴────────────────────────────────────────┘
                    (revert to draft on significant edit)
```

**Feature specifics:**

```
Approval Engine
├── Submit for Review: Designer submits page → triggers notification to Reviewer/Client
├── Review snapshot: a frozen read-only preview of the submitted version is captured
│   (so reviewers always see what was submitted, not the live-edited version)
├── Inline annotations: reviewers pin comments to specific elements with a visual pin
├── Annotation threading: each pin supports a comment thread with @mentions
├── Bulk approve/reject: review mode shows all changed sections in a feed
├── Approval expiry: approvals expire if the page is substantially edited after approval
├── Auto-publish gate: pages in "Approved" state can be set to auto-publish at a 
│   scheduled datetime without requiring manual publish action
├── Approval certificate: each publish generates an immutable approval record —
│   who approved, what version, at what timestamp — stored in the audit log
└── Notification channels: in-app + email + (Teams tier) Slack/webhook integration
```

**Why this beats the current market:** Every design tool has "share a link for review." None of them have a formalized approval state machine that connects comment → response → approval → publish in a single unbroken audit trail. For agencies with regulatory clients (legal, finance, healthcare), this approval record is a compliance requirement, not a nice-to-have.

---

### 3.6 — Shared Component Library (Team Design System)

**What it does:** A workspace-level library of shared components — headers, footers, hero sections, card patterns — that any team member can use and that update across all sites when the source component is modified.

**This is different from Cloud Sync (Agency tier):** Cloud Sync pushes components to WordPress installations. The Shared Component Library is a workspace-level design system that governs what components exist and who can modify them — independent of any specific site.

**Feature specifics:**

```
Component Library
├── Component types: Sections, Widgets, Style Tokens (colors, fonts, spacing)
├── Ownership model: each component has an Owner who controls modify/publish rights
├── Lock states: Locked (read-only for all), Suggested (editable with approval), Open (editable by all)
├── Version history: every modification creates a new version — roll back at will
├── Usage tracking: shows which pages/sites use each component — impact analysis before change
├── "Push update" flow: modify a component → see all 47 pages that use it → 
│   choose: push to all, push to selected, or let pages opt-in
├── Component diffing: before pushing, show a visual before/after for each affected page
├── Design tokens library: brand colors, font stacks, spacing scales — 
│   stored as CSS custom properties and synced across all team sites
└── Global override rules: set a rule "all H1s on client-X sites use brand-A color" 
    that persists even if a designer accidentally overrides it locally
```

**Positioning:** This is the feature that turns Nexus Architect from a page builder into a design system governance tool. Agency teams building 50+ sites for a brand franchise (think hotel chains, car dealerships, franchise restaurants) live and die by component consistency. No page builder today ships this capability at this level.

---

### 3.7 — Workspace Analytics & Design Intelligence

**What it does:** Aggregated analytics across all team activity, site performance, and design patterns — giving leads and managers visibility into team productivity and site health.

**Dashboard sections:**

```
Workspace Analytics Dashboard
├── Team Activity
│   ├── Pages edited/published per team member (last 7/30 days)
│   ├── Average time from draft to publish per designer
│   ├── Approval cycle time: average time from "submit for review" to "approved"
│   ├── Comment resolution rate and average resolution time
│   └── Peak collaboration hours (useful for async international teams)
├── Site Health
│   ├── Lighthouse score trends per site (aggregated)
│   ├── Pages below performance threshold (flagged for action)
│   ├── Broken links detected on published pages
│   └── Outdated component versions in use
├── Design System Coverage
│   ├── % of pages using shared components vs. ad-hoc designs
│   ├── Component adoption rate post-update (how quickly teams accept pushed updates)
│   └── Style token drift: pages where designers overrode global tokens
└── Collaboration Health
    ├── Active branches (name, age, last editor)
    ├── Unresolved annotation threads
    ├── Pages pending approval for >72 hours (SLA breach flag)
    └── Seat utilization (helps justify subscription tier)
```

**Why this is a retention feature:** The analytics dashboard gives team leads data they cannot get anywhere else. Once an agency lead has three months of "design cycle time" data, they won't cancel — they'd lose the trend data and the benchmarks they've built their workflow around. Analytics data creates switching cost.

---

### 3.8 — Async Collaboration Tools (For Distributed & Remote Teams)

**What it does:** A full set of tools designed for teams that don't edit simultaneously — annotations, loom-style walkthroughs, and structured async feedback.

**Feature specifics:**

```
Async Toolkit
├── Page Walkthroughs: record a narrated screen capture directly in the builder
│   (no external tool needed) — pin the recording to a page for teammates to watch
├── Annotation Canvas: overlay a freehand annotation layer on any page view
│   with arrows, shapes, and text — linked to a specific page version
├── Async Review Mode: a stripped-down read-only builder view optimized for
│   reviewers on mobile — approve/reject/comment without loading the full editor
├── @mention notifications: mention a teammate in any comment thread — 
│   they receive an in-app + email notification with a deep link to the exact element
├── Digest emails: daily or weekly summary of all activity on pages you're 
│   collaborating on — configurable frequency and scope
└── "Catch me up" AI summary: when you return to a page after being away, 
    the AI summarizes what changed since your last visit in plain English:
    "Since Friday: Sarah updated the hero headline, moved the CTA above the fold,
    and added a pricing section. 3 unresolved comments on the features section."
```

**The "Catch me up" feature is an industry-first.** No collaboration tool in the design space uses AI to summarize contextual change history for a returning user. This single feature eliminates the "I don't know what my team changed while I was gone" problem that plagues every async design team.

---

## 4. Security Architecture

Team collaboration dramatically expands the attack surface. Every security measure below is mandatory before the collaboration features ship publicly.

### 4.1 — Transport Security

```
WebSocket Security Stack
├── All WebSocket connections over WSS (TLS 1.3 minimum)
├── Session token required for connection — JWT signed with RS256
├── Token verified on every message, not just on connect
├── Token expiry: 8 hours for standard sessions, 1 hour for guest review links
├── Connection rate limiting: max 10 reconnects/minute per user before lockout
└── Payload size limits: max 64KB per operation message (prevents memory exhaustion attacks)
```

### 4.2 — Operation-Level Authorization

Every CRDT operation is authorized server-side before it is applied and broadcast:

```typescript
// Server-side operation guard (runs on every operation received via WebSocket)
async function authorizeOperation(op: NexusOperation, session: Session): Promise<AuthResult> {
  const page     = await getPage(op.pageId);
  const userRole = await getEffectiveRole(session.userId, page.siteId);
  const nodeLock = op.nodeId ? await getNodeLock(op.nodeId) : null;

  // Role check
  if (!roleCanPerformOperation(userRole, op.op)) {
    return { allowed: false, reason: 'INSUFFICIENT_ROLE' };
  }

  // Node lock check
  if (nodeLock && !lockAllowsUser(nodeLock, session.userId, userRole)) {
    return { allowed: false, reason: 'NODE_LOCKED' };
  }

  // Approval state check
  if (page.status === 'approved' && !isAdminOrOwner(userRole)) {
    return { allowed: false, reason: 'PAGE_APPROVED_FROZEN' };
  }

  return { allowed: true };
}
```

This means **the client can never bypass permissions by crafting a raw WebSocket message**. The server is the authority — the client's RBAC rendering is UX convenience only.

### 4.3 — Audit Log (Immutable, Signed)

Every state-mutating event is written to an append-only audit log:

```
Audit Log Schema
├── id:        UUID (generated server-side — clients cannot predict)
├── ts:        Server timestamp (not client — prevents replay attacks)
├── userId:    Authenticated user ID
├── sessionId: Specific session token hash (links to auth record)
├── pageId:    Affected page
├── op:        Operation type
├── payload:   Operation payload hash (SHA-256 — not full payload, for PII compliance)
├── ip:        Client IP (hashed for GDPR compliance, stored for fraud detection)
├── sig:       HMAC-SHA256 signature of (id + ts + userId + op + payload hash)
└── prev:      Hash of previous audit entry (chain integrity — tampering detectable)
```

The `prev` hash chain means any attempt to delete or alter a past audit entry is detectable by recomputing the chain. This is the same principle used in blockchain audit logs and is required for SOC 2 Type II compliance.

**Audit log UI:** Team Admins and Owners have a searchable, filterable audit log view showing who did what, when, and from what IP — with the ability to replay or roll back to any historical page state.

### 4.4 — Guest Review Link Security

Guest review links (shareable with clients) are security-sensitive:

```
Guest Link Security
├── Links are signed JWTs — not guessable paths
├── Permissions: view + comment only — hardcoded at link creation, not configurable by recipients
├── Expiry: links expire in 7 days by default (configurable: 1–30 days)
├── Revocation: any team member with Designer+ role can revoke a link immediately
├── Rate limiting: max 100 page loads per link per hour (prevents scraping)
├── No authentication bypass: guest links cannot be used to access other pages or the builder
├── IP logging: all guest link accesses are logged with IP and user agent (for client audit trails)
└── Watermarking: guest preview renders a subtle "Review Copy — Not Published" 
    watermark over the canvas to prevent screenshots being passed off as final work
```

### 4.5 — SSO / SAML 2.0 (Teams & Enterprise Tiers)

```
SSO Implementation
├── SAML 2.0 for enterprise IdPs (Okta, Azure AD, Google Workspace, PingIdentity)
├── OIDC for modern IdPs (Auth0, Clerk, Cognito)
├── SCIM 2.0 for automated user provisioning/deprovisioning from the IdP
│   (when IT removes an employee from Okta, their Nexus seat is revoked automatically)
├── Just-in-time provisioning: new employees automatically get a seat when they first SSO in
│   (no manual invite required — role assigned from IdP attribute mapping)
├── MFA enforcement: Teams tier can require MFA — overrides individual user settings
└── Session policy: configurable max session duration, idle timeout, and device trust rules
```

### 4.6 — Data Isolation & Multi-Tenancy

```
Data Isolation Model
├── Workspace isolation: team A's data is never queryable by team B at the database layer
│   (row-level security enforced in Supabase via workspace_id on every table)
├── Component library encryption: shared components encrypted at rest with 
│   workspace-specific keys (AES-256-GCM)
├── Operation log encryption: CRDT operation history encrypted at rest
├── Backup isolation: each workspace's backup is an independent encrypted archive
├── API key scoping: API access tokens are workspace-scoped — a token from one 
│   workspace cannot access another workspace's data, even for the same user
└── Zero-knowledge architecture for Enterprise: the Enterprise tier offers a 
    self-hosted sync server option where Nexus Architect never sees the customer's
    page content — only anonymous telemetry
```

### 4.7 — Penetration Testing & Compliance Schedule

```
Security Validation Schedule
├── Phase 13.3 launch: OWASP Top 10 review of all collaboration endpoints
├── Phase 13.3 launch: Automated dependency vulnerability scanning (Snyk) in CI
├── Month 16: Third-party penetration test of WebSocket server and operation endpoints
├── Month 18: SOC 2 Type I audit preparation (required for enterprise sales)
├── Month 24: SOC 2 Type II certification (required for Fortune 500 deals)
└── Ongoing: HackerOne responsible disclosure program (public bug bounty at $200–$5,000)
```

---

## 5. Technical Infrastructure

### 5.1 — WebSocket Server Architecture

```
Transport Layer Options (by tier)
├── WordPress Phase (Phases 13.3):
│   ├── Primary: Ably Realtime (managed WebSocket infrastructure)
│   │   Reasons: handles millions of concurrent connections, global edge PoPs,
│   │   built-in presence channels, message history for reconnect sync
│   │   Cost: ~$50/month up to 1M messages/month — acceptable at launch scale
│   └── WP Adapter wraps Ably's SDK so the core engine never imports Ably directly
│
├── SaaS Phase (Phase 13.4):
│   ├── Supabase Realtime (native to the SaaS database layer)
│   ├── Supabase Presence for cursor sync
│   └── Supabase Broadcast for ephemeral cursor positions (not persisted)
│
└── Enterprise Self-Hosted:
    └── A containerized Nexus Sync Server (open source, MIT licensed)
        running on the customer's own infrastructure — connects to their
        WordPress/database and exposes the WebSocket endpoint internally
```

### 5.2 — CRDT Engine (Yjs Integration)

```
Yjs Integration Architecture
├── Y.Doc per page: each page has a Yjs document representing its node tree
├── Y.Map for nodeMap: the flat node map is a Y.Map — updates are CRDT-merged
├── Y.Array for children: each node's children array is a Y.Array — reorders are CRDT-safe
├── Y.Text for inline text: Tiptap's Yjs extension is used for inline text editing —
│   simultaneous character-level edits are merged without conflicts
├── Awareness for presence: Yjs Awareness API for cursor positions and user state
│   (these are ephemeral — not persisted to the node's _ops log)
├── Persistence: Y.Doc state is encoded to binary and stored in the database on every update
│   (the `_ops` field stores the encoded update binary for incremental sync)
└── Reconnect sync: when a user reconnects after being offline, Yjs sends only the
    incremental updates since their last known state — not the full document
```

### 5.3 — Collaboration State Store (Zustand Activation)

The `CollaborationStore` stub from Phase 2 is fully activated:

```typescript
interface CollaborationState {
  // Presence
  peers:          Map<string, PeerPresence>;    // userId → cursor/selection state
  activeSections: Map<string, string[]>;        // sectionId → [userId, ...]

  // Branch management
  currentBranch:  string;                       // 'main' or branch name
  branches:       BranchMeta[];

  // Approval workflow
  pageStatus:     PageStatus;                   // draft | in-review | approved | published
  annotations:    Annotation[];

  // Operation log (for AI "catch me up" summary)
  recentOps:      NexusOperation[];             // last 100 operations on this page

  // Actions
  updatePresence:    (state: Partial<PeerPresence>) => void;
  createBranch:      (name: string) => Promise<void>;
  mergeBranch:       (strategy: MergeStrategy) => Promise<MergeResult>;
  submitForReview:   () => Promise<void>;
  approveOrReject:   (decision: 'approve' | 'reject', notes?: string) => Promise<void>;
}
```

---

## 6. UX Architecture

### 6.1 — Collaboration Toolbar (Non-Intrusive)

A new persistent strip appears at the top of the builder when collaboration is active:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ◆ Nexus Architect   [Branch: main ▾]   [● Live: 3 editors]               │
│                                          [Sarah ●] [Marcus ●] [You ●]      │
│                      [Draft ▾]  [Submit for Review]  [Preview ▾]           │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Branch dropdown:** Switch branches, create new, see branch status
- **Live editors pill:** Clicking expands to show each user's position (scroll to their view)
- **Status badge:** Current approval workflow state — clickable for full workflow modal
- **Submit for Review:** Primary CTA when the page is in Draft state

### 6.2 — Canvas Collaboration Indicators

Minimal, non-distracting overlays on the canvas:

```
Collaboration Overlays
├── Peer cursors: small colored dot + name tag, fades when idle
├── Selected element halo: 2px colored ring around elements selected by others
├── Locked element badge: 🔒 icon with tooltip "Locked by Sarah"
├── Annotation pins: numbered pins placed on elements by reviewers
│   (visible only in Review Mode — not cluttering the design view)
├── Section editor tag: "Sarah editing" small tag on section being edited by peer
│   (appears when peer has a text cursor active in that section)
└── Merge conflict indicator: ⚡ icon on element with unresolved semantic conflict
```

### 6.3 — Mobile Review Mode

Clients and reviewers often use phones, not desktops. A stripped-down, mobile-optimized review interface:

```
Mobile Review View
├── Full-page preview (the published output, not the builder UI)
├── Tap to pin: tap anywhere → pin annotation drops → type comment → submit
├── Approve / Request Changes buttons fixed at bottom
├── Annotation feed: scrollable list of all open annotations
└── No builder toolbar, panels, or widgets — pure review experience
```

---

## 7. Implementation Roadmap

The collaboration system is built in four sub-phases, each activating incrementally on the infrastructure laid in Phases 2 and 7.5:

### Phase 13.3a — Foundation Activation (Month 16, ~3 weeks)
- Activate `CollaborationStore` from Phase 2 stub
- Wire Yjs Y.Doc to the page's nodeMap and children arrays
- Connect to Ably/Supabase Realtime transport
- Ship multiplayer presence (cursors, section presence, active user list)
- Ship "last editor" indicator (built in Phase 7.5 — just enable for all Agency+ tiers)
- **E2E test gate:** two browser sessions on the same page see each other's cursors; one edit propagates to the other in under 150ms

### Phase 13.3b — Core Editing (Month 17, ~4 weeks)
- Activate Yjs CRDT for concurrent node mutations (props, styles, moves)
- Activate Tiptap Yjs extension for concurrent inline text editing
- Ship conflict detection and Conflict Resolution Card UI
- Ship element locking (hard lock + role lock)
- Ship Design Branches (create, switch, visual diff, full-replace merge)
- **E2E test gate:** two sessions concurrently edit different elements — both changes visible on both screens with no data loss; conflicting text edits produce the Conflict Card; branch create/merge round-trips cleanly

### Phase 13.3c — Review & Approval (Month 18, ~3 weeks)
- Ship RBAC role system (Owner/Admin/Designer/Editor/Reviewer/Client Guest)
- Ship Approval Workflow state machine (Draft → In Review → Approved → Published)
- Ship Guest Review Links (signed JWT, expiry, annotation pins)
- Ship mobile review mode
- Ship annotation threading with @mentions
- Ship review snapshot (frozen version captured on submit)
- **E2E test gate:** guest link opens page in review mode; pin annotation visible on designer's canvas; approval transitions page to Approved state; designer edit after approval resets to Draft

### Phase 13.3d — Team Intelligence (Month 19, ~4 weeks)
- Ship Shared Component Library (create, lock, version, push update, usage tracking)
- Ship Workspace Analytics Dashboard
- Ship async toolkit (walkthroughs, annotation canvas, "catch me up" AI summary)
- Ship SSO/SAML (Teams tier)
- Ship immutable audit log + Admin UI
- Ship SCIM provisioning (Enterprise tier)
- **E2E test gate:** component push update propagates to all connected pages; audit log records and chain-verifies every operation; SSO login provisions a new user with correct role from IdP attributes

---

## 8. ADR Addition: ADR 005 — Team Collaboration Security Model

> **Status:** Proposed  
> **Supersedes:** N/A  
> **References:** ADR 002 (CRDT Schema)

### Decision

Server-side authorization of every CRDT operation before propagation, over a client-enforced-only model.

### Rationale

Client-enforced RBAC is trivially bypassable by crafting WebSocket messages. All permission checks must run on the server, with the client's permission rendering serving as UX feedback only. The marginal latency cost (~5ms for a DB permission lookup per operation) is acceptable for collaborative editing; it is absorbed by the 50–150ms round-trip time of the WebSocket transport.

### Consequences

- **Good:** Permissions cannot be bypassed regardless of client-side manipulation
- **Good:** Audit log integrity is guaranteed — only authorized operations reach the log
- **Bad:** Requires a stateful permission cache on the WebSocket server (resolved with a short-TTL Redis cache per active session)
- **Bad:** Offline edits cannot be queued without a permission re-check on reconnect (acceptable — offline support is not a Phase 13 requirement)

---

## 9. Competitive Positioning Summary

| Capability | Elementor | Webflow | Figma | Framer | **Nexus Architect Teams** |
|---|---|---|---|---|---|
| Real-time co-editing | ❌ | ❌ | ✅ | ✅ | ✅ |
| CRDT (no data loss) | ❌ | ❌ | Partial | Partial | ✅ Yjs |
| AI conflict resolution | ❌ | ❌ | ❌ | ❌ | ✅ **First in class** |
| Design branches | ❌ | ❌ | ✅ Paid | ❌ | ✅ Included |
| RBAC (section-level) | ❌ | Page-level | Frame-level | ❌ | ✅ Node-level |
| Approval workflow | ❌ | ❌ | Plugin only | ❌ | ✅ Native |
| Client review portal | ❌ | ❌ | Viewer links | ❌ | ✅ Mobile-optimized |
| Shared component library | ❌ | ✅ | ✅ | ❌ | ✅ + governance |
| "Catch me up" AI | ❌ | ❌ | ❌ | ❌ | ✅ **First in class** |
| SSO / SAML | ❌ | Enterprise | Enterprise | ❌ | ✅ Teams tier |
| Immutable audit log | ❌ | ❌ | ❌ | ❌ | ✅ **First in class** |
| Publishes to live web | ✅ | ✅ | ❌ | Framer only | ✅ Any host |
| WordPress integration | ✅ | ❌ | ❌ | ❌ | ✅ |
| Self-hosted sync server | ❌ | ❌ | ❌ | ❌ | ✅ Enterprise |

**Three industry-first features that no competitor ships:**
1. AI-assisted semantic conflict resolution
2. "Catch me up" AI change summary for returning collaborators  
3. Immutable hash-chained audit log for page design history

These three features generate press coverage on announcement and create durable switching cost once teams are reliant on the workflow data.

---

## 10. Revenue Impact Model

### Conservative Scenario (Month 24 post-launch)

| Tier | Users | ARR/User | ARR |
|---|---|---|---|
| Free | 10,000 | $0 | $0 |
| Personal | 1,200 | $69 | $82,800 |
| Professional | 800 | $179 | $143,200 |
| Agency | 300 | $349 | $104,700 |
| **Teams** | **150 teams × avg 8 seats** | **$790** | **$118,500** |
| Enterprise | 10 | $3,600 | $36,000 |
| **Total ARR** | | | **$485,200** |

### Teams Tier Multiplier Effect

At 150 teams averaging 8 seats, the Teams tier delivers $118,500 ARR from 150 accounts — the same revenue as 340 Professional-tier solo users. As average team size grows from 8 to 15 seats (natural progression as agencies grow), the same 150 team accounts deliver $222,600 ARR with zero additional customer acquisition cost.

**The Teams tier is a compounding revenue model.** Every hire a customer makes at their agency is a new seat. Agency growth = Nexus ARR growth, automatically.

---

*This document supersedes the Phase 13.3 section of the Master Blueprint for all collaboration-related feature decisions. All implementation work must reference this spec. Security measures in Section 4 are non-negotiable prerequisites — no collaboration feature ships without its corresponding security gate passing the Phase 9 hardening checklist.*

*Last updated: 2026-05-11*
