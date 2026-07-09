/**
 * Phase 11 — RightPanel Properties Inspector E2E Test Suite
 *
 * Tests every style section in the actual mounted component: RightPanel.tsx
 * (data-testid="right-panel"). Covers:
 *
 *   1. Panel renders on node selection
 *   2. Style tab is accessible
 *   3. Layout  — display, flex controls
 *   4. Spacing — width/height, padding/margin box model
 *   5. Background — solid colour with applyHex normalisation
 *   6. Typography — font-family, font-size, text-align, text colour
 *   7. Border — borderWidth, borderColor, borderRadius
 *   8. Shadow — preset click + shadow shows on canvas
 *   9. Appearance — visibility select
 *   10. applyHex fix — bare "ff0000" text → stored as "#ff0000"
 *   11. Persistence — styles survive localStorage round-trip (reload)
 *
 * Strategy:
 *   Pre-seed localStorage (nexus_mock_db) with a page containing a heading
 *   node. Select that node → RightPanel appears. Switch to STYLE tab.
 *   Expand each accordion section (only Layout is open by default).
 *   Interact with controls and verify the canvas element's inline style
 *   reflects the change (CanvasNodeWrapper applies node.styles.base as
 *   inline styles on the [data-node-id] wrapper).
 *
 * Run: npm run test:e2e -- --grep "Phase 11"
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Seed data ────────────────────────────────────────────────────────────────

const TEST_NODE_ID = 'e2e-p11-heading';
const TEST_PAGE_ID = 'e2e-p11-page';

const SEED_PAGE = {
  id:           TEST_PAGE_ID,
  title:        'Phase 11 RightPanel E2E',
  slug:         'phase11-right-panel-e2e',
  rootNodeId:   'e2e-p11-root',
  schemaVersion: 1,
  status:       'draft',
  createdAt:    '2026-01-01T00:00:00.000Z',
  updatedAt:    '2026-01-01T00:00:00.000Z',
  nodeMap: {
    'e2e-p11-root': {
      id:       'e2e-p11-root',
      type:     'root',
      props:    {},
      styles:   { base: { minHeight: '100vh', background: '#ffffff' } },
      children: [TEST_NODE_ID],
      parentId: null,
      locked:   false,
    },
    [TEST_NODE_ID]: {
      id:       TEST_NODE_ID,
      type:     'heading',
      label:    'Phase 11 Test Heading',
      props:    { text: 'Phase 11 RightPanel Test', level: 'h2' },
      styles:   { base: {} },
      children: [],
      parentId: 'e2e-p11-root',
      locked:   false,
    },
  },
};

const SEED_DB = {
  pages:     { [TEST_PAGE_ID]: SEED_PAGE },
  revisions: {},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Seed localStorage and navigate to the builder. */
async function loadBuilder(page: Page): Promise<void> {
  await page.addInitScript((db) => {
    localStorage.setItem('nexus_mock_db',     JSON.stringify(db));
    localStorage.setItem('nexus_last_page_id', (db as any).pages[Object.keys((db as any).pages)[0]].id);
  }, SEED_DB as any);

  await page.goto('/');
  await expect(page.locator('[data-testid="builder-shell"]')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600); // let adapter + user init settle
}

/** Click the test node on the canvas and verify RightPanel appears. */
async function selectNode(page: Page): Promise<void> {
  const node = page.locator(`[data-node-id="${TEST_NODE_ID}"]`);
  await expect(node).toBeVisible({ timeout: 8_000 });
  await node.click();
  await expect(page.locator('[data-testid="right-panel"]')).toBeVisible({ timeout: 5_000 });
}

/** Switch to the STYLE tab inside ElementProperties. */
async function openStyleTab(page: Page): Promise<void> {
  await page.locator('[data-testid="element-tab-style"]').click();
  await page.waitForTimeout(150);
}

/**
 * Expand an accordion section by its label text.
 * Uses aria-expanded to detect current state — only clicks if collapsed.
 */
async function expandSection(page: Page, label: string): Promise<void> {
  // The AccSection trigger button contains the label text
  const trigger = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  await expect(trigger).toBeVisible({ timeout: 5_000 });
  const expanded = await trigger.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await trigger.click();
    await page.waitForTimeout(250); // accordion open animation
  }
}

/**
 * Read an inline CSS property from the canvas node's style attribute.
 * Uses getPropertyValue so both camelCase and kebab-case props work.
 */
async function getInlineStyle(page: Page, prop: string): Promise<string> {
  return page.locator(`[data-node-id="${TEST_NODE_ID}"]`).evaluate((el, p) => {
    return (el as HTMLElement).style.getPropertyValue(
      p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
    );
  }, prop);
}

/**
 * Find the content region associated with an accordion section trigger.
 * Radix Accordion wires aria-controls on the trigger → the content div's id.
 */
async function getSectionContent(page: Page, label: string) {
  const trigger = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  const controls = await trigger.getAttribute('aria-controls');
  if (!controls) throw new Error(`No aria-controls on ${label} trigger`);
  return page.locator(`[id="${controls}"]`);
}

// ─── Setup: select node + open style tab ─────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await loadBuilder(page);
  await selectNode(page);
  await openStyleTab(page);
});

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe('Phase 11 — RightPanel Inspector', () => {

  // ── 1. Panel presence ────────────────────────────────────────────────────

  test('1 — Right panel renders and shows Element header', async ({ page }) => {
    const panel = page.locator('[data-testid="right-panel"]');
    await expect(panel).toBeVisible();

    // Header says "Element" when a node is selected
    await expect(panel.getByText('Element')).toBeVisible();

    // All three tabs are present
    await expect(page.locator('[data-testid="element-tab-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="element-tab-style"]')).toBeVisible();
    await expect(page.locator('[data-testid="element-tab-advanced"]')).toBeVisible();
  });

  // ── 2. Layout section ────────────────────────────────────────────────────

  test('2 — Layout: Display → flex updates canvas', async ({ page }) => {
    // Layout is open by default (defaultValue={['layout']})
    const content = await getSectionContent(page, 'Layout');

    const displaySelect = content.locator('select').first();
    await expect(displaySelect).toBeVisible();

    await displaySelect.selectOption('flex');
    await page.waitForTimeout(200);

    const canvasDisplay = await getInlineStyle(page, 'display');
    expect(canvasDisplay).toBe('flex');
  });

  test('2b — Layout: Flex controls appear after switching to flex', async ({ page }) => {
    const content = await getSectionContent(page, 'Layout');
    await content.locator('select').first().selectOption('flex');
    await page.waitForTimeout(200);

    // Flex controls: Direction select should appear
    const flexSelects = content.locator('select');
    expect(await flexSelects.count()).toBeGreaterThanOrEqual(2);

    // Align items buttons (AlignVerticalJustifyStart etc.) should appear
    const alignBtns = content.locator('button[title="Start"]');
    await expect(alignBtns.first()).toBeVisible();
  });

  test('2c — Layout: Justify content center updates canvas', async ({ page }) => {
    const content = await getSectionContent(page, 'Layout');
    await content.locator('select').first().selectOption('flex');
    await page.waitForTimeout(200);

    // Click "Center" justify button (title="Center" in the Just row)
    const centerBtn = content.locator('button[title="Center"]').first();
    await centerBtn.click();
    await page.waitForTimeout(200);

    const jc = await getInlineStyle(page, 'justifyContent');
    expect(jc).toBe('center');
  });

  // ── 3. Spacing section ───────────────────────────────────────────────────

  test('3 — Spacing: Width input updates canvas width', async ({ page }) => {
    await expandSection(page, 'Spacing');
    const content = await getSectionContent(page, 'Spacing');

    // Width input has label "W"
    const wInput = content.locator('input[type="text"]').first();
    await wInput.fill('350px');
    await wInput.press('Tab');
    await page.waitForTimeout(200);

    const canvasWidth = await getInlineStyle(page, 'width');
    expect(canvasWidth).toBe('350px');
  });

  test('3b — Spacing: Padding all-sides input updates canvas', async ({ page }) => {
    await expandSection(page, 'Spacing');
    const content = await getSectionContent(page, 'Spacing');

    // The Padding "all" input is the one after the PADDING label row
    // BoxModel renders: label row with "all" CInput, then individual sides grid
    // The "all" input for Padding is the 8th CInput in the section (W,H,min,max,mnH,mxH = 6, boxSizing select, margin-all = 7th, padding-all = 8th)
    // More reliably: find the input near "Padding" label text
    const allPaddingInput = content.locator('input[placeholder="all"]').last();
    await allPaddingInput.fill('16px');
    await allPaddingInput.press('Tab');
    await page.waitForTimeout(200);

    const canvasPadding = await getInlineStyle(page, 'padding');
    expect(canvasPadding).toBe('16px');
  });

  // ── 4. Background section ────────────────────────────────────────────────

  test('4 — Background: Solid colour picker updates backgroundColor', async ({ page }) => {
    await expandSection(page, 'Background');
    const content = await getSectionContent(page, 'Background');

    // Solid tab is selected by default — the CColor has a text input placeholder="transparent"
    const colorTextInput = content.locator('input[placeholder="transparent"]').first();
    await expect(colorTextInput).toBeVisible();

    await colorTextInput.fill('#3b82f6');
    await colorTextInput.press('Tab');
    await page.waitForTimeout(200);

    const bg = await getInlineStyle(page, 'backgroundColor');
    // Browser normalises hex → rgb
    expect(bg).toMatch(/rgb\(59,\s*130,\s*246\)|#3b82f6/i);
  });

  test('4b — Background: applyHex normalises bare hex without #', async ({ page }) => {
    await expandSection(page, 'Background');
    const content = await getSectionContent(page, 'Background');

    const colorTextInput = content.locator('input[placeholder="transparent"]').first();
    // Type WITHOUT leading # — applyHex should add it
    await colorTextInput.fill('10b77f');
    await colorTextInput.press('Tab');
    await page.waitForTimeout(200);

    const bg = await getInlineStyle(page, 'backgroundColor');
    // Should be the green from applyHex normalisation, not empty/invalid
    expect(bg).toMatch(/rgb\(16,\s*183,\s*127\)|#10b77f/i);
  });

  test('4c — Background: Gradient type shows From/To colour fields', async ({ page }) => {
    await expandSection(page, 'Background');
    const content = await getSectionContent(page, 'Background');

    // Click Gradient tab
    await content.getByRole('button', { name: /gradient/i }).click();
    await page.waitForTimeout(150);

    // From + To CColor text inputs should be visible
    const colorInputs = content.locator('input[placeholder="transparent"]');
    expect(await colorInputs.count()).toBeGreaterThanOrEqual(2);
  });

  // ── 5. Typography section ────────────────────────────────────────────────

  test('5 — Typography: Font-family select updates canvas fontFamily', async ({ page }) => {
    await expandSection(page, 'Typography');
    const content = await getSectionContent(page, 'Typography');

    // First select in the Typography section is the font-family select
    const fontSelect = content.locator('select').first();
    await fontSelect.selectOption('Poppins, sans-serif');
    await page.waitForTimeout(200);

    const ff = await getInlineStyle(page, 'fontFamily');
    expect(ff).toContain('Poppins');
  });

  test('5b — Typography: Font-size input updates canvas fontSize', async ({ page }) => {
    await expandSection(page, 'Typography');
    const content = await getSectionContent(page, 'Typography');

    // Font-size CInput has label "px"
    const sizeInput = content.locator('input[placeholder="16"]');
    await sizeInput.fill('28px');
    await sizeInput.press('Tab');
    await page.waitForTimeout(200);

    const fs = await getInlineStyle(page, 'fontSize');
    expect(fs).toBe('28px');
  });

  test('5c — Typography: Bold toggle updates fontWeight', async ({ page }) => {
    await expandSection(page, 'Typography');
    const content = await getSectionContent(page, 'Typography');

    // Bold icon button has title="Bold"
    const boldBtn = content.locator('button[title="Bold"]');
    await boldBtn.click();
    await page.waitForTimeout(200);

    const fw = await getInlineStyle(page, 'fontWeight');
    expect(fw).toBe('700');
  });

  test('5d — Typography: Text-align center updates canvas', async ({ page }) => {
    await expandSection(page, 'Typography');
    const content = await getSectionContent(page, 'Typography');

    const centerBtn = content.locator('button[title="Center"]');
    await centerBtn.click();
    await page.waitForTimeout(200);

    const ta = await getInlineStyle(page, 'textAlign');
    expect(ta).toBe('center');
  });

  test('5e — Typography: Text colour CColor updates canvas color', async ({ page }) => {
    await expandSection(page, 'Typography');
    const content = await getSectionContent(page, 'Typography');

    const colorInput = content.locator('input[placeholder="transparent"]').first();
    await colorInput.fill('#ef4444');
    await colorInput.press('Tab');
    await page.waitForTimeout(200);

    const c = await getInlineStyle(page, 'color');
    expect(c).toMatch(/rgb\(239,\s*68,\s*68\)|#ef4444/i);
  });

  // ── 6. Border section ────────────────────────────────────────────────────

  test('6 — Border: borderWidth input updates canvas', async ({ page }) => {
    await expandSection(page, 'Border');
    const content = await getSectionContent(page, 'Border');

    // borderWidth CInput has label "W" and placeholder "0px"
    const bwInput = content.locator('input[placeholder="0px"]').first();
    await bwInput.fill('3px');
    await bwInput.press('Tab');
    await page.waitForTimeout(200);

    const bw = await getInlineStyle(page, 'borderWidth');
    expect(bw).toBe('3px');
  });

  test('6b — Border: borderRadius input updates canvas', async ({ page }) => {
    await expandSection(page, 'Border');
    const content = await getSectionContent(page, 'Border');

    // borderRadius is the second "0px" placeholder input in non-individual mode
    const brInput = content.locator('input[placeholder="0px"]').nth(1);
    await brInput.fill('12px');
    await brInput.press('Tab');
    await page.waitForTimeout(200);

    const br = await getInlineStyle(page, 'borderRadius');
    expect(br).toBe('12px');
  });

  test('6c — Border: colour CColor text input updates borderColor', async ({ page }) => {
    await expandSection(page, 'Border');
    const content = await getSectionContent(page, 'Border');

    const borderColorInput = content.locator('input[placeholder="transparent"]').first();
    await borderColorInput.fill('#8b5cf6');
    await borderColorInput.press('Tab');
    await page.waitForTimeout(200);

    const bc = await getInlineStyle(page, 'borderColor');
    expect(bc).toMatch(/rgb\(139,\s*92,\s*246\)|#8b5cf6/i);
  });

  // ── 7. Shadow section ────────────────────────────────────────────────────

  test('7 — Shadow: Medium preset applies boxShadow to canvas', async ({ page }) => {
    await expandSection(page, 'Shadow');
    const content = await getSectionContent(page, 'Shadow');

    await content.getByRole('button', { name: 'Medium' }).click();
    await page.waitForTimeout(200);

    const bs = await getInlineStyle(page, 'boxShadow');
    expect(bs).toBeTruthy();
    expect(bs).not.toBe('none');
    expect(bs).toMatch(/rgba/);
  });

  test('7b — Shadow: Clear button removes boxShadow', async ({ page }) => {
    await expandSection(page, 'Shadow');
    const content = await getSectionContent(page, 'Shadow');

    // Apply first
    await content.getByRole('button', { name: 'Medium' }).click();
    await page.waitForTimeout(150);

    // Clear
    const clearBtn = content.getByRole('button', { name: 'Clear' });
    await clearBtn.click();
    await page.waitForTimeout(200);

    const bs = await getInlineStyle(page, 'boxShadow');
    expect(bs === '' || bs === 'none').toBeTruthy();
  });

  test('7c — Shadow: Custom X/Y/Blur inputs build correct boxShadow', async ({ page }) => {
    await expandSection(page, 'Shadow');
    const content = await getSectionContent(page, 'Shadow');

    const xInput  = content.locator('input[placeholder="0px"]').nth(0);
    const yInput  = content.locator('input[placeholder="4px"]');
    const blInput = content.locator('input[placeholder="12px"]');

    await xInput.fill('2px');  await xInput.press('Tab');
    await yInput.fill('6px');  await yInput.press('Tab');
    await blInput.fill('10px'); await blInput.press('Tab');
    await page.waitForTimeout(200);

    const bs = await getInlineStyle(page, 'boxShadow');
    expect(bs).toContain('2px');
    expect(bs).toContain('6px');
    expect(bs).toContain('10px');
  });

  // ── 8. Appearance section ────────────────────────────────────────────────

  test('8 — Appearance: Visibility → hidden updates canvas', async ({ page }) => {
    await expandSection(page, 'Appearance');
    const content = await getSectionContent(page, 'Appearance');

    // Visibility select has options: visible | hidden | collapse
    // Find by looking for the select that contains the option value="hidden"
    const visSelect = content.locator('select').filter({ has: content.locator('option[value="hidden"]') });
    await visSelect.selectOption('hidden');
    await page.waitForTimeout(200);

    const finalVis = await getInlineStyle(page, 'visibility');
    expect(finalVis).toBe('hidden');
  });

  test('8b — Appearance: Opacity input updates canvas', async ({ page }) => {
    await expandSection(page, 'Appearance');
    const content = await getSectionContent(page, 'Appearance');

    const opInput = content.locator('input[placeholder="1"]').first();
    await opInput.fill('0.6');
    await opInput.press('Tab');
    await page.waitForTimeout(200);

    const op = await getInlineStyle(page, 'opacity');
    expect(op).toBe('0.6');
  });

  // ── 9. Transform section ─────────────────────────────────────────────────

  test('9 — Transform: Rotate input builds transform CSS', async ({ page }) => {
    await expandSection(page, 'Transform');
    const content = await getSectionContent(page, 'Transform');

    const rotInput = content.locator('input[placeholder="0deg"]').first();
    await rotInput.fill('15deg');
    await rotInput.press('Tab');
    await page.waitForTimeout(200);

    const transform = await getInlineStyle(page, 'transform');
    expect(transform).toContain('15deg');
  });

  // ── 10. Filters section ──────────────────────────────────────────────────

  test('10 — Filters: Blur slider updates filter CSS', async ({ page }) => {
    await expandSection(page, 'Filters');
    const content = await getSectionContent(page, 'Filters');

    // First range input is the Blur slider
    const blurSlider = content.locator('input[type="range"]').first();
    await expect(blurSlider).toBeVisible();

    // Set blur to 5 using evaluate (range inputs can be tricky with fill)
    await blurSlider.evaluate((el) => {
      (el as HTMLInputElement).value = '5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    const filter = await getInlineStyle(page, 'filter');
    expect(filter).toContain('blur(5px)');
  });

  // ── 11. Animation section ────────────────────────────────────────────────

  test('11 — Animation: Entrance select stores --nx-entrance custom prop', async ({ page }) => {
    await expandSection(page, 'Animation');
    const content = await getSectionContent(page, 'Animation');

    const entranceSelect = content.locator('select').first();
    await entranceSelect.selectOption('fade-in');
    await page.waitForTimeout(200);

    // The --nx-entrance is stored as a CSS custom property on the canvas node
    const entranceVal = await page.locator(`[data-node-id="${TEST_NODE_ID}"]`).evaluate((el) => {
      return (el as HTMLElement).style.getPropertyValue('--nx-entrance');
    });
    expect(entranceVal).toBe('fade-in');
  });

  // ── 12. Advanced tab ─────────────────────────────────────────────────────

  test('12 — Advanced tab: Custom Label saves to node', async ({ page }) => {
    await page.locator('[data-testid="element-tab-advanced"]').click();
    await page.waitForTimeout(150);

    const labelInput = page.locator('input[placeholder]').filter({ has: page.locator(':text("Test Heading")') });
    // The label input contains the current node.label value
    // We can find it by placeholder matching the node type
    const advPanel = page.locator('[data-testid="right-panel"]');
    const inputs = advPanel.locator('input.inspector-input').first();
    await inputs.fill('My Custom Label');
    await inputs.press('Tab');
    await page.waitForTimeout(200);

    // The heading element in layers panel / node header should update
    const nodeHeader = page.locator('[data-testid="right-panel"]').locator('p').first();
    await expect(nodeHeader).toContainText('My Custom Label');
  });

  // ── 13. Persistence test ─────────────────────────────────────────────────

  test('13 — Styles persist across page reload', async ({ page }) => {
    // Apply several styles
    const layoutContent = await getSectionContent(page, 'Layout');
    await layoutContent.locator('select').first().selectOption('flex');
    await page.waitForTimeout(150);

    await expandSection(page, 'Spacing');
    const spacingContent = await getSectionContent(page, 'Spacing');
    const wInput = spacingContent.locator('input[type="text"]').first();
    await wInput.fill('400px');
    await wInput.press('Tab');
    await page.waitForTimeout(400); // let auto-save write to localStorage

    // Reload the page
    await page.reload();
    await expect(page.locator('[data-testid="builder-shell"]')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);

    // The canvas node should have persisted styles
    const displayAfter = await getInlineStyle(page, 'display');
    const widthAfter   = await getInlineStyle(page, 'width');

    expect(displayAfter).toBe('flex');
    expect(widthAfter).toBe('400px');
  });

  // ── 14. Deselect clears panel ────────────────────────────────────────────

  test('14 — Deselecting node switches panel to Page view', async ({ page }) => {
    const panel = page.locator('[data-testid="right-panel"]');

    // Click "Deselect" in the panel header
    await panel.getByRole('button', { name: /deselect/i }).click();
    await page.waitForTimeout(200);

    // Panel should now show "Page" header (no element selected)
    await expect(panel.getByText('Page')).toBeVisible();
    // Element tabs gone
    await expect(page.locator('[data-testid="element-tab-style"]')).not.toBeVisible();
  });

  // ── 15. Breakpoint: Style overrides per breakpoint ───────────────────────

  test('15 — Breakpoint: Tablet override does not pollute base', async ({ page }) => {
    // Set a base style
    const layoutContent = await getSectionContent(page, 'Layout');
    await layoutContent.locator('select').first().selectOption('flex');
    await page.waitForTimeout(150);

    // Switch to Tablet breakpoint (TopBar breakpoint switcher)
    const tabletBtn = page.locator('[title="Tablet"]').or(page.getByRole('button', { name: /tablet/i })).first();
    if (await tabletBtn.count() > 0) {
      await tabletBtn.click();
      await page.waitForTimeout(150);
    }

    // Apply a tablet-specific override: grid
    await page.locator('[data-testid="element-tab-style"]').click();
    const layoutContent2 = await getSectionContent(page, 'Layout');
    await layoutContent2.locator('select').first().selectOption('grid');
    await page.waitForTimeout(200);

    // Switch back to desktop — canvas should still show flex
    const desktopBtn = page.locator('[title="Desktop"]').or(page.getByRole('button', { name: /desktop/i })).first();
    if (await desktopBtn.count() > 0) {
      await desktopBtn.click();
      await page.waitForTimeout(200);
    }

    const desktopDisplay = await getInlineStyle(page, 'display');
    expect(desktopDisplay).toBe('flex');
  });
});
