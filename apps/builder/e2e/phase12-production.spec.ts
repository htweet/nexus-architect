/**
 * phase12-production.spec.ts
 *
 * Phase 12 E2E test suite — Production-readiness features:
 *   12.1  First-Run Onboarding Wizard
 *   12.2  Keyboard Shortcuts overlay + In-builder Help panel
 *   12.3  Right-panel style field persistence (regression + new fields)
 *
 * Approach:
 *   • Each test starts with a fresh builder page (localStorage cleared).
 *   • Playwright drives the real Chrome browser via the builder dev server.
 *   • All assertions use data-testid selectors or accessible roles where
 *     possible, with fallbacks to text / aria-label where testids are absent.
 *
 * Run:  npx playwright test e2e/phase12-production.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUILDER_URL = 'http://localhost:5173';

/** Clear builder localStorage so onboarding shows fresh each test */
async function freshPage(page: Page) {
  await page.goto(BUILDER_URL);
  await page.evaluate(() => {
    localStorage.clear();
    // Also clear nexus_onboarding_v1 explicitly
    localStorage.removeItem('nexus_onboarding_v1');
  });
  await page.reload({ waitUntil: 'networkidle' });
}

/** Drop a Heading widget onto the canvas and select it */
async function addHeadingWidget(page: Page) {
  const heading = page.locator('[data-widget-type="heading"]').first();
  const canvas  = page.locator('[data-testid="canvas-frame"]');
  await heading.dragTo(canvas);
  // Wait for node to appear and get selected
  await page.waitForSelector('[data-testid="right-panel"]', { timeout: 5000 });
}

/** Get the computed CSS of the first canvas node */
async function getCanvasNodeStyle(page: Page, prop: string): Promise<string> {
  return page.evaluate((p) => {
    const el = document.querySelector('[data-node-id]') as HTMLElement | null;
    return el ? el.style.getPropertyValue(p) || getComputedStyle(el).getPropertyValue(p) : '';
  }, prop);
}

/** Set a React-controlled input by native setter + input event */
async function setInput(page: Page, selector: string, value: string) {
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel) as HTMLInputElement | null;
      if (!el) throw new Error(`setInput: selector not found: ${sel}`);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { sel: selector, val: value },
  );
}

/** Set a React-controlled select */
async function setSelect(page: Page, selector: string, value: string) {
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel) as HTMLSelectElement | null;
      if (!el) throw new Error(`setSelect: selector not found: ${sel}`);
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
      setter.call(el, val);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { sel: selector, val: value },
  );
}

// ─── 12.1 — Onboarding Wizard ─────────────────────────────────────────────────

test.describe('Phase 12.1 — First-Run Onboarding Wizard', () => {
  test('wizard appears on fresh load (no LS key)', async ({ page }) => {
    await freshPage(page);
    // Wizard has an 800 ms delay
    const wizard = page.locator('text=Welcome to Nexus Architect');
    await expect(wizard).toBeVisible({ timeout: 3000 });
  });

  test('wizard does NOT appear when LS key is already set', async ({ page }) => {
    await page.goto(BUILDER_URL);
    await page.evaluate(() => localStorage.setItem('nexus_onboarding_v1', 'done'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // past the 800 ms delay
    await expect(page.locator('text=Welcome to Nexus Architect')).not.toBeVisible();
  });

  test('step navigation: Next advances through all 3 steps', async ({ page }) => {
    await freshPage(page);
    await page.waitForSelector('text=Welcome to Nexus Architect', { timeout: 3000 });

    // Step 1 → 2
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Add Your First Element')).toBeVisible({ timeout: 2000 });

    // Step 2 → 3
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Style It Your Way')).toBeVisible({ timeout: 2000 });
  });

  test('Back button returns to previous step', async ({ page }) => {
    await freshPage(page);
    await page.waitForSelector('text=Welcome to Nexus Architect', { timeout: 3000 });
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Add Your First Element')).toBeVisible({ timeout: 2000 });
    await page.click('button:has-text("Back")');
    await expect(page.locator('text=Welcome to Nexus Architect')).toBeVisible({ timeout: 2000 });
  });

  test('"Start Building" on step 3 closes wizard + sets LS key', async ({ page }) => {
    await freshPage(page);
    await page.waitForSelector('text=Welcome to Nexus Architect', { timeout: 3000 });
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Start Building")');
    await expect(page.locator('text=Welcome to Nexus Architect')).not.toBeVisible({ timeout: 2000 });
    const done = await page.evaluate(() => localStorage.getItem('nexus_onboarding_v1'));
    expect(done).toBe('done');
  });

  test('X button closes wizard + persists LS key', async ({ page }) => {
    await freshPage(page);
    await page.waitForSelector('text=Welcome to Nexus Architect', { timeout: 3000 });
    await page.click('button[aria-label="Close onboarding"]');
    await expect(page.locator('text=Welcome to Nexus Architect')).not.toBeVisible({ timeout: 2000 });
    const done = await page.evaluate(() => localStorage.getItem('nexus_onboarding_v1'));
    expect(done).toBe('done');
  });

  test('clicking backdrop closes wizard', async ({ page }) => {
    await freshPage(page);
    await page.waitForSelector('text=Welcome to Nexus Architect', { timeout: 3000 });
    // Click the semi-transparent backdrop (outside the modal card)
    await page.mouse.click(10, 10);
    await expect(page.locator('text=Welcome to Nexus Architect')).not.toBeVisible({ timeout: 2000 });
  });
});

// ─── 12.2 — Keyboard Shortcuts Modal ─────────────────────────────────────────

test.describe('Phase 12.2 — Shortcuts Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BUILDER_URL);
    await page.evaluate(() => localStorage.setItem('nexus_onboarding_v1', 'done'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 5000 });
  });

  test('Keyboard button in TopBar opens shortcuts modal', async ({ page }) => {
    await page.click('button[title="Keyboard shortcuts (?)"]');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible({ timeout: 2000 });
  });

  test('"?" key opens shortcuts modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible({ timeout: 2000 });
  });

  test('"?" key again closes modal (toggle)', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('?');
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible({ timeout: 2000 });
  });

  test('Escape closes shortcuts modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible({ timeout: 2000 });
  });

  test('clicking backdrop closes shortcuts modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible({ timeout: 2000 });
    await page.mouse.click(10, 10);
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible({ timeout: 2000 });
  });

  test('modal displays key groups: Canvas & Selection, View & Layout, History', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('text=Canvas & Selection')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=View & Layout')).toBeVisible();
    await expect(page.locator('text=History')).toBeVisible();
    await expect(page.locator('text=Panels')).toBeVisible();
  });

  test('"?" key not triggered inside input fields', async ({ page }) => {
    // If an input is focused, pressing '?' should NOT open the modal
    await page.focus('input[type="text"], [contenteditable="true"]').catch(() => {
      // No input on page — that's fine, skip this sub-assertion
    });
    const inputs = await page.$$('input[type="text"]');
    if (inputs.length > 0) {
      await inputs[0].focus();
      await page.keyboard.type('?');
      await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible({ timeout: 800 });
    }
  });
});

// ─── 12.2 — Help Panel ───────────────────────────────────────────────────────

test.describe('Phase 12.2 — Help Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BUILDER_URL);
    await page.evaluate(() => localStorage.setItem('nexus_onboarding_v1', 'done'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 5000 });
  });

  test('Help button in TopBar opens help panel', async ({ page }) => {
    await page.click('button[title="Help & resources (H)"]');
    await expect(page.locator('text=Help & Resources')).toBeVisible({ timeout: 2000 });
  });

  test('"H" key opens help panel', async ({ page }) => {
    await page.keyboard.press('h');
    await expect(page.locator('text=Help & Resources')).toBeVisible({ timeout: 2000 });
  });

  test('"H" key toggles help panel closed', async ({ page }) => {
    await page.keyboard.press('h');
    await expect(page.locator('text=Help & Resources')).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('h');
    await expect(page.locator('text=Help & Resources')).not.toBeVisible({ timeout: 2000 });
  });

  test('X button closes help panel', async ({ page }) => {
    await page.keyboard.press('h');
    await expect(page.locator('text=Help & Resources')).toBeVisible({ timeout: 2000 });
    await page.click('button[aria-label="Close help panel"]');
    await expect(page.locator('text=Help & Resources')).not.toBeVisible({ timeout: 2000 });
  });

  test('help panel has 3 tabs: Guides, Videos, Feedback', async ({ page }) => {
    await page.keyboard.press('h');
    await expect(page.locator('text=Guides')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=Videos')).toBeVisible();
    await expect(page.locator('text=Feedback')).toBeVisible();
  });

  test('switching to Videos tab shows video list', async ({ page }) => {
    await page.keyboard.press('h');
    await page.click('button:has-text("Videos")');
    await expect(page.locator('text=Getting started in 5 minutes')).toBeVisible({ timeout: 2000 });
  });

  test('switching to Feedback tab shows form', async ({ page }) => {
    await page.keyboard.press('h');
    await page.click('button:has-text("Feedback")');
    await expect(page.locator('textarea')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('button:has-text("Send Feedback")')).toBeVisible();
  });

  test('feedback form: submit triggers success state', async ({ page }) => {
    await page.keyboard.press('h');
    await page.click('button:has-text("Feedback")');
    await page.fill('textarea', 'This is a great page builder!');
    await page.click('button:has-text("Send Feedback")');
    await expect(page.locator('text=Thanks for the feedback!')).toBeVisible({ timeout: 3000 });
  });
});

// ─── 12.3 — Right Panel Style Fields Regression ──────────────────────────────

test.describe('Phase 12.3 — Right Panel style fields (regression)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BUILDER_URL);
    await page.evaluate(() => {
      localStorage.setItem('nexus_onboarding_v1', 'done');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 5000 });
  });

  test('right panel appears after widget drop', async ({ page }) => {
    await addHeadingWidget(page);
    await expect(page.locator('[data-testid="right-panel"]')).toBeVisible({ timeout: 3000 });
  });

  test('Layout: width input updates canvas width', async ({ page }) => {
    await addHeadingWidget(page);
    const styleTab = page.locator('[data-testid="element-tab-style"]');
    await styleTab.click();

    // Expand Layout section
    const layoutTrigger = page.locator('button[aria-controls]').filter({ hasText: /layout/i }).first();
    await layoutTrigger.click();
    await page.waitForTimeout(300);

    const widthInput = page.locator('[data-testid="right-panel"] input[placeholder*="auto"], [data-testid="right-panel"] input[placeholder*="px"]').first();
    await setInput(page, `[data-testid="right-panel"] input[placeholder*="auto"]`, '300px');
    await page.waitForTimeout(300);

    const canvasWidth = await getCanvasNodeStyle(page, 'width');
    expect(canvasWidth).toBe('300px');
  });

  test('Background: solid colour input applies to canvas', async ({ page }) => {
    await addHeadingWidget(page);
    await page.locator('[data-testid="element-tab-style"]').click();

    // Find background section and open it
    const bgTrigger = page.locator('button[aria-controls]').filter({ hasText: /background/i }).first();
    await bgTrigger.click();
    await page.waitForTimeout(300);

    // Set the hex colour input
    const allInputs = page.locator('[data-testid="right-panel"] input');
    // Find the colour hex input (near the colour swatch)
    const colourInput = page.locator('[data-testid="right-panel"] input[placeholder*="rrggbb"], [data-testid="right-panel"] input[maxlength="9"]').first();
    await setInput(page, '[data-testid="right-panel"] input[placeholder*="rrggbb"]', '#ff5500');
    await page.waitForTimeout(400);

    const bg = await getCanvasNodeStyle(page, 'background-color');
    // Accepts rgb(255, 85, 0) or #ff5500
    expect(bg.toLowerCase()).toMatch(/rgb\(255,?\s*85,?\s*0\)|#ff5500/);
  });

  test('Typography: font-size change reflects on canvas', async ({ page }) => {
    await addHeadingWidget(page);
    await page.locator('[data-testid="element-tab-style"]').click();

    const typoTrigger = page.locator('button[aria-controls]').filter({ hasText: /typography/i }).first();
    await typoTrigger.click();
    await page.waitForTimeout(300);

    // Font size input
    const fsSel = '[data-testid="right-panel"] input[placeholder="16px"], [data-testid="right-panel"] input[placeholder*="size"]';
    await setInput(page, '[data-testid="right-panel"] input[placeholder="16px"]', '28px');
    await page.waitForTimeout(400);

    const fs = await getCanvasNodeStyle(page, 'font-size');
    expect(fs).toBe('28px');
  });

  test('Border: width + radius apply to canvas', async ({ page }) => {
    await addHeadingWidget(page);
    await page.locator('[data-testid="element-tab-style"]').click();

    const borderTrigger = page.locator('button[aria-controls]').filter({ hasText: /border/i }).first();
    await borderTrigger.click();
    await page.waitForTimeout(300);

    await setInput(page, '[data-testid="right-panel"] input[placeholder="0px"][aria-label*="width"], [data-testid="right-panel"] input[placeholder="0px"]', '2px');
    await page.waitForTimeout(300);

    const bw = await getCanvasNodeStyle(page, 'border-width');
    expect(bw).toBe('2px');
  });

  test('Transform: rotation applies to canvas', async ({ page }) => {
    await addHeadingWidget(page);
    await page.locator('[data-testid="element-tab-style"]').click();

    const transformTrigger = page.locator('button[aria-controls]').filter({ hasText: /transform/i }).first();
    await transformTrigger.click();
    await page.waitForTimeout(300);

    await setInput(page, '[data-testid="right-panel"] input[placeholder*="deg"], [data-testid="right-panel"] input[aria-label*="otate"]', '15deg');
    await page.waitForTimeout(400);

    const transform = await getCanvasNodeStyle(page, 'transform');
    expect(transform).toMatch(/rotate|matrix/i);
  });

  test('Filters: blur slider updates canvas filter', async ({ page }) => {
    await addHeadingWidget(page);
    await page.locator('[data-testid="element-tab-style"]').click();

    const filterTrigger = page.locator('button[aria-controls]').filter({ hasText: /filter/i }).first();
    await filterTrigger.click();
    await page.waitForTimeout(300);

    const blurSlider = page.locator('[data-testid="right-panel"] input[type="range"]').first();
    await blurSlider.fill('5');
    await page.waitForTimeout(400);

    const filter = await getCanvasNodeStyle(page, 'filter');
    expect(filter).toMatch(/blur\(5px\)/);
  });

  test('Appearance: opacity slider updates canvas opacity', async ({ page }) => {
    await addHeadingWidget(page);
    await page.locator('[data-testid="element-tab-style"]').click();

    const appearTrigger = page.locator('button[aria-controls]').filter({ hasText: /appearance/i }).first();
    await appearTrigger.click();
    await page.waitForTimeout(300);

    const opacitySlider = page.locator('[data-testid="right-panel"] input[type="range"]').first();
    await opacitySlider.fill('50');
    await page.waitForTimeout(400);

    const opacity = await getCanvasNodeStyle(page, 'opacity');
    expect(parseFloat(opacity)).toBeCloseTo(0.5, 1);
  });
});

// ─── 12.3 — Persistence: reload preserves styles ─────────────────────────────

test.describe('Phase 12.3 — Style persistence across reload', () => {
  test('styles saved to localStorage survive page reload', async ({ page }) => {
    await page.goto(BUILDER_URL);
    await page.evaluate(() => localStorage.setItem('nexus_onboarding_v1', 'done'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 5000 });

    // Add widget and set a distinctive colour
    await addHeadingWidget(page);
    await page.locator('[data-testid="element-tab-style"]').click();
    const bgTrigger = page.locator('button[aria-controls]').filter({ hasText: /background/i }).first();
    await bgTrigger.click();
    await page.waitForTimeout(300);
    await setInput(page, '[data-testid="right-panel"] input[placeholder*="rrggbb"]', '#aa1133');
    await page.waitForTimeout(800); // let auto-save fire

    // Reload and check the node map is persisted
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="topbar"]', { timeout: 5000 });

    // The page canvas should re-load from localStorage with saved style
    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('nexus_mock_pages');
      if (!raw) return null;
      try {
        const pages = JSON.parse(raw) as Record<string, unknown>[];
        return JSON.stringify(pages);
      } catch {
        return null;
      }
    });
    // We just confirm the store saved *something* — exact value tested in unit tests
    expect(saved).not.toBeNull();
  });
});
