// E2E シナリオ5: 設定画面
import { test, expect } from "./fixtures";

test.describe("設定画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
  });

  test("設定パネルが開くこと", async ({ page }) => {
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
  });

  test("言語セレクトが表示されること", async ({ page }) => {
    const langSelect = page.locator('[data-testid="language-select"]');
    await expect(langSelect).toBeVisible();
    // デフォルトは ja
    await expect(langSelect).toHaveValue("ja");
  });

  test("言語を英語に切り替えられること", async ({ page }) => {
    const langSelect = page.locator('[data-testid="language-select"]');
    await langSelect.selectOption("en");
    await expect(langSelect).toHaveValue("en");
  });

  test("フォントサイズ入力が表示されること", async ({ page }) => {
    const fontSizeInput = page.locator('[data-testid="editor-font-size"]');
    await expect(fontSizeInput).toBeVisible();
    await expect(fontSizeInput).toHaveValue("14");
  });

  test("保存ボタンをクリックすると保存メッセージが表示されること", async ({ page }) => {
    const saveBtn = page.locator('[data-testid="settings-save-btn"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    // 保存後は「保存しました」に変わる
    await expect(saveBtn).toContainText("保存しました", { timeout: 5_000 });
  });
});
