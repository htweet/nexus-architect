=== Nexus Architect ===
Contributors: nexusarchitect
Tags: page builder, visual editor, drag and drop, Gutenberg alternative, elementor alternative
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A revolutionary visual page builder that rivals Elementor. React-powered, platform-agnostic, Lighthouse 95+ by default.

== Description ==

Nexus Architect is a next-generation WordPress page builder built on a modern, decoupled architecture:

* **React + TypeScript core** — smooth, real-time drag-and-drop canvas
* **Platform-agnostic** — the builder core never calls WordPress APIs directly; a thin adapter layer handles all persistence
* **Static HTML compiler** — pages compile to clean, semantic HTML + CSS with zero runtime dependencies
* **Lighthouse 95+** — compiled output targets top Core Web Vitals scores out of the box
* **Code-split bundles** — the builder itself lazy-loads heavy panels (AI, templates, settings) so the initial load is fast

= Features =

* Drag-and-drop canvas with 20+ widget types (Heading, Text, Button, Image, Video, Tabs, Accordion, Columns, Grid, and more)
* Real-time visual inspector for typography, spacing, border, shadow, and animation
* Responsive breakpoint preview (Desktop / Tablet / Mobile)
* Template library with 22+ premium page templates
* AI-powered layout generation and content population
* Revision history with snapshot restore
* Page manager (create, duplicate, delete)
* Publish workflow with static HTML + CSS compilation
* PWA manifest + service worker generation
* Dynamic data binding and visibility rules
* White-label system and addon marketplace
* Full keyboard shortcut system

= Minimum Requirements =

* WordPress 6.4 or higher
* PHP 8.0 or higher
* MySQL 5.7 / MariaDB 10.4 or higher

== Installation ==

1. Upload the `nexus-architect` folder to `/wp-content/plugins/`
2. Activate the plugin through the **Plugins** menu in WordPress
3. Navigate to **Nexus** in the WordPress admin sidebar
4. Start building!

= Development Setup =

If you want to run the builder in development mode with HMR:

1. Clone the repository: `git clone https://github.com/your-org/nexus-architect`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev --workspace=apps/builder`
4. Add to `wp-config.php`: `define('NEXUS_DEV_SERVER_URL', 'http://localhost:3000');`

== Frequently Asked Questions ==

= Does Nexus Architect work with the Block Editor (Gutenberg)? =

Nexus Architect runs on its own admin page and does not replace or conflict with Gutenberg. You can use both on the same WordPress installation.

= Can I use my own custom widgets? =

Yes. The builder exposes a Widget Registration API. See `docs/api/widget-api.md` in the plugin folder for full documentation.

= Is the data stored as shortcodes? =

No. All page designs are stored as pure JSON in a dedicated `wp_nexus_pages` table. Published pages are compiled to clean, static HTML.

= Does it work without WordPress? =

The core builder engine is 100% platform-agnostic. A standalone SaaS version using Supabase is on the roadmap.

== Screenshots ==

1. The main builder canvas with the widget inspector open
2. The template library with 22+ premium templates
3. The AI layout generation panel
4. Published page — compiled static HTML, Lighthouse 95+

== Changelog ==

= 1.0.0 =
* Initial public release
* 20+ widget types, template library, AI generation, PWA support
* Full TypeScript source, 0 errors

= 0.9.0 =
* Visual Application Engine: dynamic data binding, visibility rules, action pipelines
* PWA compilation (manifest + service worker)
* WordPress REST API: RLS compiler guard, webhook proxy, PWA file serving

= 0.8.0 =
* Canvas Interaction Engine: portaled floating toolbar, Figma-style drag-and-drop
* Phase 8: Premium Gate, Marketplace, White Label, Cloud Sync, License activation

== Upgrade Notice ==

= 1.0.0 =
First stable release. No upgrade steps required.
