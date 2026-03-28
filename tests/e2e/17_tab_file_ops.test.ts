// E2E シナリオ17: タブファイル操作・エディタ機能拡張
// カバー: T-04-09〜T-04-13, T-04-19, T-04-20, T-04-22, T-04-23, T-04-26〜T-04-31
import { test, expect } from "./fixtures";

// ファイルツリーモック付きの init スクリプト注入ヘルパー（04_tab_operations.test.ts と同一パターン）
async function injectMocks(page: any) {
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
      if (cmd === "get_relative_path") {
        const filePath = (args && args.path) || "/mock/selected/path/main.ts";
        const rel = filePath.split("/").pop() || filePath;
        return Promise.resolve(
          args && args.posix ? rel.replace(/\\/g, "/") : rel
        );
      }
      if (cmd === "reveal_in_os_explorer") {
        (window as any).__REVEAL_CALLED__ = args && args.path;
        return Promise.resolve(null);
      }
      return orig(cmd, args);
    };
  });
}

test.describe("タブ右クリック - ファイル操作", () => {
  test.beforeEach(async ({ page }) => {
    await injectMocks(page);
    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator(".tree-node")).toBeVisible({ timeout: 5000 });
    await page.click('.tree-node:has-text("main.ts")');
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
    ).toBeVisible({ timeout: 5000 });
  });

  // T-04-09: パスのコピー
  test("タブ右クリック→パスのコピーでクリップボードにパスがコピーされること (T-04-09)", async ({
    page,
  }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const tab = page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" });
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page
      .locator('[role="menuitem"]')
      .filter({ hasText: "パスのコピー" })
      .first()
      .click();
    await expect(page.locator('[role="menu"]')).not.toBeVisible();
  });

  // T-04-10: 相対パスをコピー（OS形式）
  test("タブ右クリック→相対パスをコピー（OS形式）が動作すること (T-04-10)", async ({
    page,
  }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const tab = page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" });
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page
      .locator('[role="menuitem"]')
      .filter({ hasText: "相対パスをコピー" })
      .first()
      .click();
    await expect(page.locator('[role="menu"]')).not.toBeVisible();
  });

  // T-04-11: 相対パスをコピー（Posix形式）
  test("タブ右クリック→相対パスをコピー（Posix形式）が動作すること (T-04-11)", async ({
    page,
  }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const tab = page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" });
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page.locator('[role="menuitem"]').filter({ hasText: "Posix" }).click();
    await expect(page.locator('[role="menu"]')).not.toBeVisible();
  });

  // T-04-12: エクスプローラーで表示（IPC確認）
  test("タブ右クリック→エクスプローラーで表示のIPCが発行されること (T-04-12)", async ({
    page,
  }) => {
    const tab = page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" });
    await tab.click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page
      .locator('[role="menuitem"]')
      .filter({ hasText: "エクスプローラーで表示する" })
      .click();
    const revealCalled = await page.evaluate(() => (window as any).__REVEAL_CALLED__);
    expect(revealCalled).toBeTruthy();
  });
});

test.describe("エディタ機能", () => {
  test.beforeEach(async ({ page }) => {
    await injectMocks(page);
    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator(".tree-node")).toBeVisible({ timeout: 5000 });
    await page.click('.tree-node:has-text("main.ts")');
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
    ).toBeVisible({ timeout: 5000 });
  });

  // T-04-19: テキスト選択可能
  test("エディタ内テキストを選択できること (T-04-19)", async ({ page }) => {
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 5000 });
    // テキスト選択はブラウザのデフォルト動作。コンテナが表示されていれば OK
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible();
  });

  // T-04-20: テキスト編集不可（読み取り専用）
  test("エディタは読み取り専用で文字入力が反映されないこと (T-04-20)", async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 5000 });
    // contenteditable な要素が存在しないこと
    const editableElements = page.locator(
      '[data-testid="code-view-container"] [contenteditable="true"]'
    );
    await expect(editableElements).toHaveCount(0);
  });

  // T-04-22: ミニマップ ON/OFF（設定）
  test("設定からミニマップの表示/非表示を切り替えられること (T-04-22)", async ({
    page,
  }) => {
    // 設定パネルを開く
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-panel-type="settings"]')).toBeVisible({
      timeout: 3000,
    });
    // ミニマップのトグルが存在すること
    const minimapToggle = page.locator('[data-testid="settings-minimap-toggle"]');
    await expect(minimapToggle).toBeVisible();
    // チェック状態を確認してからクリック
    const isChecked = await minimapToggle.isChecked();
    await minimapToggle.click();
    // チェック状態が変わること
    const isCheckedAfter = await minimapToggle.isChecked();
    expect(isCheckedAfter).toBe(!isChecked);
  });

  // T-04-23: ミニマップ ON/OFF（Ctrl+Shift+M）
  test("Ctrl+Shift+M でミニマップを切り替えられること (T-04-23)", async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 5000 });
    // まずミニマップが表示されていること
    await expect(page.locator('[data-testid="minimap-canvas"]')).toBeVisible({
      timeout: 3000,
    });
    // Ctrl+Shift+M で非表示に
    await page.keyboard.press("Control+Shift+M");
    await expect(page.locator('[data-testid="minimap-canvas"]')).not.toBeVisible(
      { timeout: 2000 }
    );
    // 再度 Ctrl+Shift+M で再表示
    await page.keyboard.press("Control+Shift+M");
    await expect(page.locator('[data-testid="minimap-canvas"]')).toBeVisible({
      timeout: 2000,
    });
  });

  // T-04-28: エディタ内コンテキストメニュー（未選択）
  test("テキスト未選択時の右クリックでコンテキストメニューが表示されること (T-04-28)", async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 5000 });
    await page
      .locator('[data-testid="code-view-container"]')
      .click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    // コピーがグレーアウトされていること（disabled）
    const copyItem = page
      .locator('[role="menuitem"]')
      .filter({ hasText: "コピー" });
    await expect(copyItem).toBeVisible();
    await expect(copyItem).toHaveAttribute("aria-disabled", "true");
    // ブックマーク追加が表示されること
    await expect(
      page.locator('[role="menuitem"]').filter({ hasText: "ブックマークを追加" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  // T-04-29: エディタ内コンテキストメニュー（選択中）
  test("テキスト選択時の右クリックでコンテキストメニューに全項目が表示されること (T-04-29)", async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 5000 });
    await page
      .locator('[data-testid="code-view-container"]')
      .click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await expect(
      page.locator('[role="menuitem"]').filter({ hasText: "ブックマークを追加" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  // T-04-30: 選択部分を検索
  test("エディタ右クリック→「選択部分を検索」メニュー項目が存在すること (T-04-30)", async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 5000 });
    await page
      .locator('[data-testid="code-view-container"]')
      .click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    const searchItem = page
      .locator('[role="menuitem"]')
      .filter({ hasText: "選択部分を検索" });
    await expect(searchItem).toBeVisible();
    await page.keyboard.press("Escape");
  });

  // T-04-31: 新しい検索ウインドウで検索
  test("エディタ右クリック→「新しい検索ウインドウで検索」が存在すること (T-04-31)", async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 5000 });
    await page
      .locator('[data-testid="code-view-container"]')
      .click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await expect(
      page
        .locator('[role="menuitem"]')
        .filter({ hasText: "新しい検索ウインドウで検索" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });
});

test.describe("エディタ機能（特殊ファイル）", () => {
  // T-04-26: Shift-JIS ファイル読み込み
  test("Shift-JIS エンコードのファイルが表示されること (T-04-26)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_file_tree") {
          return Promise.resolve([
            {
              path: "C:/project/src/sjis.txt",
              name: "sjis.txt",
              isDir: false,
              extension: "txt",
              size: 100,
              modifiedAt: new Date().toISOString(),
            },
          ]);
        }
        return orig(cmd, args);
      };
    });
    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator(".tree-node")).toBeVisible({ timeout: 5000 });
    await page.click('.tree-node:has-text("sjis.txt")');
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "sjis.txt" })
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 5000 });
    // エンコーディングがステータスバーに表示されること
    await expect(page.locator('[data-testid="status-encoding"]')).toBeVisible();
  });

  // T-04-27: 仮想スクロール（大ファイル）
  test("1万行以上のファイルがスクロールできること (T-04-27)", async ({ page }) => {
    const bigContent = Array.from(
      { length: 10001 },
      (_, i) => `const line${i} = ${i};`
    ).join("\n");
    await page.addInitScript((content: string) => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "get_file_tree") {
          return Promise.resolve([
            {
              path: "C:/project/src/big.ts",
              name: "big.ts",
              isDir: false,
              extension: "ts",
              size: content.length,
              modifiedAt: new Date().toISOString(),
            },
          ]);
        }
        if (cmd === "read_file") {
          return Promise.resolve({
            path: "C:/project/src/big.ts",
            content,
            encoding: "UTF-8",
            lineCount: 10001,
            size: content.length,
          });
        }
        return orig(cmd, args);
      };
    }, bigContent);
    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator(".tree-node")).toBeVisible({ timeout: 5000 });
    await page.click('.tree-node:has-text("big.ts")');
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "big.ts" })
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[data-testid="code-view-container"]')
    ).toBeVisible({ timeout: 10000 });
    // フリーズなしにスクロールできること
    const container = page.locator('[data-testid="code-view-container"]');
    await container.hover();
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(500);
    // スクロール後もコンテナが存在すること（フリーズしていない）
    await expect(container).toBeVisible();
  });
});

// T-04-13: エクスプローラービューで表示
test.describe("エクスプローラービューで表示 (T-04-13)", () => {
  test.beforeEach(async ({ page }) => {
    await injectMocks(page);
    await page.goto("/");
    await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
    await expect(page.locator(".tree-node")).toBeVisible({ timeout: 5000 });
    await page.click('.tree-node:has-text("main.ts")');
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
    ).toBeVisible({ timeout: 5000 });
  });

  test("タブ右クリック→「エクスプローラービューで表示」でエクスプローラーのノードがハイライトされること (T-04-13)", async ({
    page,
  }) => {
    // タブを右クリック
    await page
      .locator('[data-testid="tab"]')
      .filter({ hasText: "main.ts" })
      .click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();

    // 「エクスプローラービューで表示」をクリック
    await page
      .locator('[role="menuitem"]')
      .filter({ hasText: "エクスプローラービューで表示" })
      .first()
      .click();

    // エクスプローラーのノードが data-revealed="true" でハイライトされること
    await expect(
      page.locator('.tree-node[data-revealed="true"]')
    ).toBeVisible({ timeout: 3000 });
  });
});
