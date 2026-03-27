// Playwright E2E テスト設定
// Tauri Driver を使ってデスクトップアプリを WebDriver 経由でテストする
// 実行前に: cargo install tauri-driver

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 1,
  workers: 1, // Tauri アプリはシングルインスタンスで起動するため並列不可
  use: {
    // tauri-driver が起動した WebDriver セッションに接続する
    baseURL: "tauri://localhost",
  },
  reporter: [["list"], ["html", { outputFolder: "playwright-report" }]],
});
