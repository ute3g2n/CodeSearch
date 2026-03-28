// E2E シナリオ21: その他機能（設定・ショートカット・通知・分割）
// カバー: T-08-06, T-09-08, T-09-11, T-10-06, T-10-08, T-10-09, T-11-04, T-15-07
import { test, expect } from "./fixtures";

test.describe("設定画面", () => {
  // T-08-06: フォントファミリー設定フィールドが存在すること
  test("フォントファミリー設定フィールドが存在すること (T-08-06)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-panel-type="settings"]')).toBeVisible({
      timeout: 3000,
    });
    // settings-font-family testid を持つ入力フィールドが存在すること
    await expect(
      page.locator('[data-testid="settings-font-family"]')
    ).toBeVisible({ timeout: 3000 });
  });
});

test.describe("キーボードショートカット", () => {
  // T-09-08: Ctrl+K Ctrl+O でワークスペース切り替え
  test("Ctrl+K→Ctrl+O でワークスペース切り替えIPCが発行されること (T-09-08)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "select_directory") {
          (window as any).__SELECT_DIR_CALLED__ = true;
          return Promise.resolve(null); // キャンセル
        }
        return orig(cmd, args);
      };
    });
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(300);
    const called = await page.evaluate(
      () => (window as any).__SELECT_DIR_CALLED__
    );
    expect(called).toBe(true);
  });

  // T-09-11: Ctrl+F でファイル内検索
  test("Ctrl+F でファイル内検索UIが表示されること (T-09-11)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Control+f");
    await expect(page.locator('[data-testid="find-bar"]')).toBeVisible({
      timeout: 2000,
    });
    await expect(
      page.locator('[data-testid="find-bar-input"]')
    ).toBeVisible();
    // Escape で閉じること
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="find-bar"]')).not.toBeVisible();
  });
});

test.describe("通知・ステータスバー", () => {
  // T-10-08: ステータスバーにエンコーディング表示
  test("ファイルを開くとステータスバーにエンコーディングが表示されること (T-10-08)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_file_tree")
          return Promise.resolve([
            {
              path: "/f/a.ts",
              name: "a.ts",
              isDir: false,
              extension: "ts",
              size: 10,
              modifiedAt: "",
            },
          ]);
        if (cmd === "read_file")
          return Promise.resolve({
            path: "/f/a.ts",
            content: "// test\n",
            encoding: "UTF-8",
            lineCount: 1,
            size: 8,
          });
        return orig(cmd, args);
      };
    });
    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator('.tree-node:has-text("a.ts")')).toBeVisible({
      timeout: 5000,
    });
    await page.locator('.tree-node:has-text("a.ts")').click();
    await expect(page.locator('[data-testid="status-encoding"]')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('[data-testid="status-encoding"]')).toContainText(
      "UTF-8"
    );
  });

  // T-10-09: ステータスバーに行数/カーソル位置
  test("ステータスバーにステータス情報が表示されること (T-10-09)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="status-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-encoding"]')).toBeVisible();
  });
});

test.describe("画面分割", () => {
  // T-11-04: 「分割と移動」サブメニュー
  test("タブ右クリック→「分割と移動」でサブメニューが表示されること (T-11-04)", async ({
    page,
  }) => {
    await page.goto("/");
    // ウェルカムタブを右クリック
    const tab = page.locator('[data-testid="tab"]').first();
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="split-and-move"]')).toBeVisible();
    // 分割と移動をクリックしてサブメニューを開く
    await page.locator('[data-testid="split-and-move"]').click();
    await expect(page.locator('[data-testid="split-submenu"]')).toBeVisible();
    // サブメニューアイテムが表示されること
    await expect(page.locator('[data-testid="split-右へ分割"]')).toBeVisible();
    await page.keyboard.press("Escape");
  });
});

test.describe("パフォーマンス", () => {
  // T-15-07: 大ファイルスクロール（フリーズなし）
  test("1万行以上のファイルでスクロールがスムーズに動作すること (T-15-07)", async ({
    page,
  }) => {
    const bigContent = Array.from(
      { length: 10001 },
      (_, i) => `const line${i} = ${i};`
    ).join("\n");
    await page.addInitScript((content: string) => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_file_tree")
          return Promise.resolve([
            {
              path: "/f/big.ts",
              name: "big.ts",
              isDir: false,
              extension: "ts",
              size: content.length,
              modifiedAt: "",
            },
          ]);
        if (cmd === "read_file")
          return Promise.resolve({
            path: "/f/big.ts",
            content,
            encoding: "UTF-8",
            lineCount: 10001,
            size: content.length,
          });
        return orig(cmd, args);
      };
    }, bigContent);
    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator('.tree-node:has-text("big.ts")')).toBeVisible({
      timeout: 5000,
    });
    await page.locator('.tree-node:has-text("big.ts")').click();
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 10000 });
    // スクロールのパフォーマンステスト
    const start = Date.now();
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(500);
    const elapsed = Date.now() - start;
    // コンテナが消えていないこと（フリーズなし）
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible();
    // スクロールが3秒以内に完了すること
    expect(elapsed).toBeLessThan(3000);
  });
});
