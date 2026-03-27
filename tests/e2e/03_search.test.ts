// E2E シナリオ3: 全文検索
import { test, expect } from "@playwright/test";

test.describe("全文検索", () => {
  test("検索サイドバーに切り替えられること", async ({ page }) => {
    await page.click('[data-testid="activity-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test("検索クエリを入力して結果が表示されること", async ({ page }) => {
    await page.click('[data-testid="activity-search"]');
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("function");
    await input.press("Enter");

    // 検索中またはエラーなしで結果エリアが表示される
    await expect(
      page.locator('[data-testid="search-results"], [data-testid="search-empty"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("大文字小文字区別トグルが動作すること", async ({ page }) => {
    await page.click('[data-testid="activity-search"]');
    const toggleBtn = page.locator('[data-testid="toggle-case-sensitive"]');
    await expect(toggleBtn).toBeVisible();
    // 1回クリックでON
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
    // もう1回クリックでOFF
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
  });
});
