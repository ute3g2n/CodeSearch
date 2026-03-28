// E2E シナリオ15: i18n（言語切替）
// カバー: T-12-01, T-12-03
import { test, expect } from "./fixtures";

test.describe("i18n 言語切替", () => {
  // T-12-01: 日本語表示（デフォルト）
  test("デフォルト言語設定 ja で UI が日本語で表示されること (T-12-01)", async ({ page }) => {
    await page.goto("/");

    // ステータスバーが日本語であること
    await expect(page.locator('[data-testid="status-bar"]')).toBeVisible();

    // 設定パネルを開いてタイトルが日本語であること
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toContainText("設定");

    // 言語セレクトのデフォルトが "ja" であること
    await expect(page.locator('[data-testid="language-select"]')).toHaveValue("ja");
  });

  // T-12-03: 言語切り替え後のナビゲーション文言
  test("言語を en に切り替えると UI 文言が変わること (T-12-03)", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();

    // 日本語で設定タイトルが表示されること
    await expect(page.locator('[data-testid="settings-panel"]')).toContainText("設定");

    // 英語に切り替え
    await page.locator('[data-testid="language-select"]').selectOption("en");
    await page.locator('[data-testid="settings-save-btn"]').click();
    await expect(page.locator('[data-testid="settings-save-btn"]')).toContainText("Saved", {
      timeout: 5_000,
    });

    // 設定パネルのタイトルが英語に変わること
    await expect(page.locator('[data-testid="settings-panel"]')).toContainText("Settings", {
      timeout: 3_000,
    });
  });
});
