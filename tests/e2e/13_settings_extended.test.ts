// E2E シナリオ13: 設定画面拡張
// カバー: T-08-07, T-08-08, T-08-09, T-08-10
import { test, expect } from "./fixtures";

test.describe("設定画面拡張", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
  });

  // T-08-07: フォントサイズ変更（最小値/最大値）
  test("フォントサイズの境界値（最小8・最大32）が入力できること (T-08-07)", async ({ page }) => {
    const fontSizeInput = page.locator('[data-testid="editor-font-size"]');

    // 最小値 8 を入力
    await fontSizeInput.fill("8");
    await expect(fontSizeInput).toHaveValue("8");

    // 保存
    await page.locator('[data-testid="settings-save-btn"]').click();
    await expect(page.locator('[data-testid="settings-save-btn"]')).toContainText("保存しました", {
      timeout: 5_000,
    });

    // 最大値 32 を入力
    await fontSizeInput.fill("32");
    await expect(fontSizeInput).toHaveValue("32");

    // 保存
    await page.locator('[data-testid="settings-save-btn"]').click();
    await expect(page.locator('[data-testid="settings-save-btn"]')).toContainText("保存しました", {
      timeout: 5_000,
    });
  });

  // T-08-09: ミニマップ ON/OFF 設定
  test("設定からミニマップを切り替えられること (T-08-09)", async ({ page }) => {
    const minimapToggle = page.locator('[data-testid="settings-minimap-toggle"]');

    // デフォルトは ON
    await expect(minimapToggle).toBeChecked();

    // OFF にする
    await minimapToggle.uncheck();
    await expect(minimapToggle).not.toBeChecked();

    // 保存
    await page.locator('[data-testid="settings-save-btn"]').click();
    await expect(page.locator('[data-testid="settings-save-btn"]')).toContainText("保存しました", {
      timeout: 5_000,
    });

    // 再度 ON にする
    await minimapToggle.check();
    await expect(minimapToggle).toBeChecked();
  });

  // T-08-08: 除外パターン設定の保存
  test("除外パターンを変更して保存するとsave_configが呼ばれること (T-08-08)", async ({ page }) => {
    // save_config の呼び出しをキャプチャする
    await page.evaluate(() => {
      (window as any).__SAVE_CONFIG_ARGS__ = null;
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "save_config") {
          (window as any).__SAVE_CONFIG_ARGS__ = args;
        }
        return orig(cmd, args);
      };
    });

    // 除外パターンを変更
    const textarea = page.locator('[data-testid="settings-exclude-patterns"]');
    await expect(textarea).toBeVisible();
    await textarea.fill("node_modules\n.git\ndist\nbuild");

    // 保存
    await page.locator('[data-testid="settings-save-btn"]').click();
    await expect(page.locator('[data-testid="settings-save-btn"]')).toContainText("保存しました", {
      timeout: 5_000,
    });

    // save_config が新しいexclude_patternsで呼ばれたことを確認
    const savedArgs = await page.evaluate(() => (window as any).__SAVE_CONFIG_ARGS__);
    expect(savedArgs).not.toBeNull();
    const patterns = savedArgs?.config?.excludePatterns ?? savedArgs?.config?.exclude_patterns ?? [];
    expect(patterns).toContain("dist");
    expect(patterns).toContain("build");
  });

  // T-08-10: Ctrl+, で設定を開く
  test("Ctrl+コンマで設定パネルが開くこと (T-08-10)", async ({ page }) => {
    // 一旦エクスプローラーに切り替えて設定を閉じる
    await page.click('[data-testid="activity-explorer"]');
    await expect(page.locator('[data-testid="settings-panel"]')).not.toBeVisible();

    // Ctrl+, で設定を開く
    await page.keyboard.press("Control+,");
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible({ timeout: 3_000 });
  });
});
