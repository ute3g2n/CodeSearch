// Playwright カスタムフィクスチャ
// 各テストページに Tauri IPC モックを注入する
import { test as base, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TAURI_MOCK_PATH = path.join(__dirname, "setup", "tauri-mock.js");

// Tauri モックを注入したページを提供するカスタムフィクスチャ
export const test = base.extend({
  page: async ({ page }, use) => {
    // Tauri IPC モックをページロード前に注入する
    await page.addInitScript({ path: TAURI_MOCK_PATH });
    await use(page);
  },
});

export { expect };
