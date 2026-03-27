// E2E シナリオ6: ブックマーク表示
import { test, expect } from "./fixtures";

test.describe("ブックマーク", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 検索サイドバーへ切り替える（BookmarkSection が含まれている）
    await page.click('[data-testid="activity-search"]');
  });

  test("ブックマークセクションが表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="bookmark-section"]')).toBeVisible();
  });

  test("ブックマークが空の場合に「ブックマークはありません」が表示されること", async ({
    page,
  }) => {
    // モックは空の配列を返すので必ず表示される
    await expect(page.locator('[data-testid="bookmark-empty"]')).toBeVisible();
    await expect(page.locator('[data-testid="bookmark-empty"]')).toContainText(
      "ブックマークはありません"
    );
  });
});
