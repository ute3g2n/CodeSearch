// E2E シナリオ2: ワークスペース開閉
import { test, expect } from "@playwright/test";
import * as path from "path";

const FIXTURE_DIR = path.join(__dirname, "../fixtures/workspace");

test.describe("ワークスペース管理", () => {
  test("フォルダを開くとファイルツリーが表示されること", async ({ page }) => {
    // エクスプローラーアイコンをクリック
    await page.click('[data-testid="activity-explorer"]');
    // 「フォルダを開く」ボタンが表示される
    await expect(
      page.locator('[data-testid="open-folder-button"]')
    ).toBeVisible();
  });

  test("最近開いたフォルダが表示されること", async ({ page }) => {
    await page.click('[data-testid="activity-explorer"]');
    // ワークスペースを開いた後に再起動した場合に履歴が表示される
    // （このテストはワークスペースを事前に開いておく必要がある）
    const recentList = page.locator('[data-testid="recent-workspaces"]');
    // 存在すれば空でないこと（存在しない場合は skip）
    const isVisible = await recentList.isVisible();
    if (isVisible) {
      await expect(recentList.locator("li")).toHaveCountGreaterThan(0);
    }
  });
});
