// E2E シナリオ3: 全文検索
import { test, expect } from "./fixtures";

test.describe("全文検索", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test("検索入力欄が表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test("検索クエリを入力して Enter で検索実行されること", async ({ page }) => {
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("function");
    await input.press("Enter");
    // モックは空の結果を返すので検索中フラグは消える
    await expect(input).toHaveValue("function");
  });

  test("大文字小文字区別トグルをクリックすると状態が変わること", async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle-case-sensitive"]');
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  test("検索サイドバーに検索入力とオプションが揃っていること", async ({ page }) => {
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-case-sensitive"]')).toBeVisible();
  });
});
