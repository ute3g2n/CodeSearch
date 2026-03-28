// E2E シナリオ23: プレビュータブ
// カバー: T-NEW-06〜T-NEW-10, T-NEW-13
import { test, expect } from "./fixtures";

const FILE_A = {
  path: "/p/a.ts",
  name: "a.ts",
  isDir: false,
  extension: "ts",
  size: 10,
  modifiedAt: "",
};
const FILE_B = {
  path: "/p/b.ts",
  name: "b.ts",
  isDir: false,
  extension: "ts",
  size: 10,
  modifiedAt: "",
};

async function setupPreviewTest(page: any) {
  await page.addInitScript((files: any[]) => {
    const orig = (window as any).__TAURI_INTERNALS__.invoke;
    (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
      if (cmd === "get_file_tree") return Promise.resolve(files);
      if (cmd === "read_file")
        return Promise.resolve({
          path: args.path,
          content: `// content of ${args.path}\n`,
          encoding: "UTF-8",
          lineCount: 1,
          size: 20,
        });
      return orig(cmd, args);
    };
  }, [FILE_A, FILE_B]);
  await page.goto("/");
  await page.click('[data-panel="explorer"] button:has-text("フォルダーを開く")');
  await expect(page.locator('.tree-node:has-text("a.ts")')).toBeVisible({
    timeout: 5000,
  });
}

test.describe("プレビュータブ", () => {
  // T-NEW-06: シングルクリックでプレビュータブが開く
  test("エクスプローラーのファイルをシングルクリックするとプレビュータブが開くこと (T-NEW-06)", async ({
    page,
  }) => {
    await setupPreviewTest(page);
    await page.locator('.tree-node:has-text("a.ts")').click();
    // プレビュータブが開くこと（data-preview="true"）
    await expect(
      page.locator('[data-testid="tab"][data-preview="true"]')
    ).toBeVisible({ timeout: 3000 });
    // タイトルがイタリック体であること
    const titleSpan = page
      .locator('[data-testid="tab"][data-preview="true"] span')
      .filter({ hasText: "a.ts" });
    const fontStyle = await titleSpan.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).fontStyle
    );
    expect(fontStyle).toBe("italic");
  });

  // T-NEW-07: プレビュータブは1枚のみ
  test("シングルクリックを繰り返してもプレビュータブは常に1枚であること (T-NEW-07)", async ({
    page,
  }) => {
    await setupPreviewTest(page);
    await page.locator('.tree-node:has-text("a.ts")').click();
    await expect(
      page.locator('[data-testid="tab"][data-preview="true"]')
    ).toHaveCount(1, { timeout: 3000 });
    // b.ts をシングルクリック
    await page.locator('.tree-node:has-text("b.ts")').click();
    // プレビュータブはまだ1枚
    await expect(
      page.locator('[data-testid="tab"][data-preview="true"]')
    ).toHaveCount(1, { timeout: 2000 });
  });

  // T-NEW-08: 2回目のシングルクリックでプレビュータブが置き換わる
  test("ファイルAを開いた後ファイルBをシングルクリックするとプレビュータブがBに置き換わること (T-NEW-08)", async ({
    page,
  }) => {
    await setupPreviewTest(page);
    await page.locator('.tree-node:has-text("a.ts")').click();
    await expect(
      page
        .locator('[data-testid="tab"][data-preview="true"]')
        .filter({ hasText: "a.ts" })
    ).toBeVisible({ timeout: 3000 });
    await page.locator('.tree-node:has-text("b.ts")').click();
    // b.ts がプレビュータブになること
    await expect(
      page
        .locator('[data-testid="tab"][data-preview="true"]')
        .filter({ hasText: "b.ts" })
    ).toBeVisible({ timeout: 2000 });
    // a.ts タブは消えること
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "a.ts" })
    ).not.toBeVisible({ timeout: 2000 });
  });

  // T-NEW-09: ダブルクリックで通常タブが開く
  test("ファイルをダブルクリックすると通常タブ（非プレビュー）が開くこと (T-NEW-09)", async ({
    page,
  }) => {
    await setupPreviewTest(page);
    await page.locator('.tree-node:has-text("a.ts")').dblclick();
    // 通常タブが開くこと（data-preview="false"）
    await expect(
      page
        .locator('[data-testid="tab"][data-preview="false"]')
        .filter({ hasText: "a.ts" })
    ).toBeVisible({ timeout: 3000 });
  });

  // T-NEW-10: 通常タブはシングルクリックで置き換えられない
  test("通常タブが存在する状態でシングルクリックすると別にプレビュータブが開くこと (T-NEW-10)", async ({
    page,
  }) => {
    await setupPreviewTest(page);
    // a.ts をダブルクリックして通常タブで開く
    await page.locator('.tree-node:has-text("a.ts")').dblclick();
    await expect(
      page
        .locator('[data-testid="tab"][data-preview="false"]')
        .filter({ hasText: "a.ts" })
    ).toBeVisible({ timeout: 3000 });
    // b.ts をシングルクリック
    await page.locator('.tree-node:has-text("b.ts")').click();
    // a.ts 通常タブが残ること
    await expect(
      page
        .locator('[data-testid="tab"][data-preview="false"]')
        .filter({ hasText: "a.ts" })
    ).toBeVisible({ timeout: 2000 });
    // b.ts プレビュータブが開くこと
    await expect(
      page
        .locator('[data-testid="tab"][data-preview="true"]')
        .filter({ hasText: "b.ts" })
    ).toBeVisible({ timeout: 2000 });
  });

  // T-NEW-13: プレビュータブを閉じるボタンで閉じられる
  test("プレビュータブの×ボタンで閉じられること (T-NEW-13)", async ({ page }) => {
    await setupPreviewTest(page);
    await page.locator('.tree-node:has-text("a.ts")').click();
    await expect(
      page.locator('[data-testid="tab"][data-preview="true"]')
    ).toBeVisible({ timeout: 3000 });
    const tabsBefore = await page.locator('[data-testid="tab"]').count();
    // プレビュータブの×ボタンをクリック
    const previewTab = page.locator('[data-testid="tab"][data-preview="true"]');
    await previewTab.locator('[data-testid="tab-close-btn"]').click();
    await expect(page.locator('[data-testid="tab"]')).toHaveCount(
      tabsBefore - 1,
      { timeout: 2000 }
    );
  });
});
