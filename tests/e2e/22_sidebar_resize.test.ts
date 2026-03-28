// E2E シナリオ22: サイドバーリサイズ
// カバー: T-NEW-01, T-NEW-03, T-NEW-04, T-NEW-05
import { test, expect } from "./fixtures";

test.describe("サイドバーリサイズハンドル", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // T-NEW-01: リサイズハンドル表示
  test("サイドバーとエディタ境界にリサイズハンドルが存在すること (T-NEW-01)", async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="sidebar-resize-handle"]')
    ).toBeVisible();
  });

  // T-NEW-03: ドラッグで幅変更
  test("ハンドルを右方向にドラッグするとサイドバー幅が増加すること (T-NEW-03)", async ({
    page,
  }) => {
    const handle = page.locator('[data-testid="sidebar-resize-handle"]');
    await expect(handle).toBeVisible();
    const sidebar = page.locator(".sidebar-container");
    const initialWidth = await sidebar.evaluate(
      (el: HTMLElement) => el.offsetWidth
    );
    // ハンドルをドラッグ
    const handleBox = await handle.boundingBox();
    if (handleBox) {
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        handleBox.x + 100,
        handleBox.y + handleBox.height / 2
      );
      await page.mouse.up();
    }
    await page.waitForTimeout(200);
    const newWidth = await sidebar.evaluate(
      (el: HTMLElement) => el.offsetWidth
    );
    expect(newWidth).toBeGreaterThan(initialWidth);
  });

  // T-NEW-04: 最小幅クランプ（150px未満にはなれない）
  test("150px未満にはドラッグできないこと (T-NEW-04)", async ({ page }) => {
    const handle = page.locator('[data-testid="sidebar-resize-handle"]');
    await expect(handle).toBeVisible();
    const sidebar = page.locator(".sidebar-container");
    // 左端まで大きくドラッグ
    const handleBox = await handle.boundingBox();
    if (handleBox) {
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(0, handleBox.y + handleBox.height / 2);
      await page.mouse.up();
    }
    await page.waitForTimeout(200);
    const newWidth = await sidebar.evaluate(
      (el: HTMLElement) => el.offsetWidth
    );
    expect(newWidth).toBeGreaterThanOrEqual(150);
  });

  // T-NEW-05: 最大幅クランプ（ウィンドウ幅の50%を超えない）
  test("ウィンドウ幅の50%を超えてドラッグできないこと (T-NEW-05)", async ({
    page,
  }) => {
    const handle = page.locator('[data-testid="sidebar-resize-handle"]');
    await expect(handle).toBeVisible();
    const sidebar = page.locator(".sidebar-container");
    const viewportWidth = page.viewportSize()?.width ?? 1280;
    // 右端まで大きくドラッグ
    const handleBox = await handle.boundingBox();
    if (handleBox) {
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        viewportWidth - 10,
        handleBox.y + handleBox.height / 2
      );
      await page.mouse.up();
    }
    await page.waitForTimeout(200);
    const newWidth = await sidebar.evaluate(
      (el: HTMLElement) => el.offsetWidth
    );
    // 5px のマージンを許容
    expect(newWidth).toBeLessThanOrEqual(viewportWidth * 0.5 + 5);
  });
});
