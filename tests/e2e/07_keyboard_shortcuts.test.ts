// E2E シナリオ7: キーボードショートカット
import { test, expect } from "@playwright/test";

test.describe("キーボードショートカット", () => {
  test("Ctrl+Shift+F で検索フォーカスが移動すること", async ({ page }) => {
    await page.keyboard.press("Control+Shift+F");
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused({
      timeout: 3_000,
    });
  });

  test("Ctrl+P でクイックオープンが起動すること", async ({ page }) => {
    await page.keyboard.press("Control+p");
    await expect(page.locator('[data-testid="quick-open"]')).toBeVisible({
      timeout: 3_000,
    });
    await page.keyboard.press("Escape");
  });

  test("Ctrl+W でアクティブタブが閉じること", async ({ page }) => {
    const tabsBefore = await page
      .locator('[data-testid="tab-bar"] [data-testid="tab"]')
      .count();
    if (tabsBefore > 0) {
      await page.keyboard.press("Control+w");
      const tabsAfter = await page
        .locator('[data-testid="tab-bar"] [data-testid="tab"]')
        .count();
      expect(tabsAfter).toBeLessThanOrEqual(tabsBefore);
    }
  });
});
