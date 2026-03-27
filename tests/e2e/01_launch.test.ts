// E2E シナリオ1: アプリ起動 & ウェルカム画面
import { test, expect } from "@playwright/test";

test.describe("アプリ起動", () => {
  test("アプリが起動してウェルカム画面が表示されること", async ({ page }) => {
    // エディタエリアが表示されている
    await expect(page.locator('[data-testid="editor-area"]')).toBeVisible();
    // ウェルカムタブが開いている
    await expect(page.locator('[data-testid="welcome-tab"]')).toBeVisible();
    // アクティビティバーが表示されている
    await expect(page.locator('[data-testid="activity-bar"]')).toBeVisible();
  });

  test("タイトルバーにアプリ名が表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="title-bar"]')).toContainText(
      "CodeSearch"
    );
  });
});
