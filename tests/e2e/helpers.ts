// E2E テストヘルパー
// tauri-driver 経由で Tauri アプリを操作するユーティリティ

import { type Page } from "@playwright/test";

/** サイドバーの指定アクティビティをクリックする */
export async function clickActivity(page: Page, dataTestId: string) {
  await page.click(`[data-testid="${dataTestId}"]`);
}

/** 検索ボックスにクエリを入力して Enter を押す */
export async function search(page: Page, query: string) {
  const input = page.locator('[data-testid="search-input"]');
  await input.fill(query);
  await input.press("Enter");
}

/** タブバーで指定タイトルのタブが表示されるまで待機する */
export async function waitForTab(page: Page, title: string) {
  await page.waitForSelector(`[data-testid="tab"][data-title="${title}"]`);
}

/** トースト通知のテキストを取得する */
export async function getToastText(page: Page): Promise<string> {
  const toast = page.locator('[data-testid="toast"]').first();
  return toast.innerText();
}
