// E2E シナリオ11: 通知・ステータスバー
// カバー: T-10-03, T-10-04, T-10-05, T-10-07, T-10-10
import { test, expect } from "./fixtures";

test.describe("通知機能", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // T-10-03: インデックス構築完了トースト
  test("index://ready イベントで完了トーストが表示されること (T-10-03)", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("index://ready", {
        docCount: 42,
        elapsedMs: 500,
      });
    });

    await expect(page.locator('[data-testid="toast"]')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('[data-testid="toast"]').first()).toContainText("インデックス構築完了");
  });

  // T-10-04: インデックス構築エラートースト
  test("index://error イベントでエラートーストが表示されること (T-10-04)", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("index://error", {
        workspaceId: "mock-ws",
        message: "インデックスエラー発生",
      });
    });

    await expect(page.locator('[data-testid="toast"]')).toBeVisible({ timeout: 3_000 });
  });

  // T-10-05: ファイル監視エラートースト
  test("watcher://error イベントで警告トーストが表示されること (T-10-05)", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("watcher://error", {
        workspaceId: "mock-ws",
        message: "ファイル監視エラー",
      });
    });

    await expect(page.locator('[data-testid="toast"]')).toBeVisible({ timeout: 3_000 });
  });

  // T-10-07: 通知の×ボタンで手動閉じ
  test("トーストの×ボタンで通知が消えること (T-10-07)", async ({ page }) => {
    // エラートーストを表示（自動消去なし）
    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("index://error", {
        workspaceId: "mock-ws",
        message: "テストエラー",
      });
    });

    const toast = page.locator('[data-testid="toast"]').first();
    await expect(toast).toBeVisible({ timeout: 3_000 });

    // ×ボタンをクリック
    await page.locator('[data-testid="toast-close"]').first().click();

    // トーストが消えること
    await expect(page.locator('[data-testid="toast"]')).toHaveCount(0, { timeout: 3_000 });
  });
});

test.describe("ステータスバー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // T-10-10: ステータスバーにインデックス状態
  test("ステータスバーにインデックス状態が表示されること (T-10-10)", async ({ page }) => {
    await expect(page.locator('[data-testid="status-index"]')).toBeVisible();
    // デフォルトは「インデックス未構築」（idle状態）
    await expect(page.locator('[data-testid="status-index"]')).toContainText("インデックス");
  });

  test("ワークスペースを開いた後にインデックス完了状態が表示されること", async ({ page }) => {
    // ワークスペースを開くと内部で buildIndex → state = "ready" になる
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');

    await expect(page.locator('[data-testid="status-index"]')).toContainText(
      "インデックス完了",
      { timeout: 5_000 }
    );
  });
});

// T-10-02: インデックス進捗バー更新
test.describe("インデックス進捗バー", () => {
  test("index://progress イベントで進捗バーが更新されること (T-10-02)", async ({ page }) => {
    await page.goto("/");
    // 進捗イベントを発火
    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("index://progress", {
        workspaceId: "mock-ws",
        processedFiles: 5,
        totalFiles: 10,
        state: "building",
        elapsedMs: 100,
      });
    });
    // 進捗トーストが表示されること
    await expect(page.locator('[data-testid="toast"]').first()).toBeVisible({ timeout: 3000 });
  });
});
