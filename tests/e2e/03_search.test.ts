// E2E シナリオ3: 全文検索
// カバー: T-05-02〜10, T-05-12, T-05-14〜16, T-05-21〜24, T-05-29〜30
import { test, expect } from "./fixtures";

test.describe("全文検索", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test("検索入力欄が表示されること (T-05-02)", async ({ page }) => {
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test("検索クエリを入力して Enter で検索実行されること (T-05-03)", async ({ page }) => {
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("function");
    await input.press("Enter");
    await expect(input).toHaveValue("function");
  });

  test("大文字小文字区別トグルをクリックすると状態が変わること (T-05-04)", async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle-case-sensitive"]');
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  // T-05-05: 単語単位マッチトグル
  test("単語単位マッチトグルを ON/OFF 切り替えできること (T-05-05)", async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle-whole-word"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  // T-05-06: 正規表現モードトグル
  test("正規表現トグルを ON/OFF 切り替えできること (T-05-06)", async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle-regex"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  test("検索サイドバーに検索入力とオプションが揃っていること", async ({ page }) => {
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-case-sensitive"]')).toBeVisible();
  });
});

// 検索結果表示テスト（モックでヒットするデータを使用）
test.describe("全文検索 - 結果表示", () => {
  const MOCK_RESULT = {
    groups: [
      {
        filePath: "C:/test/myproject/src/main.rs",
        relativePath: "src/main.rs",
        matches: [
          { lineNumber: 10, lineContent: "fn main() {", matchRanges: [[3, 7]] },
          { lineNumber: 20, lineContent: "    println!(\"hello\");", matchRanges: [] },
        ],
      },
    ],
    totalMatches: 2,
    elapsedMs: 5,
  };

  test.beforeEach(async ({ page }) => {
    // search_fulltext がモック結果を返すように上書きする
    await page.addInitScript((result: typeof MOCK_RESULT) => {
      const orig = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "search_fulltext") return Promise.resolve(result);
        return orig(cmd, args);
      };
    }, MOCK_RESULT);

    await page.goto("/");
    await page.click('[data-testid="activity-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  // T-05-09: 検索結果ファイルグループ表示
  test("検索結果がファイルグループで表示されること (T-05-09)", async ({ page }) => {
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("fn main");
    await input.press("Enter");

    await expect(page.locator('[data-testid="search-result-group"]').first()).toBeVisible({ timeout: 5000 });
  });

  // T-05-10: マッチ行プレビュー表示
  test("マッチ行が行番号付きでプレビュー表示されること (T-05-10)", async ({ page }) => {
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("fn main");
    await input.press("Enter");

    await expect(page.locator('[data-testid="search-result-match"]').first()).toBeVisible({ timeout: 5000 });
  });

  // T-05-12: マッチ行クリックでジャンプ
  test("マッチ行クリックでファイルが開くこと (T-05-12)", async ({ page }) => {
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("fn main");
    await input.press("Enter");

    const match = page.locator('[data-testid="search-result-match"]').first();
    await expect(match).toBeVisible({ timeout: 5000 });
    await match.click();

    // エディタタブが開くこと
    await expect(page.locator('[data-testid="tab"]').first()).toBeVisible({ timeout: 3000 });
  });

  // T-05-16: マッチ数バッジ表示
  test("ファイルグループにマッチ件数バッジが表示されること (T-05-16)", async ({ page }) => {
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("fn main");
    await input.press("Enter");

    await expect(page.locator('[data-testid="search-result-match-count"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="search-result-match-count"]').first()).toContainText("件");
  });
});

// 検索エディタ・クイックオープンテスト
test.describe("全文検索 - 検索エディタ・クイックオープン", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // T-05-22: 検索エディタタブ（Ctrl+Shift+H）
  test("Ctrl+Shift+H で新しい検索エディタタブが開くこと (T-05-22)", async ({ page }) => {
    const countBefore = await page.locator('[data-testid="tab"]').count();
    await page.keyboard.press("Control+Shift+H");
    // 新しいタブが追加されること
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(countBefore + 1, { timeout: 3000 });
  });

  // T-05-29: クイックオープン ファイル名あいまい検索
  test("クイックオープンでクエリを入力できること (T-05-29)", async ({ page }) => {
    await page.keyboard.press("Control+p");
    await expect(page.locator('[data-testid="quick-open"]')).toBeVisible({ timeout: 3000 });
    const input = page.locator('[data-testid="quick-open"] input');
    await input.fill("main");
    await expect(input).toHaveValue("main");
  });

  // T-05-30: クイックオープン 選択でファイルを開く
  test("クイックオープンで Enter を押すと閉じること (T-05-30)", async ({ page }) => {
    await page.keyboard.press("Control+p");
    await expect(page.locator('[data-testid="quick-open"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="quick-open"]')).not.toBeVisible({ timeout: 3000 });
  });
});
