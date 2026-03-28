import { test, expect } from "./fixtures";

test("debug T-02-07", async ({ page }) => {
  await page.goto("/");

  // ハンドラー登録前の状態を確認
  const beforeClick = await page.evaluate(() => {
    const ei = (window as any).__TAURI_INTERNALS__;
    return {
      hasMockEmit: typeof (window as any).__MOCK_EMIT__ === 'function',
      listenType: typeof ei?.listen,
      invokeType: typeof ei?.invoke,
    };
  });
  console.log("BEFORE CLICK:", JSON.stringify(beforeClick));

  const openFolderBtn = page.locator('[data-panel="explorer"] button').first();
  await expect(openFolderBtn).toBeVisible({ timeout: 2000 });
  await openFolderBtn.click();

  await page.waitForTimeout(500);

  // クリック後の状態を確認
  const afterClick = await page.evaluate(() => {
    // window.__TAURI_INTERNALS__ のイベントハンドラーを確認
    const ei = (window as any).__TAURI_INTERNALS__;
    // @tauri-apps/api がどのイベント登録メソッドを使っているか確認
    const isMockEmitAvailable = typeof (window as any).__MOCK_EMIT__ === 'function';
    return {
      hasMockEmit: isMockEmitAvailable,
      // invoke が何回呼ばれたか（もしカウントしているなら）
    };
  });
  console.log("AFTER CLICK:", JSON.stringify(afterClick));

  // イベントを発火してみる
  const emitResult = await page.evaluate(() => {
    try {
      (window as any).__MOCK_EMIT__("index://progress", {
        current: 1,
        total: 3,
        message: "テスト",
      });
      return "emitted";
    } catch(e: any) {
      return "error: " + e.message;
    }
  });
  console.log("EMIT RESULT:", emitResult);

  await page.waitForTimeout(500);

  // トーストの存在確認
  const toastVisible = await page.evaluate(() => {
    const toasts = document.querySelectorAll('[data-testid="toast"]');
    return { count: toasts.length, texts: Array.from(toasts).map(t => t.textContent) };
  });
  console.log("TOASTS:", JSON.stringify(toastVisible));
});
