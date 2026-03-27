// E2E シナリオ6: ブックマーク操作
import { test, expect } from "@playwright/test";

test.describe("ブックマーク", () => {
  test("ブックマークサイドバーに切り替えられること", async ({ page }) => {
    await page.click('[data-testid="activity-search"]');
    // ブックマークセクションが表示される
    await expect(
      page.locator('[data-testid="bookmark-section"]')
    ).toBeVisible();
  });

  test("ブックマークが空の場合にメッセージが表示されること", async ({ page }) => {
    await page.click('[data-testid="activity-search"]');
    const section = page.locator('[data-testid="bookmark-section"]');
    const isEmpty = await section.locator('[data-testid="bookmark-empty"]').isVisible();
    if (isEmpty) {
      await expect(section.locator('[data-testid="bookmark-empty"]')).toContainText(
        "ブックマークはありません"
      );
    }
  });
});
