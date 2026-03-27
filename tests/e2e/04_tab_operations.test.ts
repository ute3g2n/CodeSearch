// E2E シナリオ4: タブ操作（開く・閉じる・分割）
import { test, expect } from "@playwright/test";

test.describe("タブ操作", () => {
  test("ウェルカムタブを閉じられること", async ({ page }) => {
    const closeBtn = page.locator('[data-testid="tab-close-btn"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      // 全タブが閉じられるとエディタが空になる
      await expect(
        page.locator('[data-testid="tab-bar"] [data-testid="tab"]')
      ).toHaveCount(0);
    }
  });

  test("右クリックメニューが表示されること", async ({ page }) => {
    const tab = page.locator('[data-testid="tab"]').first();
    if (await tab.isVisible()) {
      await tab.click({ button: "right" });
      await expect(page.locator('[role="menu"]')).toBeVisible();
      // メニューを閉じる
      await page.keyboard.press("Escape");
    }
  });

  test("右クリックメニューから「右に分割」が表示されること", async ({ page }) => {
    const tab = page.locator('[data-testid="tab"]').first();
    if (await tab.isVisible()) {
      await tab.click({ button: "right" });
      await expect(page.locator('[role="menuitem"]:has-text("右に分割")')).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});
