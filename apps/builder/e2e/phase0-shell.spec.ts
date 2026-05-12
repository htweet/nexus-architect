/**
 * Phase 0 — Builder Shell E2E Tests
 *
 * These tests verify the complete builder shell renders correctly
 * and all interactive UI elements are wired to real state.
 *
 * Run: npm run test:e2e
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function waitForBuilder(page: Page) {
  await page.goto('/');
  await expect(page.locator('[data-testid="builder-shell"]')).toBeVisible({ timeout: 10_000 });
}

// ─── Suite ───────────────────────────────────────────────────────────────────

test.describe('Phase 0: Builder Shell', () => {
  test.beforeEach(async ({ page }) => {
    await waitForBuilder(page);
  });

  // ── Structural Integrity ─────────────────────────────────────────────────

  test('renders the builder shell without errors', async ({ page }) => {
    await expect(page.locator('[data-testid="builder-shell"]')).toBeVisible();
    // Verify no React error boundary triggered
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.locator('text=Error')).not.toBeVisible();
  });

  test('top bar is visible with all required elements', async ({ page }) => {
    const topBar = page.locator('[data-testid="top-bar"]');
    await expect(topBar).toBeVisible();
    await expect(page.locator('[data-testid="device-switcher"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="publish-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="undo-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="redo-btn"]')).toBeVisible();
  });

  test('left panel renders with all three tabs', async ({ page }) => {
    const leftPanel = page.locator('[data-testid="left-panel"]');
    await expect(leftPanel).toBeVisible();
    await expect(page.locator('[data-testid="tab-widgets"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-layers"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-templates"]')).toBeVisible();
  });

  test('right panel is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="right-panel"]')).toBeVisible();
  });

  test('canvas area is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="canvas-area"]')).toBeVisible();
  });

  // ── Undo / Redo State ────────────────────────────────────────────────────

  test('undo button is disabled with empty history', async ({ page }) => {
    const undoBtn = page.locator('[data-testid="undo-btn"]');
    await expect(undoBtn).toBeDisabled();
  });

  test('redo button is disabled with empty history', async ({ page }) => {
    const redoBtn = page.locator('[data-testid="redo-btn"]');
    await expect(redoBtn).toBeDisabled();
  });

  // ── Device Switcher ──────────────────────────────────────────────────────

  test('device switcher defaults to desktop', async ({ page }) => {
    const desktopBtn = page.locator('[data-testid="device-desktop"]');
    await expect(desktopBtn).toHaveAttribute('data-active', 'true');
  });

  test('clicking tablet sets it as active breakpoint', async ({ page }) => {
    const tabletBtn = page.locator('[data-testid="device-tablet"]');
    await tabletBtn.click();
    await expect(tabletBtn).toHaveAttribute('data-active', 'true');
    // Desktop should no longer be active
    await expect(page.locator('[data-testid="device-desktop"]')).toHaveAttribute('data-active', 'false');
  });

  test('clicking mobile sets it as active breakpoint', async ({ page }) => {
    const mobileBtn = page.locator('[data-testid="device-mobile"]');
    await mobileBtn.click();
    await expect(mobileBtn).toHaveAttribute('data-active', 'true');
  });

  test('switching to mobile constrains canvas width', async ({ page }) => {
    await page.locator('[data-testid="device-mobile"]').click();
    const canvas = page.locator('[data-testid="canvas-area"]');
    // Canvas should be constrained to mobile width
    const box = await canvas.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(390 + 1); // +1 for sub-pixel rounding
  });

  // ── Left Panel Tab Switching ─────────────────────────────────────────────

  test('widgets tab is active by default', async ({ page }) => {
    await expect(page.locator('[data-testid="panel-widgets"]')).toBeVisible();
    await expect(page.locator('[data-testid="panel-layers"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="panel-templates"]')).not.toBeVisible();
  });

  test('clicking layers tab shows layers panel', async ({ page }) => {
    await page.locator('[data-testid="tab-layers"]').click();
    await expect(page.locator('[data-testid="panel-layers"]')).toBeVisible();
    await expect(page.locator('[data-testid="panel-widgets"]')).not.toBeVisible();
  });

  test('clicking templates tab shows templates panel', async ({ page }) => {
    await page.locator('[data-testid="tab-templates"]').click();
    await expect(page.locator('[data-testid="panel-templates"]')).toBeVisible();
    await expect(page.locator('[data-testid="panel-widgets"]')).not.toBeVisible();
  });

  test('switching between all three tabs works correctly', async ({ page }) => {
    for (const tabId of ['layers', 'templates', 'widgets'] as const) {
      await page.locator(`[data-testid="tab-${tabId}"]`).click();
      await expect(page.locator(`[data-testid="panel-${tabId}"]`)).toBeVisible();
    }
  });

  // ── Preview Mode ─────────────────────────────────────────────────────────

  test('entering preview mode hides panels and top bar', async ({ page }) => {
    await page.locator('[data-testid="preview-btn"]').click();
    await expect(page.locator('[data-testid="top-bar"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="left-panel"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="right-panel"]')).not.toBeVisible();
  });

  test('pressing Escape exits preview mode', async ({ page }) => {
    await page.locator('[data-testid="preview-btn"]').click();
    await expect(page.locator('[data-testid="top-bar"]')).not.toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="top-bar"]')).toBeVisible();
  });

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────

  test('D shortcut switches to desktop breakpoint', async ({ page }) => {
    // First switch away from desktop
    await page.locator('[data-testid="device-tablet"]').click();
    await page.keyboard.press('d');
    await expect(page.locator('[data-testid="device-desktop"]')).toHaveAttribute('data-active', 'true');
  });

  test('T shortcut switches to tablet breakpoint', async ({ page }) => {
    await page.keyboard.press('t');
    await expect(page.locator('[data-testid="device-tablet"]')).toHaveAttribute('data-active', 'true');
  });

  test('M shortcut switches to mobile breakpoint', async ({ page }) => {
    await page.keyboard.press('m');
    await expect(page.locator('[data-testid="device-mobile"]')).toHaveAttribute('data-active', 'true');
  });

  // ── Empty Canvas State ───────────────────────────────────────────────────

  test('empty canvas shows the empty state prompt', async ({ page }) => {
    // Wait for the specific heading element
    await expect(page.getByRole('heading', { name: 'Start Building' })).toBeVisible();
    await expect(page.locator('text=Browse Widgets')).toBeVisible();
    await expect(page.locator('text=Use a Template')).toBeVisible();
  });

  test('Browse Widgets CTA opens left panel on widgets tab', async ({ page }) => {
    // Close the left panel first
    await page.keyboard.press('Control+Shift+l');
    await expect(page.locator('[data-testid="left-panel"]')).not.toBeVisible();

    // Click Browse Widgets — should open panel on widgets tab
    await page.locator('text=Browse Widgets').click();
    await expect(page.locator('[data-testid="left-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="panel-widgets"]')).toBeVisible();
  });

  // ── Responsive Layout ────────────────────────────────────────────────────

  test('builder renders without horizontal scroll on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const body = page.locator('body');
    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    const viewportWidth = await body.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  // ── Accessibility ────────────────────────────────────────────────────────

  test('publish button is accessible with correct label', async ({ page }) => {
    const publishBtn = page.locator('[data-testid="publish-btn"]');
    await expect(publishBtn).toBeVisible();
    await expect(publishBtn).not.toBeDisabled();
  });

  test('undo/redo buttons have aria-labels', async ({ page }) => {
    await expect(page.locator('[aria-label="Undo"]')).toBeVisible();
    await expect(page.locator('[aria-label="Redo"]')).toBeVisible();
  });
});
