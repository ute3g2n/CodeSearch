// E2E シナリオ7: キーボードショートカット
import { test, expect } from "./fixtures";

test.describe("キーボードショートカット", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Ctrl+Shift+F で検索サイドバーにフォーカスが移動すること", async ({ page }) => {
    await page.keyboard.press("Control+Shift+F");
    // 検索パネルが表示され入力欄が見える
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible({
      timeout: 3_000,
    });
  });

  test("Ctrl+P でクイックオープンが表示されること", async ({ page }) => {
    await page.keyboard.press("Control+p");
    await expect(page.locator('[data-testid="quick-open"]')).toBeVisible({
      timeout: 3_000,
    });
  });

  test("Ctrl+P 後に Escape でクイックオープンが閉じること", async ({ page }) => {
    await page.keyboard.press("Control+p");
    await expect(page.locator('[data-testid="quick-open"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="quick-open"]')).not.toBeVisible();
  });

  test("Ctrl+W でアクティブタブが閉じること", async ({ page }) => {
    // ウェルカムタブが1枚あることを確認
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(1);
    await page.keyboard.press("Control+w");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(0);
  });
});
