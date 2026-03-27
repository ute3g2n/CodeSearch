// Playwright E2E テスト設定
// Vite preview server + Tauri IPC モックでブラウザテストを実行する
import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: "./tests/e2e",
  // テストファイルパターン（setup/ ディレクトリは除外）
  testMatch: "*.test.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    // Vite preview server に接続
    baseURL: "http://localhost:4173",
    // Tauri IPC モックを各ページロード前に注入
    initScripts: [path.join(__dirname, "tests/e2e/setup/tauri-mock.js")],
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // テスト実行前に vite preview を起動する
  webServer: {
    command: "npm run build && npx vite preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
