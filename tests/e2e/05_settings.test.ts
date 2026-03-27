// E2E シナリオ5: 設定画面
import { test, expect } from "@playwright/test";

test.describe("設定画面", () => {
  test("設定パネルを開けること", async ({ page }) => {
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
  });

  test("言語を英語に切り替えられること", async ({ page }) => {
    await page.click('[data-testid="activity-settings"]');
    const langSelect = page.locator('[data-testid="language-select"]');
    await langSelect.selectOption("en");
    // 保存ボタンをクリック
    await page.click('[data-testid="settings-save-btn"]');
    // 「Saved」メッセージが表示される
    await expect(page.locator('[data-testid="settings-save-btn"]')).toContainText("Saved", {
      timeout: 3_000,
    });
    // 日本語に戻す
    await langSelect.selectOption("ja");
    await page.click('[data-testid="settings-save-btn"]');
  });

  test("フォントサイズを変更して保存できること", async ({ page }) => {
    await page.click('[data-testid="activity-settings"]');
    const fontSizeInput = page.locator('[data-testid="editor-font-size"]');
    await fontSizeInput.fill("16");
    await page.click('[data-testid="settings-save-btn"]');
    await expect(page.locator('[data-testid="settings-save-btn"]')).toContainText("Saved", {
      timeout: 3_000,
    });
    // 元に戻す
    await fontSizeInput.fill("14");
    await page.click('[data-testid="settings-save-btn"]');
  });
});
