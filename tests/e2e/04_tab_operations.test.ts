// E2E シナリオ4: タブ操作（閉じる・右クリックメニュー）
// カバー: T-04-01〜T-04-09, T-04-14, T-04-15, T-04-17, T-04-18, T-04-25
import { test, expect } from "./fixtures";

// ファイルツリーモック付きの init スクリプト注入ヘルパー
async function injectFileTreeMock(page: any) {
  await page.addInitScript(() => {
    const orig = (window as any).__TAURI_INTERNALS__.invoke;
    (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
      if (cmd === "get_file_tree") {
        return Promise.resolve([
          {
            path: "/mock/selected/path/main.ts",
            name: "main.ts",
            isDir: false,
            extension: "ts",
            size: 100,
            modifiedAt: new Date().toISOString(),
          },
        ]);
      }
      return orig(cmd, args);
    };
  });
}

test.describe("タブ操作", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // ウェルカムタブが存在することを確認
    await expect(page.locator('[data-testid="tab"]')).toBeVisible();
  });

  test("タブが表示されること", async ({ page }) => {
    const tabs = page.locator('[data-testid="tab"]');
    await expect(tabs).toHaveCount(1);
  });

  test("タブのタイトルが「Welcome」であること", async ({ page }) => {
    const tab = page.locator('[data-testid="tab"]').first();
    await expect(tab).toContainText("Welcome");
  });

  test("タブバーが表示されること", async ({ page }) => {
    await expect(page.locator('[data-testid="tab-bar"]')).toBeVisible();
  });

  test("タブの閉じるボタンが表示されること", async ({ page }) => {
    const closeBtn = page.locator('[data-testid="tab-close-btn"]').first();
    await expect(closeBtn).toBeVisible();
  });

  test("タブを閉じるとタブが減ること", async ({ page }) => {
    const closeBtn = page.locator('[data-testid="tab-close-btn"]').first();
    await closeBtn.click();
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(0);
  });

  test("タブを右クリックするとコンテキストメニューが表示されること", async ({ page }) => {
    const tab = page.locator('[data-testid="tab"]').first();
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    // ESC で閉じる
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="menu"]')).not.toBeVisible();
  });

  test("コンテキストメニューに「右に分割」が含まれること", async ({ page }) => {
    const tab = page.locator('[data-testid="tab"]').first();
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await expect(page.locator('[role="menuitem"]').filter({ hasText: "右に分割" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  // T-04-06: その他を閉じる
  test("「その他を閉じる」で他タブを閉じること (T-04-06)", async ({ page }) => {
    // 2タブ目を開く
    await page.keyboard.press("Control+Shift+H");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(2);

    // 1つ目のタブを右クリックして「その他を閉じる」
    const firstTab = page.locator('[data-testid="tab"]').first();
    await firstTab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page.locator('[role="menuitem"]').filter({ hasText: "その他を閉じる" }).click();

    // 右クリックしたタブだけが残ること
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(1);
  });

  // T-04-07: 右側を閉じる
  test("「右側を閉じる」で右タブを閉じること (T-04-07)", async ({ page }) => {
    // 2タブ目を開く（Welcome → Search Editor の順）
    await page.keyboard.press("Control+Shift+H");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(2);

    // 1つ目のタブを右クリックして「右側を閉じる」
    const firstTab = page.locator('[data-testid="tab"]').first();
    await firstTab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page.locator('[role="menuitem"]').filter({ hasText: "右側を閉じる" }).click();

    // 1つ目のタブだけが残ること
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(1);
  });

  // T-04-08: すべて閉じる
  test("「すべて閉じる」で全タブを閉じること (T-04-08)", async ({ page }) => {
    // 2タブ目を開く
    await page.keyboard.press("Control+Shift+H");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(2);

    // 任意のタブを右クリックして「すべて閉じる」
    const firstTab = page.locator('[data-testid="tab"]').first();
    await firstTab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page.locator('[role="menuitem"]').filter({ hasText: "すべて閉じる" }).click();

    await expect(page.locator('[data-testid="tab"]')).toHaveCount(0);
  });

  // T-04-14: Ctrl+Shift+T で閉じたタブを再開
  test("Ctrl+Shift+T で閉じたタブを再開できること (T-04-14)", async ({ page }) => {
    // Welcomeタブを閉じる
    await page.keyboard.press("Control+w");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(0);

    // Ctrl+Shift+T で再開
    await page.keyboard.press("Control+Shift+T");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="tab"]').first()).toContainText("Welcome");
  });

  // T-04-15: Ctrl+Tab で次のタブ
  test("Ctrl+Tab で次のタブに切り替わること (T-04-15)", async ({ page }) => {
    // 2タブ目（検索エディタ）を開く
    await page.keyboard.press("Control+Shift+H");
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(2);

    // 現在の検索エディタタブがアクティブ（Welcome ではない）
    const searchTab = page.locator('[data-testid="tab"][data-active="true"]');
    await expect(searchTab).not.toContainText("Welcome");

    // Ctrl+Tab で次のタブ（Welcomeタブ）に切り替わる
    await page.keyboard.press("Control+Tab");
    // アクティブタブが変わること
    await expect(page.locator('[data-testid="tab"][data-active="true"]')).toContainText("Welcome");
  });
});

// ファイルを開いた状態でのエディタ機能テスト
test.describe("エディタ機能（ファイル開放後）", () => {
  test.beforeEach(async ({ page }) => {
    await injectFileTreeMock(page);
    await page.goto("/");
    // エクスプローラーでフォルダを開く
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    // ファイルツリーにファイルが表示されるのを待つ
    await expect(page.locator('.tree-node')).toBeVisible({ timeout: 5000 });
    // main.ts をクリックして開く
    await page.click('.tree-node:has-text("main.ts")');
    // タブが開くのを待つ
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
    ).toBeVisible({ timeout: 5000 });
  });

  // T-04-17: 行番号常時表示
  test("エディタの左端に行番号が表示されること (T-04-17)", async ({ page }) => {
    await expect(page.locator('[data-testid="gutter-container"]')).toBeVisible();
    // 行番号要素（data-line 属性付き）が存在すること（最初の要素を検証）
    await expect(page.locator('[data-testid="gutter-container"] [data-line="0"]')).toBeVisible();
  });

  // T-04-18: 行番号クリックで行選択
  test("行番号クリックで該当行が選択されること (T-04-18)", async ({ page }) => {
    const lineEl = page.locator('[data-testid="gutter-container"] [data-line="0"]');
    await expect(lineEl).toHaveAttribute("aria-selected", "false");
    await lineEl.click();
    await expect(lineEl).toHaveAttribute("aria-selected", "true");
  });

  // T-04-25: エンコーディング表示（ステータスバー）
  test("ファイルを開くとステータスバーにエンコーディングが表示されること (T-04-25)", async ({ page }) => {
    await expect(page.locator('[data-testid="status-encoding"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-encoding"]')).toContainText("UTF-8");
  });
});
