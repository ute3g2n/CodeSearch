// E2E シナリオ10: 画面分割
// カバー: T-11-01, T-11-02, T-11-06
import { test, expect } from "./fixtures";

test.describe("画面分割", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="tab"]')).toBeVisible();
  });

  // T-11-01: 右クリックメニュー「右に分割」
  test("タブ右クリック「右に分割」でエディタが2グループに分割されること (T-11-01)", async ({ page }) => {
    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(1);

    const tab = page.locator('[data-testid="tab"]').first();
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page.locator('[role="menuitem"]').filter({ hasText: "右に分割" }).click();

    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(2, { timeout: 3_000 });
  });

  // T-11-02: Ctrl+\ でエディタを右に分割
  test("Ctrl+バックスラッシュでエディタが右に分割されること (T-11-02)", async ({ page }) => {
    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(1);
    await page.keyboard.press("Control+\\");
    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(2, { timeout: 3_000 });
  });

  // T-11-06: 3分割以上が可能
  test("エディタを3つ以上のグループに分割できること (T-11-06)", async ({ page }) => {
    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(1);

    // 2分割
    await page.keyboard.press("Control+\\");
    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(2, { timeout: 3_000 });

    // 3分割（2つ目のグループがアクティブなので Ctrl+\ でさらに分割）
    await page.keyboard.press("Control+\\");
    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(3, { timeout: 3_000 });
  });
});
