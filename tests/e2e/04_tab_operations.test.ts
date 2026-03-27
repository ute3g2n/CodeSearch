// E2E シナリオ4: タブ操作（閉じる・右クリックメニュー）
import { test, expect } from "./fixtures";

test.describe("タブ操作", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // ウェルカムタブが存在することを確認
    await expect(page.locator('[data-testid="tab"]')).toBeVisible();
  });

  test("タブが表示されること", async ({ page }) => {
    const tabs = page.locator('[data-testid="tab"]');
    await expect(tabs).toHaveCount(1);
  });

  test("タブのタイトルが「Welcome」であること", async ({ page }) => {
    const tab = page.locator('[data-testid="tab"]').first();
    await expect(tab).toContainText("Welcome");
  });

  test("タブバーが表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="tab-bar"]')).toBeVisible();
  });

  test("タブの閉じるボタンが表示されること", async ({ page }) => {
    const closeBtn = page.locator('[data-testid="tab-close-btn"]').first();
    await expect(closeBtn).toBeVisible();
  });

  test("タブを閉じるとタブが減ること", async ({ page }) => {
    const closeBtn = page.locator('[data-testid="tab-close-btn"]').first();
    await closeBtn.click();
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(0);
  });

  test("タブを右クリックするとコンテキストメニューが表示されること", async ({ page }) => {
    const tab = page.locator('[data-testid="tab"]').first();
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    // ESC で閉じる
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="menu"]')).not.toBeVisible();
  });

  test("コンテキストメニューに「右に分割」が含まれること", async ({ page }) => {
    const tab = page.locator('[data-testid="tab"]').first();
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await expect(page.locator('[role="menuitem"]').filter({ hasText: "右に分割" })).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
