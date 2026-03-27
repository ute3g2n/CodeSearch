// E2E シナリオ1: アプリ起動 & ウェルカム画面
import { test, expect } from "./fixtures";

test.describe("アプリ起動", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("エディタエリアが表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="editor-area"]')).toBeVisible();
  });

  test("アクティビティバーが表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="activity-bar"]')).toBeVisible();
  });

  test("タイトルバーに CodeSearch が表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="title-bar"]')).toContainText("CodeSearch");
  });

  test("ウェルカムタブが開かれること", async ({ page }) => {
    await expect(page.locator('[data-testid="welcome-tab"]')).toBeVisible();
  });

  test("ステータスバーが表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="status-bar"]')).toBeVisible();
  });
});

test.describe("ワークスペース自動復元 (T-01-12)", () => {
  test("前回開いていたワークスペースが起動時に自動復元されること", async ({ page }) => {
    const SAVED_WS = {
      id: "saved-ws-id",
      path: "C:/test/workspace",
      name: "test-workspace",
      lastOpenedAt: "2024-01-01T00:00:00.000Z",
    };

    // get_config に lastWorkspaceId を返し、open_workspace の呼び出しを追跡するモックを上書きする
    await page.addInitScript((ws: typeof SAVED_WS) => {
      const origInvoke = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__autoRestoreCalled = false;

      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_config") {
          return Promise.resolve({
            editorFontFamily: "Consolas, 'Courier New', monospace",
            editorFontSize: 14,
            uiFontFamily: "Segoe UI, sans-serif",
            uiFontSize: 13,
            minimapEnabled: true,
            language: "ja",
            excludePatterns: [".git", "node_modules"],
            lastWorkspaceId: ws.id,
          });
        }
        if (cmd === "list_recent_workspaces") {
          return Promise.resolve([ws]);
        }
        if (cmd === "open_workspace" && args && args.path === ws.path) {
          (window as any).__autoRestoreCalled = true;
          return Promise.resolve({
            workspace: ws,
            indexStatus: "empty",
            fileCount: 0,
            hasIndexWriteLock: true,
          });
        }
        return origInvoke(cmd, args);
      };
    }, SAVED_WS);

    await page.goto("/");

    // 自動復元が3秒以内に実行されることを確認する
    await page.waitForFunction(
      () => (window as any).__autoRestoreCalled === true,
      { timeout: 3000 }
    );
  });
});
