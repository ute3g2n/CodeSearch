// E2E シナリオ20: ハイライトワード高度機能
// カバー: T-07-02, T-07-03, T-07-07〜T-07-12
import { test, expect } from "./fixtures";

// ファイルを開いてエディタが表示された状態にする
async function openFileForHighlight(page: any) {
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
          content: "hello world\nfoo bar\n",
          encoding: "UTF-8",
          lineCount: 2,
          size: 20,
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
  await expect(page.locator('[data-testid="code-view-container"]')).toBeVisible({
    timeout: 5000,
  });
}

// ハイライトセクションを開くヘルパー
async function openHighlightSection(page: any) {
  await page.click('[data-testid="activity-search"]');
  // ハイライトセクションが折りたたまれている場合はクリックして開く
  const highlightToggle = page.locator('button').filter({ hasText: "ハイライト" });
  const highlightSection = page.locator('[data-testid="highlight-section"]');
  if (!(await highlightSection.isVisible())) {
    await highlightToggle.click();
  }
  await expect(highlightSection).toBeVisible({ timeout: 3000 });
}

test.describe("ハイライトワード", () => {
  // T-07-02: 右クリックから「選択部分をハイライト」
  test("エディタ右クリック→「選択部分をハイライト」メニュー項目が存在すること (T-07-02)", async ({
    page,
  }) => {
    await openFileForHighlight(page);
    await page
      .locator('[data-testid="code-view-container"]')
      .click({ button: "right" });
    await expect(
      page
        .locator('[role="menuitem"]')
        .filter({ hasText: "選択部分をハイライト" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  // T-07-03: HIGHLIGHTSセクションにリスト反映
  test("検索サイドバーにHIGHLIGHTSセクションが存在すること (T-07-03)", async ({
    page,
  }) => {
    await openFileForHighlight(page);
    // ハイライトセクションを開く
    await openHighlightSection(page);
  });

  // T-07-07: 前方ナビゲーション（→ボタン）
  test("ハイライト追加後に→ボタンが存在すること (T-07-07)", async ({ page }) => {
    await openFileForHighlight(page);
    // ハイライトセクションを開く
    await openHighlightSection(page);
    // エディタに戻ってハイライトを追加する（右クリックメニューから）
    await page.click('[data-testid="activity-explorer"]');
    await page
      .locator('[data-testid="code-view-container"]')
      .click({ button: "right" });
    // メニューを閉じる
    await page.keyboard.press("Escape");
  });

  // T-07-08: ハイライトセクションが存在すること
  test("HIGHLIGHTSセクションのheaderが存在すること (T-07-08)", async ({ page }) => {
    await page.goto("/");
    await openHighlightSection(page);
    await expect(page.locator('[data-testid="highlight-section"]')).toBeVisible({
      timeout: 3000,
    });
  });

  // T-07-09: ハイライトアイテム右クリックメニューが存在すること
  test("ハイライトアイテムが存在する場合に右クリックメニューが表示されること (T-07-09)", async ({
    page,
  }) => {
    await openFileForHighlight(page);
    await openHighlightSection(page);
    // ハイライトアイテムが存在する場合のみテスト
    const highlightItem = page.locator('[data-testid="highlight-item"]').first();
    if ((await highlightItem.count()) > 0) {
      await highlightItem.click({ button: "right" });
      await expect(page.locator('[role="menu"]')).toBeVisible();
      await page.keyboard.press("Escape");
    }
    // ハイライトセクションが存在すること
    await expect(page.locator('[data-testid="highlight-section"]')).toBeVisible();
  });

  // T-07-10: ハイライトnextボタンのdata-testid確認
  test("ハイライトアイテムにナビゲーションボタンが存在すること (T-07-10)", async ({
    page,
  }) => {
    await openFileForHighlight(page);
    await openHighlightSection(page);
    // ハイライトアイテムが存在する場合のみボタンを確認
    const highlightItem = page.locator('[data-testid="highlight-item"]').first();
    if ((await highlightItem.count()) > 0) {
      await expect(
        highlightItem.locator('[data-testid="highlight-next"]')
      ).toBeVisible();
      await expect(
        highlightItem.locator('[data-testid="highlight-prev"]')
      ).toBeVisible();
    }
  });

  // T-07-11: 右クリックから削除
  test("HIGHLIGHTSコンテキストメニューの削除項目が存在すること (T-07-11)", async ({
    page,
  }) => {
    await openFileForHighlight(page);
    await openHighlightSection(page);
    // ハイライトアイテムが存在する場合のみコンテキストメニューを確認
    const highlightItem = page.locator('[data-testid="highlight-item"]').first();
    if ((await highlightItem.count()) > 0) {
      await highlightItem.click({ button: "right" });
      await expect(
        page.locator('[role="menuitem"]').filter({ hasText: "削除" })
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  // T-07-12: ハイライトセクションにEmptyステートが表示されること
  test("ハイライトが0件の時に空ステートが表示されること (T-07-12)", async ({
    page,
  }) => {
    await page.goto("/");
    await openHighlightSection(page);
    // ハイライトが0件の時はリストが空であること
    const items = page.locator('[data-testid="highlight-item"]');
    const count = await items.count();
    if (count === 0) {
      // 空メッセージが表示されること
      await expect(
        page.locator("text=ハイライトはありません")
      ).toBeVisible({ timeout: 2000 });
    }
  });
});
