// E2E シナリオ16: エクスプローラーコンテキストメニュー
// カバー: T-03-07, T-03-08, T-03-09
import { test, expect } from "./fixtures";

const MOCK_FILE_TREE = [
  {
    path: "C:/test/project/main.ts",
    name: "main.ts",
    isDir: false,
    extension: "ts",
    size: 100,
    modifiedAt: new Date().toISOString(),
  },
];

test.describe("エクスプローラーコンテキストメニュー", () => {
  // ワークスペースモックのセットアップヘルパー
  async function setupWorkspaceMock(page: any) {
    await page.addInitScript((tree: any) => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_file_tree") return Promise.resolve(tree);
        if (cmd === "reveal_in_os_explorer") {
          (window as any).__REVEAL_CALLED__ = args && args.path;
          return Promise.resolve(null);
        }
        return orig(cmd, args);
      };
    }, MOCK_FILE_TREE);
    await page.goto("/");
    // ワークスペースを開く
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator('.tree-node:has-text("main.ts")')).toBeVisible({ timeout: 5000 });
  }

  // T-03-07: ファイル右クリックでコンテキストメニューが表示されること
  test("ファイル右クリックでコンテキストメニューが表示されること (T-03-07)", async ({ page }) => {
    await setupWorkspaceMock(page);
    await page.locator('.tree-node:has-text("main.ts")').click({ button: "right" });
    await expect(page.locator('[data-testid="explorer-context-menu"]')).toBeVisible();
  });

  // T-03-08: コンテキストメニューからファイルパスをコピーできること
  test("コンテキストメニューからファイルパスをコピーできること (T-03-08)", async ({ page }) => {
    await setupWorkspaceMock(page);
    await page.locator('.tree-node:has-text("main.ts")').click({ button: "right" });
    await expect(page.locator('[data-testid="explorer-copy-path"]')).toBeVisible();
    // クリップボード権限を付与してコピー
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.locator('[data-testid="explorer-copy-path"]').click();
    // メニューが閉じること
    await expect(page.locator('[data-testid="explorer-context-menu"]')).not.toBeVisible();
  });

  // T-03-09: コンテキストメニューから OS エクスプローラーで表示できること (IPC 発行確認)
  test("コンテキストメニューからエクスプローラーで表示のIPCが発行されること (T-03-09)", async ({ page }) => {
    await setupWorkspaceMock(page);
    await page.locator('.tree-node:has-text("main.ts")').click({ button: "right" });
    await expect(page.locator('[data-testid="explorer-reveal"]')).toBeVisible();
    await page.locator('[data-testid="explorer-reveal"]').click();
    // IPC が呼ばれたことを確認
    const revealCalled = await page.evaluate(() => (window as any).__REVEAL_CALLED__);
    expect(revealCalled).toBe("C:/test/project/main.ts");
  });
});
