// E2E シナリオ25: ファイル変更時の再読み込みプロンプト
// カバー: T-04-32
import { test, expect } from "./fixtures";

async function openFileAndSetup(page: any) {
  await page.addInitScript(() => {
    const orig = (window as any).__TAURI_INTERNALS__.invoke;
    (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
      if (cmd === "get_file_tree")
        return Promise.resolve([
          {
            path: "C:/project/main.ts",
            name: "main.ts",
            isDir: false,
            extension: "ts",
            size: 100,
            modifiedAt: new Date().toISOString(),
          },
        ]);
      if (cmd === "read_file")
        return Promise.resolve({
          path: "C:/project/main.ts",
          content: "const x = 1;\n",
          encoding: "UTF-8",
          lineCount: 1,
          size: 14,
        });
      return orig(cmd, args);
    };
  });
  await page.goto("/");
  // ワークスペースを開いてファイルをクリック
  await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
  await expect(page.locator('.tree-node:has-text("main.ts")')).toBeVisible({
    timeout: 5000,
  });
  await page.locator('.tree-node:has-text("main.ts")').click();
  await expect(
    page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
  ).toBeVisible({ timeout: 5000 });
}

test.describe("ファイル変更時の再読み込みプロンプト (T-04-32)", () => {
  test("外部でファイルが変更された際に再読み込み確認バナーが表示されること (T-04-32)", async ({
    page,
  }) => {
    await openFileAndSetup(page);

    // fs://changed イベントを発火（ファイル変更シミュレーション）
    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("fs://changed", {
        filePath: "C:/project/main.ts",
        kind: "modified",
      });
    });

    // 再読み込みプロンプトが表示されること
    await expect(page.locator('[data-testid="reload-prompt"]')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('[data-testid="reload-button"]')).toBeVisible();
  });

  test("「無視」ボタンクリックでバナーが消えること", async ({ page }) => {
    await openFileAndSetup(page);

    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("fs://changed", {
        filePath: "C:/project/main.ts",
        kind: "modified",
      });
    });

    await expect(page.locator('[data-testid="reload-prompt"]')).toBeVisible({
      timeout: 3000,
    });
    await page.locator('[data-testid="reload-dismiss"]').click();
    await expect(page.locator('[data-testid="reload-prompt"]')).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("「再読み込み」ボタンクリックでバナーが消えること", async ({ page }) => {
    await openFileAndSetup(page);

    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("fs://changed", {
        filePath: "C:/project/main.ts",
        kind: "modified",
      });
    });

    await expect(page.locator('[data-testid="reload-prompt"]')).toBeVisible({
      timeout: 3000,
    });
    await page.locator('[data-testid="reload-button"]').click();
    await expect(page.locator('[data-testid="reload-prompt"]')).not.toBeVisible({
      timeout: 2000,
    });
  });
});
