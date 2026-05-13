/**
 * Dynamic Data Binding — types (Phase 8.3)
 * Professional & Agency tiers only.
 *
 * Any widget prop can be bound to a live data source instead of a static value.
 * The binding is stored in node.bindings (separate from node.props) so that
 * static fallbacks are always available when the data source is unavailable.
 */

// ─── Source Types ─────────────────────────────────────────────────────────

export type DataSourceType =
  | 'wordpress_core'    // post title, excerpt, featured image, author, date…
  | 'acf'               // Advanced Custom Fields Pro
  | 'woocommerce'       // product name, price, gallery, SKU, stock
  | 'rest_api';         // any custom REST endpoint

export type FieldValueType = 'text' | 'image' | 'url' | 'number' | 'date' | 'boolean' | 'html';

export interface DataField {
  key: string;
  label: string;
  type: FieldValueType;
  /** Live preview value pulled from the current post context. */
  sampleValue?: string;
  /** Sub-fields for composite types (e.g. ACF image field → url, alt, width). */
  subFields?: Omit<DataField, 'subFields'>[];
}

export interface DataSource {
  id: string;
  type: DataSourceType;
  label: string;
  /** Lucide icon name string. */
  icon: string;
  description: string;
  /** Whether this source is available in the current WP installation. */
  isAvailable: boolean;
  fields: DataField[];
}

// ─── Bindings ─────────────────────────────────────────────────────────────

export interface FieldBinding {
  /** Canvas node the binding applies to. */
  nodeId: string;
  /** Widget prop key being overridden (e.g. "text", "src", "href"). */
  propKey: string;
  /** ID of the DataSource providing the value. */
  sourceId: string;
  /** Dot-path to the specific field within the source (e.g. "post_title"). */
  fieldKey: string;
  /** Static value shown when the source is unavailable or returns null. */
  fallbackValue: string;
}

// ─── Standard WP Data Sources ─────────────────────────────────────────────

export const WP_CORE_SOURCE: DataSource = {
  id: 'wordpress_core',
  type: 'wordpress_core',
  label: 'WordPress',
  icon: 'Globe',
  description: 'Core WordPress post data — title, excerpt, featured image, author, date.',
  isAvailable: true,
  fields: [
    { key: 'post_title',          label: 'Post Title',          type: 'text',   sampleValue: 'Hello World' },
    { key: 'post_excerpt',        label: 'Post Excerpt',        type: 'text',   sampleValue: 'A short excerpt…' },
    { key: 'post_content',        label: 'Post Content',        type: 'html',   sampleValue: '<p>Content here</p>' },
    { key: 'featured_image_url',  label: 'Featured Image URL',  type: 'image',  sampleValue: '' },
    { key: 'featured_image_alt',  label: 'Featured Image Alt',  type: 'text',   sampleValue: '' },
    { key: 'author_name',         label: 'Author Name',         type: 'text',   sampleValue: 'Jane Doe' },
    { key: 'author_avatar',       label: 'Author Avatar',       type: 'image',  sampleValue: '' },
    { key: 'post_date',           label: 'Published Date',      type: 'date',   sampleValue: '2026-05-12' },
    { key: 'post_url',            label: 'Post URL',            type: 'url',    sampleValue: 'https://example.com/hello-world' },
    { key: 'category_name',       label: 'Category Name',       type: 'text',   sampleValue: 'News' },
    { key: 'tag_list',            label: 'Tag List',            type: 'text',   sampleValue: 'design, web' },
    { key: 'site_name',           label: 'Site Name',           type: 'text',   sampleValue: 'My Site' },
    { key: 'site_tagline',        label: 'Site Tagline',        type: 'text',   sampleValue: 'Just another WordPress site' },
    { key: 'site_logo',           label: 'Site Logo',           type: 'image',  sampleValue: '' },
    { key: 'site_url',            label: 'Site URL',            type: 'url',    sampleValue: 'https://example.com' },
  ],
};

export const WOO_SOURCE: DataSource = {
  id: 'woocommerce',
  type: 'woocommerce',
  label: 'WooCommerce',
  icon: 'ShoppingCart',
  description: 'Product data — name, price, gallery, SKU, stock status.',
  isAvailable: false,
  fields: [
    { key: 'product_name',        label: 'Product Name',        type: 'text',   sampleValue: 'Blue T-Shirt' },
    { key: 'product_price',       label: 'Price',               type: 'text',   sampleValue: '$29.99' },
    { key: 'product_sale_price',  label: 'Sale Price',          type: 'text',   sampleValue: '$19.99' },
    { key: 'product_sku',         label: 'SKU',                 type: 'text',   sampleValue: 'BTS-001' },
    { key: 'product_image',       label: 'Main Image',          type: 'image',  sampleValue: '' },
    { key: 'product_description', label: 'Short Description',   type: 'html',   sampleValue: '' },
    { key: 'product_stock',       label: 'Stock Status',        type: 'text',   sampleValue: 'In Stock' },
    { key: 'product_rating',      label: 'Rating',              type: 'number', sampleValue: '4.5' },
    { key: 'product_url',         label: 'Product URL',         type: 'url',    sampleValue: '' },
    { key: 'add_to_cart_url',     label: 'Add to Cart URL',     type: 'url',    sampleValue: '' },
  ],
};
