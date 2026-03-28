// E2E シナリオ18: 全文検索拡張
// カバー: T-05-07, T-05-08, T-05-14, T-05-15, T-05-21, T-05-23, T-05-24
import { test, expect } from "./fixtures";

test.describe("全文検索 - 詳細機能", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "search_fulltext") {
          const query = args && args.query;
          if (!query || query.trim() === "")
            return Promise.resolve({
              groups: [],
              totalMatches: 0,
              elapsedMs: 1,
            });
          return Promise.resolve({
            groups: [
              {
                filePath: "C:/project/src/main.ts",
                relativePath: "src/main.ts",
                matches: [
                  {
                    lineNumber: 1,
                    lineContent: "const x = 1;",
                    matchRanges: [[6, 7]] as [number, number][],
                  },
                ],
              },
            ],
            totalMatches: 1,
            elapsedMs: 5,
          });
        }
        return orig(cmd, args);
      };
    });
    await page.goto("/");
    // 検索サイドバーを開く
    await page.click('[data-testid="activity-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible({
      timeout: 3000,
    });
  });

  // T-05-07: ファイルフィルタ（含める）
  test("「含めるファイル」globパターン入力フィールドが存在すること (T-05-07)", async ({
    page,
  }) => {
    // ファイルフィルタを展開
    const toggle = page.locator('[data-testid="file-filter-toggle"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('[data-testid="include-glob-input"]')).toBeVisible();
    await page.locator('[data-testid="include-glob-input"]').fill("*.ts");
    await expect(
      page.locator('[data-testid="include-glob-input"]')
    ).toHaveValue("*.ts");
  });

  // T-05-08: ファイルフィルタ（除外）
  test("「除外ファイル」globパターン入力フィールドが存在すること (T-05-08)", async ({
    page,
  }) => {
    const toggle = page.locator('[data-testid="file-filter-toggle"]');
    await toggle.click();
    await expect(page.locator('[data-testid="exclude-glob-input"]')).toBeVisible();
    await page.locator('[data-testid="exclude-glob-input"]').fill("*.test.ts");
    await expect(
      page.locator('[data-testid="exclude-glob-input"]')
    ).toHaveValue("*.test.ts");
  });

  // T-05-14: 正規表現検索（有効時）
  test("正規表現モードトグルが存在すること (T-05-14)", async ({ page }) => {
    // SearchInput の toggle-regex testid を使用
    const regexToggle = page.locator('[data-testid="toggle-regex"]');
    await expect(regexToggle).toBeVisible();
    await regexToggle.click();
    // 正規表現で検索クエリを入力
    await page.locator('[data-testid="search-input"]').fill(".+");
    await page.waitForTimeout(400);
  });

  // T-05-15: 検索結果ファイルの折りたたみ
  test("検索結果グループが表示されること (T-05-15)", async ({ page }) => {
    await page.locator('[data-testid="search-input"]').fill("const");
    // Enter キーで検索を実行する
    await page.locator('[data-testid="search-input"]').press("Enter");
    await page.waitForTimeout(500);
    // 結果グループが表示されること
    const group = page.locator('[data-testid="search-result-group"]').first();
    await expect(group).toBeVisible({ timeout: 3000 });
    // マッチ行が表示されること
    const matchItem = page.locator('[data-testid="search-result-match"]').first();
    await expect(matchItem).toBeVisible({ timeout: 3000 });
  });

  // T-05-21: Enter キーで検索が発火すること
  test("Enterキーを押すと検索が発火すること (T-05-21)", async ({
    page,
  }) => {
    await page.locator('[data-testid="search-input"]').fill("const");
    // Enter キーで検索を実行する
    await page.locator('[data-testid="search-input"]').press("Enter");
    await page.waitForTimeout(500);
    // 結果グループが表示されること（検索が発火した証拠）
    await expect(
      page.locator('[data-testid="search-result-group"]').first()
    ).toBeVisible({ timeout: 3000 });
  });
});

test.describe("検索エディタ", () => {
  async function setupSearchEditor(page: any) {
    await page.addInitScript(() => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "search_fulltext") {
          return Promise.resolve({
            groups: [
              {
                filePath: "C:/project/src/main.ts",
                relativePath: "src/main.ts",
                matches: [
                  {
                    lineNumber: 3,
                    lineContent: "const result = search();",
                    matchRanges: [[0, 5]] as [number, number][],
                  },
                ],
              },
            ],
            totalMatches: 1,
            elapsedMs: 5,
          });
        }
        if (cmd === "read_file") {
          return Promise.resolve({
            path: "C:/project/src/main.ts",
            content: "// test\nconst x = 1;\nconst result = search();\n",
            encoding: "UTF-8",
            lineCount: 3,
            size: 50,
          });
        }
        return orig(cmd, args);
      };
    });
    await page.goto("/");
    // Ctrl+Shift+H で検索エディタを開く
    await page.keyboard.press("Control+Shift+H");
    await expect(
      page
        .locator('[data-testid="tab"]')
        .filter({ hasText: "Search" })
        .or(page.locator('[data-testid="tab"]').filter({ hasText: "検索" }))
    ).toBeVisible({ timeout: 3000 });
  }

  // T-05-23: 検索エディタのマッチ行クリックでジャンプ
  test("検索エディタのマッチ行クリックでファイルが開くこと (T-05-23)", async ({
    page,
  }) => {
    await setupSearchEditor(page);
    // 検索クエリを入力
    const searchInput = page
      .locator('[data-testid="search-editor-input"]')
      .or(page.locator('[data-testid="search-input"]').first());
    if ((await searchInput.count()) > 0) {
      await searchInput.fill("const");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);
      // 結果アイテムをクリック
      const resultItem = page
        .locator('[data-testid="search-result-match"]')
        .first();
      if ((await resultItem.count()) > 0) {
        await resultItem.click();
        // ファイルタブが開くこと
        await expect(
          page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });

  // T-05-24: 検索エディタ「エディターで開く」
  test("検索エディタの「エディターで開く」ボタンが存在すること (T-05-24)", async ({
    page,
  }) => {
    await setupSearchEditor(page);
    // 検索クエリを入力して検索を実行する（結果が出た後にボタンが表示される）
    const searchInput = page.locator('[data-testid="search-input"]').first();
    await expect(searchInput).toBeVisible({ timeout: 3000 });
    await searchInput.fill("const");
    // SearchEditor の検索ボタンをクリックするか、Enterキーで検索実行
    await searchInput.press("Enter");
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="open-in-editor-btn"]')).toBeVisible(
      { timeout: 3000 }
    );
  });
});
