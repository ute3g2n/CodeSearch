import { describe, it, expect, beforeEach, vi } from "vitest";

// ConfigStore のテスト
// load / save / language switch を検証

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { useConfigStore } from "../../src/stores/config";

const mockedInvoke = vi.mocked(invoke);

const defaultConfig = {
  editorFontFamily: "Consolas, 'Courier New', monospace",
  editorFontSize: 14,
  uiFontFamily: "Segoe UI, sans-serif",
  uiFontSize: 13,
  minimapEnabled: true,
  language: "ja",
  excludePatterns: [".git", "node_modules"],
  lastWorkspaceId: null,
};

function resetStore() {
  useConfigStore.setState({ config: defaultConfig, isLoaded: false });
}

describe("useConfigStore", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // ===== loadConfig =====

  it("loadConfig で設定を取得できること", async () => {
    mockedInvoke.mockResolvedValueOnce(defaultConfig);

    await useConfigStore.getState().loadConfig();

    expect(mockedInvoke).toHaveBeenCalledWith("get_config");
    expect(useConfigStore.getState().config.language).toBe("ja");
    expect(useConfigStore.getState().isLoaded).toBe(true);
  });

  // ===== saveConfig =====

  it("saveConfig で部分更新できること", async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);

    await useConfigStore.getState().saveConfig({ language: "en" });

    expect(mockedInvoke).toHaveBeenCalledWith("save_config", {
      config: expect.objectContaining({ language: "en" }),
    });
    expect(useConfigStore.getState().config.language).toBe("en");
  });

  it("saveConfig で minimapEnabled を変更できること", async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);

    await useConfigStore.getState().saveConfig({ minimapEnabled: false });

    expect(useConfigStore.getState().config.minimapEnabled).toBe(false);
  });

  // ===== language =====

  it("言語を en に切り替えると config.language が変わること", async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);

    await useConfigStore.getState().saveConfig({ language: "en" });

    expect(useConfigStore.getState().config.language).toBe("en");
  });
});
