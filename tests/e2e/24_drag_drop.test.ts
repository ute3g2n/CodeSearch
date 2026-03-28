// E2E シナリオ24: ドラッグ&ドロップ
// カバー: T-13-01, T-13-03, T-13-04, T-NEW-11, T-NEW-12
import { test, expect } from "./fixtures";

// ファイルD&Dのテスト用モック設定
async function setupFileMock(page: any) {
  await page.addInitScript(() => {
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
          {
            path: "C:/project/src/utils.ts",
            name: "utils.ts",
            isDir: false,
            extension: "ts",
            size: 80,
            modifiedAt: new Date().toISOString(),
          },
        ]);
      if (cmd === "read_file") {
        const path = args?.path ?? "";
        return Promise.resolve({
          path,
          content: "// file content\n",
          encoding: "UTF-8",
          lineCount: 1,
          size: 16,
        });
      }
      if (cmd === "open_workspace") {
        (window as any).__OPENED_WORKSPACE__ = args?.path;
        return Promise.resolve({
          id: "mock-ws",
          name: "mock",
          path: args?.path ?? "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return orig(cmd, args);
    };
  });
  await page.goto("/");
}

// dataTransfer を使ってドロップイベントをシミュレートするヘルパー
async function simulateDrop(page: any, selector: string, text: string) {
  const dataTransfer = await page.evaluateHandle((txt: string) => {
    const dt = new DataTransfer();
    dt.setData("text/plain", txt);
    return dt;
  }, text);
  await page.locator(selector).dispatchEvent("dragover", { dataTransfer });
  await page.locator(selector).dispatchEvent("drop", { dataTransfer });
}

test.describe("フォルダD&D (T-13-01)", () => {
  test("ワークスペース未選択時にフォルダをドロップするとワークスペースが開くこと (T-13-01)", async ({
    page,
  }) => {
    await setupFileMock(page);
    // ワークスペース未選択状態（初期状態）
    await expect(
      page.locator('[data-testid="explorer-drop-zone"]')
    ).toBeVisible({ timeout: 3000 });

    // フォルダパスをドロップ
    await simulateDrop(
      page,
      '[data-testid="explorer-drop-zone"]',
      "C:/project"
    );

    // open_workspace が呼ばれたことを確認
    const opened = await page.evaluate(
      () => (window as any).__OPENED_WORKSPACE__
    );
    expect(opened).toBe("C:/project");
  });
});

test.describe("ファイルD&D (T-13-03, T-13-04, T-NEW-11, T-NEW-12)", () => {
  // T-13-03: 単一ファイルD&Dでエディタに開く
  test("単一ファイルをドロップするとエディタで開くこと (T-13-03)", async ({
    page,
  }) => {
    await setupFileMock(page);
    // エディタエリアに単一ファイルをドロップ（ワークスペース不要）
    await simulateDrop(
      page,
      '[data-testid="editor-area"]',
      "C:/project/src/main.ts"
    );

    // タブが開かれること
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
    ).toBeVisible({ timeout: 3000 });
  });

  // T-NEW-11: 単一ファイルD&DでプレビュータブAが開く
  test("単一ファイルD&DでプレビュータブAが開くこと (T-NEW-11)", async ({
    page,
  }) => {
    await setupFileMock(page);
    await simulateDrop(
      page,
      '[data-testid="editor-area"]',
      "C:/project/src/main.ts"
    );

    // プレビュータブが開かれること (data-preview="true")
    await expect(
      page.locator('[data-testid="tab"][data-preview="true"]')
    ).toBeVisible({ timeout: 3000 });
  });

  // T-13-04: 複数ファイルD&Dで全ファイルが開く
  test("複数ファイルをドロップすると全ファイルがタブで開くこと (T-13-04)", async ({
    page,
  }) => {
    await setupFileMock(page);
    // 複数ファイルパスを改行区切りでドロップ
    await simulateDrop(
      page,
      '[data-testid="editor-area"]',
      "C:/project/src/main.ts\nC:/project/src/utils.ts"
    );

    // 2つのファイルタブが開かれること
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "main.ts" })
    ).toBeVisible({ timeout: 3000 });
    await expect(
      page.locator('[data-testid="tab"]').filter({ hasText: "utils.ts" })
    ).toBeVisible({ timeout: 3000 });
  });

  // T-NEW-12: 複数ファイルD&Dは通常タブ（非プレビュー）で開く
  test("複数ファイルD&DはisPreview=falseの通常タブで開くこと (T-NEW-12)", async ({
    page,
  }) => {
    await setupFileMock(page);
    await simulateDrop(
      page,
      '[data-testid="editor-area"]',
      "C:/project/src/main.ts\nC:/project/src/utils.ts"
    );

    // プレビュータブが0件（すべて通常タブ）であること
    await expect(page.locator('[data-testid="tab"][data-preview="true"]')).toHaveCount(
      0,
      { timeout: 3000 }
    );
    // 2つのファイルが通常タブで開かれること
    await expect(
      page.locator('[data-testid="tab"][data-preview="false"]').filter({ hasText: "main.ts" })
    ).toBeVisible({ timeout: 3000 });
    await expect(
      page.locator('[data-testid="tab"][data-preview="false"]').filter({ hasText: "utils.ts" })
    ).toBeVisible({ timeout: 3000 });
  });
});
