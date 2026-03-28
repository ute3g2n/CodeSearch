// E2E シナリオ12: エクスプローラー拡張
// カバー: T-03-03, T-03-04, T-03-05
import { test, expect } from "./fixtures";

// ディレクトリ+ファイル構成のモック
const MOCK_TREE_WITH_DIR = [
  {
    path: "/mock/selected/path/src",
    name: "src",
    isDir: true,
    extension: null,
    size: 0,
    modifiedAt: new Date().toISOString(),
  },
];

const MOCK_TREE_SRC_CHILDREN = [
  {
    path: "/mock/selected/path/src/main.ts",
    name: "main.ts",
    isDir: false,
    extension: "ts",
    size: 100,
    modifiedAt: new Date().toISOString(),
  },
];

const MOCK_TREE_FILE_ONLY = [
  {
    path: "/mock/selected/path/README.md",
    name: "README.md",
    isDir: false,
    extension: "md",
    size: 200,
    modifiedAt: new Date().toISOString(),
  },
];

test.describe("エクスプローラー拡張機能", () => {
  // T-03-03: ディレクトリ展開・折りたたみ
  test("フォルダクリックで展開し再クリックで折りたたまれること (T-03-03)", async ({ page }) => {
    await page.addInitScript((mockTree: any) => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_file_tree") {
          if (args && args.path === "/mock/selected/path") {
            return Promise.resolve(mockTree.root);
          }
          if (args && args.path === "/mock/selected/path/src") {
            return Promise.resolve(mockTree.children);
          }
          return Promise.resolve([]);
        }
        return orig(cmd, args);
      };
    }, { root: MOCK_TREE_WITH_DIR, children: MOCK_TREE_SRC_CHILDREN });

    await page.goto("/");

    // エクスプローラーでワークスペースを開く
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator('.tree-node')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.tree-node:has-text("src")')).toBeVisible();

    // 展開前は子ノードが見えない
    await expect(page.locator('.tree-node:has-text("main.ts")')).not.toBeVisible();

    // src フォルダをクリックして展開
    await page.click('.tree-node:has-text("src")');
    await expect(page.locator('.tree-node:has-text("main.ts")')).toBeVisible({ timeout: 3_000 });

    // 再クリックで折りたたみ
    await page.click('.tree-node:has-text("src")');
    await expect(page.locator('.tree-node:has-text("main.ts")')).not.toBeVisible({ timeout: 3_000 });
  });

  // T-03-04: 遅延読み込み
  test("フォルダ展開時に子要素を遅延取得すること (T-03-04)", async ({ page }) => {
    let fileTreeCalls: string[] = [];

    await page.addInitScript((mockTree: any) => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_file_tree") {
          // 呼ばれたパスを記録
          (window as any).__FILE_TREE_CALLS__ = (window as any).__FILE_TREE_CALLS__ || [];
          (window as any).__FILE_TREE_CALLS__.push(args && args.path);

          if (args && args.path === "/mock/selected/path") {
            return Promise.resolve(mockTree.root);
          }
          if (args && args.path === "/mock/selected/path/src") {
            return Promise.resolve(mockTree.children);
          }
          return Promise.resolve([]);
        }
        return orig(cmd, args);
      };
    }, { root: MOCK_TREE_WITH_DIR, children: MOCK_TREE_SRC_CHILDREN });

    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator('.tree-node:has-text("src")')).toBeVisible({ timeout: 5_000 });

    // 展開前の get_file_tree 呼び出し数を確認（ルートのみ）
    const callsBefore = await page.evaluate(() => (window as any).__FILE_TREE_CALLS__ || []);
    expect(callsBefore).toContain("/mock/selected/path");
    expect(callsBefore).not.toContain("/mock/selected/path/src");

    // src を展開
    await page.click('.tree-node:has-text("src")');
    await expect(page.locator('.tree-node:has-text("main.ts")')).toBeVisible({ timeout: 3_000 });

    // 展開後は src の get_file_tree が呼ばれていること
    const callsAfter = await page.evaluate(() => (window as any).__FILE_TREE_CALLS__ || []);
    expect(callsAfter).toContain("/mock/selected/path/src");
  });

  // T-03-05: ファイルクリックでエディタに開く
  test("ファイルクリックでエディタタブが開くこと (T-03-05)", async ({ page }) => {
    await page.addInitScript((mockTree: any) => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_file_tree") {
          return Promise.resolve(mockTree);
        }
        return orig(cmd, args);
      };
    }, MOCK_TREE_FILE_ONLY);

    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator('.tree-node:has-text("README.md")')).toBeVisible({ timeout: 5_000 });

    // README.md をクリック
    await page.click('.tree-node:has-text("README.md")');

    // エディタタブが開くこと
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "README.md" })
    ).toBeVisible({ timeout: 5_000 });

    // エディタエリアに内容が表示されること
    await expect(page.locator('[data-testid="code-view-container"]')).toBeVisible({ timeout: 3_000 });
  });
});
