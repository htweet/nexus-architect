/**
 * Widget Registration — imports all widgets and registers them with the global
 * registry. Import this module once at app boot (main.tsx) as a side-effect.
 *
 * Import order = palette display order within each category.
 */

import { registerWidget } from './registry';

// Layout
import { RootWidget }      from './root';
import { SectionWidget }   from './section-widget';
import { ColumnsWidget }   from './columns-widget';
import { ContainerWidget } from './container';
import { SpacerWidget }    from './spacer';

// Content
import { HeadingWidget }      from './heading';
import { ParagraphWidget }    from './paragraph';
import { ListWidget }         from './list-widget';
import { DividerWidget }      from './divider';
import { IconWidget }         from './icon-widget';
import { IconBoxWidget }      from './icon-box-widget';
import { TestimonialWidget }  from './testimonial-widget';
import { AlertWidget }        from './alert-widget';

// Media
import { ImageWidget }     from './image-widget';
import { VideoWidget }     from './video-widget';
import { HtmlEmbedWidget } from './html-embed-widget';

// Interactive
import { ButtonWidget }    from './button-widget';
import { AccordionWidget } from './accordion-widget';
import { TabsWidget }      from './tabs-widget';

// ─── Register (order = palette sort order within each category) ───────────────

registerWidget(RootWidget);       // internal — not shown in palette
// Layout
registerWidget(SectionWidget);
registerWidget(ColumnsWidget);
registerWidget(ContainerWidget);
registerWidget(SpacerWidget);
// Content
registerWidget(HeadingWidget);
registerWidget(ParagraphWidget);
registerWidget(ListWidget);
registerWidget(DividerWidget);
registerWidget(IconWidget);
registerWidget(IconBoxWidget);
registerWidget(TestimonialWidget);
registerWidget(AlertWidget);
// Media
registerWidget(ImageWidget);
registerWidget(VideoWidget);
registerWidget(HtmlEmbedWidget);
// Interactive
registerWidget(ButtonWidget);
registerWidget(AccordionWidget);
registerWidget(TabsWidget);

// Re-export for external use
export { registerWidget, getWidget, getAllWidgets, getWidgetsByCategory } from './registry';
export type { WidgetDefinition, WidgetCategory, WidgetRendererProps, WidgetInspectorProps, ChildNodeSpec } from './registry';

// ─── NexusWidget registrations (new schema-driven API) ───────────────────────
import { registerNexusAuthWidget, NexusAuthWidgetDef } from './nexus-auth-widget';
import { bridgeNexusWidget } from './registry';

registerNexusAuthWidget();
bridgeNexusWidget(NexusAuthWidgetDef);
