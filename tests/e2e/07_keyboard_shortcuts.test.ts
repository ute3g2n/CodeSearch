// E2E シナリオ7: キーボードショートカット
// カバー: T-09-01〜T-09-12（T-09-08 は e2e/02 でカバー）
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

  // T-09-04: Ctrl+Shift+T で閉じたタブを再開
  test("Ctrl+Shift+T で閉じたタブを再開できること (T-09-04)", async ({ page }) => {
    // Welcomeタブを閉じる
    await page.keyboard.press("Control+w");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(0);

    // Ctrl+Shift+T で再開
    await page.keyboard.press("Control+Shift+T");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(1, { timeout: 3_000 });
    await expect(page.locator('[data-testid="tab"]').first()).toContainText("Welcome");
  });

  // T-09-05: Ctrl+Tab で次のタブに切り替え
  test("Ctrl+Tab で次のタブに切り替わること (T-09-05)", async ({ page }) => {
    // 2タブ目（検索エディタ）を開く
    await page.keyboard.press("Control+Shift+H");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(2);

    // 検索エディタタブがアクティブ（Welcome ではない）
    await expect(
      page.locator('[data-testid="tab"][data-active="true"]')
    ).not.toContainText("Welcome");

    // Ctrl+Tab でアクティブタブが Welcome に切り替わること
    await page.keyboard.press("Control+Tab");
    await expect(
      page.locator('[data-testid="tab"][data-active="true"]')
    ).toContainText("Welcome");
  });

  // T-09-06: Ctrl+\ でエディタを右に分割
  test("Ctrl+バックスラッシュでエディタが右に分割されること (T-09-06)", async ({ page }) => {
    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(1);
    await page.keyboard.press("Control+\\");
    await expect(page.locator('[data-testid="tab-bar"]')).toHaveCount(2, { timeout: 3_000 });
  });

  // T-09-07: Ctrl+, で設定を開く
  test("Ctrl+コンマで設定パネルが開くこと (T-09-07)", async ({ page }) => {
    await page.keyboard.press("Control+,");
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible({
      timeout: 3_000,
    });
  });

  // T-09-09: Ctrl+Shift+M でミニマップ切り替え
  test("Ctrl+Shift+M でミニマップ設定が変わること (T-09-09)", async ({ page }) => {
    // 設定パネルを開いてミニマップ設定を確認
    await page.click('[data-testid="activity-settings"]');
    const minimapToggle = page.locator('[data-testid="settings-minimap-toggle"]');
    await expect(minimapToggle).toBeChecked();

    // 設定パネルを閉じて Ctrl+Shift+M を押す
    await page.click('[data-testid="activity-explorer"]');

    // Ctrl+Shift+M でミニマップを切り替え（保存まで行う）
    await page.keyboard.press("Control+Shift+M");

    // 設定パネルを開いてミニマップが OFF になっていること
    await page.click('[data-testid="activity-settings"]');
    // 設定が変更されてチェックが外れていること（save_config が呼ばれ再読み込みされる）
    await expect(minimapToggle).not.toBeChecked({ timeout: 3_000 });
  });

  // T-09-10: Ctrl+Shift+H で検索エディタタブが開く
  test("Ctrl+Shift+H で検索エディタタブが開くこと (T-09-10)", async ({ page }) => {
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(1);
    await page.keyboard.press("Control+Shift+H");
    // 新しいタブが追加されること
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(2, { timeout: 3_000 });
    // Welcome タブではないタブがアクティブになること
    await expect(
      page.locator('[data-testid="tab"][data-active="true"]')
    ).not.toContainText("Welcome");
  });

  // T-09-12: Ctrl+F4 でタブを閉じる
  test("Ctrl+F4 でアクティブタブが閉じること (T-09-12)", async ({ page }) => {
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(1);
    await page.keyboard.press("Control+F4");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(0);
  });
});
