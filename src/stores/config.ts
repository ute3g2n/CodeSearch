// 設定ストア
// AppConfig の読み込み・保存・言語切替を担う

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

/** アプリケーション設定（Rust AppConfig の camelCase 変換）*/
export interface AppConfig {
  editorFontFamily: string;
  editorFontSize: number;
  uiFontFamily: string;
  uiFontSize: number;
  minimapEnabled: boolean;
  language: string;
  excludePatterns: string[];
  lastWorkspaceId: string | null;
}

/** デフォルト設定値 */
const DEFAULT_CONFIG: AppConfig = {
  editorFontFamily: "Consolas, 'Courier New', monospace",
  editorFontSize: 14,
  uiFontFamily: "Segoe UI, sans-serif",
  uiFontSize: 13,
  minimapEnabled: true,
  language: "ja",
  excludePatterns: [".git", "node_modules"],
  lastWorkspaceId: null,
};

interface ConfigState {
  config: AppConfig;
  /** バックエンドから設定を読み込み済みかどうか */
  isLoaded: boolean;

  // アクション
  /** バックエンドから設定を読み込む */
  loadConfig: () => Promise<void>;
  /** 設定の一部を更新してバックエンドに保存する */
  saveConfig: (partial: Partial<AppConfig>) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  isLoaded: false,

  /** get_config コマンドで設定を取得してストアに反映する */
  loadConfig: async () => {
    const config = await invoke<AppConfig>("get_config");
    set({ config, isLoaded: true });
  },

  /** 部分更新してから save_config コマンドで保存する */
  saveConfig: async (partial) => {
    const nextConfig = { ...get().config, ...partial };
    await invoke("save_config", { config: nextConfig });
    set({ config: nextConfig });
  },
}));
