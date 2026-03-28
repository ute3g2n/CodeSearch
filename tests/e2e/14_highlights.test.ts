// E2E シナリオ14: ハイライトワード
// カバー: T-07-01
import { test, expect } from "./fixtures";

test.describe("ハイライトワード", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-search"]');
    // ハイライトセクションを展開する（折りたたまれているため）
    await page.click('text=ハイライト');
  });

  // T-07-01: HIGHLIGHTS セクション表示
  test("検索サイドバーに HIGHLIGHTS セクションが表示されること (T-07-01)", async ({ page }) => {
    await expect(page.locator('[data-testid="highlight-section"]')).toBeVisible({ timeout: 3_000 });
  });

  test("HIGHLIGHTS セクションのヘッダテキストが表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="highlight-section"]')).toContainText("ハイライト");
  });

  test("初期状態でハイライトアイテムが0件であること", async ({ page }) => {
    await expect(page.locator('[data-testid="highlight-item"]')).toHaveCount(0);
  });
});
