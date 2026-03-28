// E2E シナリオ2: ワークスペース管理
// カバー: T-02-01, T-02-03〜05, T-02-06, T-02-07, T-02-08
import { test, expect } from "./fixtures";

test.describe("ワークスペース管理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // T-02-01: フォルダーを開くボタン表示
  test("ウェルカムタブに「フォルダーを開く」ボタンが表示されること (T-02-01)", async ({ page }) => {
    await expect(page.locator('[data-testid="welcome-tab"]')).toBeVisible();
    const openBtn = page.locator('[data-testid="welcome-tab"] button').first();
    await expect(openBtn).toBeVisible();
  });

  // T-03-01: エクスプローラーアイコンクリックで切り替え
  test("エクスプローラーアイコンをクリックするとサイドバーが切り替わること (T-03-01)", async ({ page }) => {
    await page.click('[data-testid="activity-explorer"]');
    const sidebar = page.locator('[data-panel="explorer"]');
    await expect(sidebar).toBeVisible();
  });

  // T-05-01: 検索サイドバー切り替え
  test("検索アイコンをクリックすると検索サイドバーに切り替わること (T-05-01)", async ({ page }) => {
    await page.click('[data-testid="activity-search"]');
    const sidebar = page.locator('[data-panel="search"]');
    await expect(sidebar).toBeVisible();
  });

  // T-03-02: 同アイコン再クリックでサイドバー閉じ
  test("アクティビティバーの同アイコン再クリックでサイドバーが閉じること (T-03-02)", async ({ page }) => {
    // 初期状態ではエクスプローラーサイドバーが表示されている
    await expect(page.locator('[data-panel="explorer"]')).toBeVisible();
    // 同一アイコンをクリックするとサイドバーが閉じること
    await page.click('[data-testid="activity-explorer"]');
    await expect(page.locator('[data-panel="explorer"]')).not.toBeVisible();
    // 再度クリックすると再び開くこと
    await page.click('[data-testid="activity-explorer"]');
    await expect(page.locator('[data-panel="explorer"]')).toBeVisible();
  });
});

test.describe("ワークスペースオープン後の動作", () => {
  const MOCK_WS = {
    id: "test-ws-id",
    path: "C:/test/myproject",
    name: "myproject",
    lastOpenedAt: "2024-01-01T00:00:00.000Z",
  };

  // T-02-03: ワークスペースオープン後のツリー表示
  test("ワークスペースを開くとエクスプローラーにファイルツリーが表示されること (T-02-03)", async ({ page }) => {
    // get_file_tree がファイルノードを返すモックに上書きする
    await page.addInitScript((ws: typeof MOCK_WS) => {
      const origInvoke = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "open_workspace") {
          return Promise.resolve({
            workspace: ws,
            indexStatus: "empty",
            fileCount: 2,
            hasIndexWriteLock: true,
          });
        }
        if (cmd === "get_file_tree") {
          return Promise.resolve([
            { name: "src", path: `${ws.path}/src`, isDir: true, children: null, extension: null, size: 0 },
            { name: "README.md", path: `${ws.path}/README.md`, isDir: false, children: null, extension: "md", size: 100 },
          ]);
        }
        return origInvoke(cmd, args);
      };
    }, MOCK_WS);

    await page.goto("/");

    // 初期状態でエクスプローラーサイドバーが表示されている
    // ExplorerPanel のワークスペース未選択時の「フォルダーを開く」ボタンをクリックする
    // (select_directory → "/mock/selected/path" → open_workspace が呼ばれる)
    const openFolderBtn = page.locator('[data-panel="explorer"] button').first();
    await expect(openFolderBtn).toBeVisible({ timeout: 2000 });
    await openFolderBtn.click();

    // ファイルツリーコンテナが表示されることを確認する
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 3000 });
  });

  // T-02-04: ウェルカムタブの自動クローズ
  test("ワークスペースを開くとウェルカムタブが自動的に閉じること (T-02-04)", async ({ page }) => {
    await page.goto("/");

    // 起動直後はウェルカムタブが表示されていることを確認する
    await expect(page.locator('[data-testid="welcome-tab"]')).toBeVisible();

    // 初期状態でエクスプローラーサイドバーが表示されている
    // ExplorerPanel の「フォルダーを開く」ボタンをクリックする
    // (select_directory → "/mock/selected/path" → open_workspace が呼ばれ welcome tab が閉じる)
    const openFolderBtn = page.locator('[data-panel="explorer"] button').first();
    await expect(openFolderBtn).toBeVisible({ timeout: 2000 });
    await openFolderBtn.click();

    // ウェルカムタブが自動的に閉じることを確認する
    await expect(page.locator('[data-testid="welcome-tab"]')).not.toBeVisible({ timeout: 3000 });
  });

  // T-02-07: インデックス構築開始通知
  test("ワークスペースを開くとインデックス構築開始トーストが表示されること (T-02-07)", async ({ page }) => {
    await page.goto("/");

    // ExplorerPanel の「フォルダーを開く」ボタンをクリックしてワークスペースを開く
    const openFolderBtn = page.locator('[data-panel="explorer"] button').first();
    await expect(openFolderBtn).toBeVisible({ timeout: 2000 });
    await openFolderBtn.click();

    // open_workspace が完了してイベントリスナーが登録されるまで待機する
    await page.waitForTimeout(300);

    // tauri-mock.js の __MOCK_EMIT__ を使って index://progress イベントを発火する
    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("index://progress", {
        current: 1,
        total: 3,
        message: "ファイルをインデックス中...",
      });
    });

    // インデックス構築中トーストが表示されることを確認する
    await expect(page.locator('[data-testid="toast"]').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="toast"]').first()).toContainText("インデックス構築中");
  });

  // T-02-06: Ctrl+K Ctrl+O でワークスペース切り替え
  test("Ctrl+K → Ctrl+O でワークスペース選択ダイアログが起動してワークスペースが開くこと (T-02-06)", async ({ page }) => {
    await page.goto("/");

    // 起動直後はウェルカムタブが表示されていることを確認する
    await expect(page.locator('[data-testid="welcome-tab"]')).toBeVisible();

    // Ctrl+K → Ctrl+O のコードショートカットを送信する
    await page.keyboard.press("Control+k");
    await page.keyboard.press("Control+o");

    // select_directory モックが "/mock/selected/path" を返し open_workspace が実行される
    // ウェルカムタブが自動クローズされることでワークスペースが開いたことを確認する
    await expect(page.locator('[data-testid="welcome-tab"]')).not.toBeVisible({ timeout: 3000 });
  });

  // T-02-08: インデックス構築完了通知
  test("インデックス構築完了時に完了トースト通知が表示されること (T-02-08)", async ({ page }) => {
    await page.goto("/");

    // ワークスペースを開く（「フォルダーを開く」ボタンをクリック）
    const openFolderBtn = page.locator('[data-panel="explorer"] button').first();
    await expect(openFolderBtn).toBeVisible({ timeout: 2000 });
    await openFolderBtn.click();

    // イベントリスナーが登録されるまで待機する
    await page.waitForTimeout(300);

    // index://ready イベントを発火して完了通知をシミュレートする
    await page.evaluate(() => {
      (window as any).__MOCK_EMIT__("index://ready", {
        docCount: 42,
        elapsedMs: 123,
      });
    });

    // 「インデックス構築完了」トーストが表示されることを確認する
    await expect(page.locator('[data-testid="toast"]').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="toast"]').first()).toContainText("インデックス構築完了");
  });

  // T-02-05: 最近開いたワークスペース一覧
  test("ウェルカムタブに最近開いたワークスペース一覧が表示されること (T-02-05)", async ({ page }) => {
    const recentWorkspaces = [
      { id: "ws-1", path: "C:/projects/project-a", name: "project-a", lastOpenedAt: "2024-01-02T00:00:00.000Z" },
      { id: "ws-2", path: "C:/projects/project-b", name: "project-b", lastOpenedAt: "2024-01-01T00:00:00.000Z" },
    ];

    // list_recent_workspaces がワークスペース一覧を返すモックに上書きする
    await page.addInitScript((recents: typeof recentWorkspaces) => {
      const origInvoke = (window as any).__TAURI_INTERNALS__.invoke;
      (window as any).__TAURI_INTERNALS__.invoke = (cmd: string, args: any) => {
        if (cmd === "list_recent_workspaces") {
          return Promise.resolve(recents);
        }
        return origInvoke(cmd, args);
      };
    }, recentWorkspaces);

    await page.goto("/");

    // ウェルカムタブに最近開いたワークスペース名が表示されることを確認する
    await expect(page.locator('[data-testid="welcome-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-tab"]')).toContainText("project-a", { timeout: 3000 });
    await expect(page.locator('[data-testid="welcome-tab"]')).toContainText("project-b");
  });
});
