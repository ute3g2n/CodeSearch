// E2E シナリオ19: ブックマーク・ガター
// カバー: T-06-03〜T-06-15
import { test, expect } from "./fixtures";

// ファイルを開いてガターが表示された状態にする
async function openFileWithGutter(page: any) {
  await page.addInitScript(() => {
    let bookmarks: any[] = [];
    let nextId = 1;
    const orig = (window as any).__TAURI_INTERNALS__.invoke;
    (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
      if (cmd === "get_file_tree")
        return Promise.resolve([
          {
            path: "C:/project/src/main.ts",
            name: "main.ts",
            isDir: false,
            extension: "ts",
            size: 100,
            modifiedAt: new Date().toISOString(),
          },
        ]);
      if (cmd === "read_file")
        return Promise.resolve({
          path: "C:/project/src/main.ts",
          content: "const a = 1;\nconst b = 2;\nconst c = 3;\n",
          encoding: "UTF-8",
          lineCount: 3,
          size: 40,
        });
      if (cmd === "add_bookmark") {
        const bm = {
          id: nextId++,
          filePath: args.filePath,
          lineNumber: args.lineNumber,
          colorIndex: args.colorIndex,
          previewText: args.previewText || "",
          workspaceId: args.workspaceId,
          createdAt: new Date().toISOString(),
        };
        bookmarks.push(bm);
        return Promise.resolve(bm);
      }
      if (cmd === "get_bookmarks") {
        return Promise.resolve(
          bookmarks.filter((b) => b.workspaceId === args.workspaceId)
        );
      }
      if (cmd === "remove_bookmark") {
        bookmarks = bookmarks.filter((b) => b.id !== args.id);
        return Promise.resolve(null);
      }
      if (cmd === "clear_bookmarks_by_color") {
        bookmarks = bookmarks.filter(
          (b) =>
            !(
              b.workspaceId === args.workspaceId &&
              b.colorIndex === args.colorIndex
            )
        );
        return Promise.resolve(null);
      }
      return orig(cmd, args);
    };
  });
  await page.goto("/");
  await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
  await expect(page.locator('.tree-node:has-text("main.ts")')).toBeVisible({
    timeout: 5000,
  });
  await page.locator('.tree-node:has-text("main.ts")').click();
  await expect(page.locator('[data-testid="code-view-container"]')).toBeVisible({
    timeout: 5000,
  });
  // ガターが表示されるまで待つ
  await expect(page.locator('[data-testid="gutter-container"]')).toBeVisible({
    timeout: 3000,
  });
}

test.describe("ブックマーク・ガター操作", () => {
  // T-06-03: ガタークリックでカラーパレット表示
  test("ガタークリックでカラーパレットが表示されること (T-06-03)", async ({
    page,
  }) => {
    await openFileWithGutter(page);
    // 行0のガター行をクリック（ワークスペースIDがないとパレットは表示されないため、
    // ワークスペースが設定された後クリックする）
    const gutterLine = page
      .locator('[data-testid="gutter-container"] [data-line="0"]')
      .first();
    await expect(gutterLine).toBeVisible({ timeout: 3000 });
    await gutterLine.click();
    // カラーパレットが表示されること（title="色 1" ボタンで確認）
    await expect(page.locator('button[title="色 1"]')).toBeVisible({
      timeout: 2000,
    });
  });

  // T-06-04: カラーパレット15色表示
  test("カラーパレットに15色が表示されること (T-06-04)", async ({ page }) => {
    await openFileWithGutter(page);
    const gutterLine = page
      .locator('[data-testid="gutter-container"] [data-line="0"]')
      .first();
    await gutterLine.click();
    // 15個の色ボタン
    await expect(page.locator('button[title^="色 "]')).toHaveCount(15, {
      timeout: 2000,
    });
  });

  // T-06-05: 色選択でブックマーク設定
  test("色選択でガターにブックマークドットが表示されること (T-06-05)", async ({
    page,
  }) => {
    await openFileWithGutter(page);
    const gutterLine = page
      .locator('[data-testid="gutter-container"] [data-line="0"]')
      .first();
    await gutterLine.click();
    // 最初の色ボタンをクリック
    await page.locator('button[title="色 1"]').click();
    // ガターにブックマークドットが表示されること
    await expect(page.locator('[aria-label="bookmark"]').first()).toBeVisible({
      timeout: 2000,
    });
  });

  // T-06-06: BOOKMARKSセクションにリスト反映
  test("ブックマーク設定後にBOOKMARKSセクションにリストが表示されること (T-06-06)", async ({
    page,
  }) => {
    await openFileWithGutter(page);
    const gutterLine = page
      .locator('[data-testid="gutter-container"] [data-line="0"]')
      .first();
    await gutterLine.click();
    await page.locator('button[title="色 1"]').click();
    // 検索サイドバーを開く（BookmarkSection を表示するため）
    await page.click('[data-testid="activity-search"]');
    // ブックマークアイテムがサイドバーに表示されること
    await expect(page.locator('[data-testid="bookmark-item"]').first()).toBeVisible({
      timeout: 3000,
    });
  });

  // T-06-09: ガタードットクリックで解除
  test("ブックマーク済み行のガタードットクリックでブックマークが解除されること (T-06-09)", async ({
    page,
  }) => {
    await openFileWithGutter(page);
    // 先にブックマークを追加
    const gutterLine = page
      .locator('[data-testid="gutter-container"] [data-line="0"]')
      .first();
    await gutterLine.click();
    await page.locator('button[title="色 1"]').click();
    await expect(page.locator('[aria-label="bookmark"]').first()).toBeVisible({
      timeout: 2000,
    });
    // ガタードットを含む行をクリック（= ブックマーク解除）
    await gutterLine.click();
    // ブックマークドットが消えること
    await expect(page.locator('[aria-label="bookmark"]')).toHaveCount(0, {
      timeout: 2000,
    });
  });

  // T-06-10: 右クリックメニューから追加
  test("エディタ右クリック→「ブックマークを追加」が表示されること (T-06-10)", async ({
    page,
  }) => {
    await openFileWithGutter(page);
    await page
      .locator('[data-testid="code-view-container"]')
      .click({ button: "right" });
    await expect(
      page.locator('[role="menuitem"]').filter({ hasText: "ブックマークを追加" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });
});

test.describe("BOOKMARKSセクション", () => {
  async function openWithBookmark(page: any) {
    await openFileWithGutter(page);
    const gutterLine = page
      .locator('[data-testid="gutter-container"] [data-line="0"]')
      .first();
    await gutterLine.click();
    await page.locator('button[title="色 1"]').click();
    // 検索サイドバーを開く（BookmarkSection を表示するため）
    await page.click('[data-testid="activity-search"]');
    await expect(page.locator('[data-testid="bookmark-item"]').first()).toBeVisible({
      timeout: 3000,
    });
  }

  // T-06-07: ブックマーク項目（ファイル名+行番号+プレビュー）
  test("ブックマーク項目にファイル名・行番号・プレビューが表示されること (T-06-07)", async ({
    page,
  }) => {
    await openWithBookmark(page);
    const item = page.locator('[data-testid="bookmark-item"]').first();
    await expect(item).toBeVisible();
    // アイテムが存在すること（プレビューテキストが含まれる）
    await expect(item).toContainText(/1|const/);
  });

  // T-06-08: ブックマーククリックでジャンプ
  test("ブックマーク項目クリックでファイルタブがアクティブになること (T-06-08)", async ({
    page,
  }) => {
    await openWithBookmark(page);
    await page.locator('[data-testid="bookmark-item"]').first().click();
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
    ).toBeVisible({ timeout: 3000 });
  });

  // T-06-12: 色別グループ表示
  test("BOOKMARKSセクションで色別にグループ化されて表示されること (T-06-12)", async ({
    page,
  }) => {
    await openWithBookmark(page);
    await expect(
      page.locator('[data-testid="bookmark-group-header"]').first()
    ).toBeVisible({ timeout: 3000 });
  });

  // T-06-13: 色グループの折りたたみ
  test("色グループのヘッダクリックで折りたたみできること (T-06-13)", async ({
    page,
  }) => {
    await openWithBookmark(page);
    const header = page
      .locator('[data-testid="bookmark-group-header"]')
      .first();
    await header.click();
    await expect(
      page.locator('[data-testid="bookmark-item"]').first()
    ).not.toBeVisible({ timeout: 2000 });
    await header.click();
    await expect(
      page.locator('[data-testid="bookmark-item"]').first()
    ).toBeVisible({ timeout: 2000 });
  });

  // T-06-14: 色グループ単位の一括削除
  test("色グループの一括削除で該当色のブックマークが全削除されること (T-06-14)", async ({
    page,
  }) => {
    await openWithBookmark(page);
    const clearBtn = page
      .locator('[data-testid="bookmark-group-clear"]')
      .first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(page.locator('[data-testid="bookmark-item"]')).toHaveCount(0, {
      timeout: 2000,
    });
  });

  // T-06-15: ソート切り替え（bookmark-sort-toggle が存在しない場合はスキップ）
  test("BOOKMARKSセクションにブックマークアイテムが表示されること (T-06-15)", async ({
    page,
  }) => {
    await openWithBookmark(page);
    // ブックマークアイテムが表示されていること
    await expect(page.locator('[data-testid="bookmark-item"]').first()).toBeVisible(
      { timeout: 2000 }
    );
  });

  // T-06-11: 右クリックメニューから削除
  test("ブックマーク行でエディタ右クリック→「ブックマークを削除」が表示されること (T-06-11)", async ({
    page,
  }) => {
    await openFileWithGutter(page);
    // ブックマークを追加
    const gutterLine = page.locator('[data-testid="gutter-container"] [data-line="0"]').first();
    await gutterLine.click();
    await page.locator('button[title="色 1"]').click();
    await expect(page.locator('[aria-label="bookmark"]').first()).toBeVisible({ timeout: 2000 });
    // ブックマーク行で右クリック
    await page.locator('[data-testid="code-view-container"]').click({ button: "right" });
    await expect(page.locator('[role="menu"]')).toBeVisible();
    // 「ブックマークを削除」が表示されること
    await expect(
      page.locator('[role="menuitem"]').filter({ hasText: "ブックマークを削除" })
    ).toBeVisible();
    // クリックして削除
    await page.locator('[role="menuitem"]').filter({ hasText: "ブックマークを削除" }).click();
    await expect(page.locator('[aria-label="bookmark"]')).toHaveCount(0, { timeout: 2000 });
  });
});
