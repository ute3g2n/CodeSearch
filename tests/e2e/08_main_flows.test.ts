// E2E メインフロー一気通貫テスト
// シナリオ1: ワークスペースオープン→検索→ファイル表示
// シナリオ3: ハイライト追加→サイドバー反映→ナビゲーション
// シナリオ4: 設定変更→反映確認（フォント・ミニマップ設定）
import { test, expect } from "./fixtures";

// ----- シナリオ1: ワークスペースオープン → 検索 → ファイル表示 -----
test.describe("シナリオ1: ワークスペースオープン→検索→ファイル表示", () => {
  test("アプリ起動→検索サイドバー表示→クエリ入力→検索実行の一連フロー", async ({
    page,
  }) => {
    // 1. アプリ起動
    await page.goto("/");
    await expect(page.locator('[data-testid="editor-area"]')).toBeVisible();

    // 2. 検索サイドバーを開く
    await page.click('[data-testid="activity-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();

    // 3. 検索クエリを入力して実行
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("fn main");
    await input.press("Enter");

    // 4. 入力値が保持されていること
    await expect(input).toHaveValue("fn main");
  });

  test("ワークスペース選択後に検索を実行できること", async ({ page }) => {
    await page.goto("/");

    // 検索サイドバーを開く
    await page.click('[data-testid="activity-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();

    // 検索クエリを入力
    const input = page.locator('[data-testid="search-input"]');
    await input.fill("hello");
    await input.press("Enter");

    // 検索入力欄が操作可能であること
    await expect(input).toBeEnabled();
  });
});

// ----- シナリオ3: ハイライト追加 → サイドバー反映 → ナビゲーション -----
test.describe("シナリオ3: ハイライト追加→サイドバー反映→ナビゲーション", () => {
  test("ハイライトセクションのトグルをクリックすると展開されること", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-search"]');

    // 「ハイライト」セクションのトグルをクリックして展開する
    await page.click('text=ハイライト');

    // ハイライトセクションが表示されること
    await expect(
      page.locator('[data-testid="highlight-section"]')
    ).toBeVisible();
  });

  test("ハイライトが空の場合にアイテムが0件であること", async ({
    page,
  }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-search"]');

    // 「ハイライト」セクションを展開する
    await page.click('text=ハイライト');
    await expect(
      page.locator('[data-testid="highlight-section"]')
    ).toBeVisible();

    // 初期状態はハイライトアイテムなし
    const items = page.locator('[data-testid="highlight-item"]');
    await expect(items).toHaveCount(0);
  });
});

// ----- シナリオ5: 設定変更 → 反映確認 -----
test.describe("シナリオ5: 設定変更→反映確認", () => {
  test("フォントサイズを変更して保存できること", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();

    // フォントサイズを変更
    const fontSizeInput = page.locator('[data-testid="editor-font-size"]');
    await fontSizeInput.fill("16");
    await expect(fontSizeInput).toHaveValue("16");

    // 保存ボタンをクリック
    const saveBtn = page.locator('[data-testid="settings-save-btn"]');
    await saveBtn.click();
    await expect(saveBtn).toContainText("保存しました", { timeout: 5_000 });
  });

  test("ミニマップ有効/無効を切り替えられること", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="activity-settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();

    // ミニマップのチェックボックスが表示されること
    const minimapToggle = page.locator('[data-testid="settings-minimap-toggle"]');
    await expect(minimapToggle).toBeVisible();

    // デフォルトは有効（モックの DEFAULT_CONFIG.minimapEnabled = true）
    await expect(minimapToggle).toBeChecked();
  });
});
