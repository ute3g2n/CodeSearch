import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SearchResult, HistoryEntry, IndexStatus } from "../../src/ipc/types";

// IPC コマンドをモック
vi.mock("../../src/ipc/commands", () => ({
  searchFulltext: vi.fn(),
  buildIndex: vi.fn(),
  getIndexStatus: vi.fn(),
  getSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
}));

import * as commands from "../../src/ipc/commands";
import { useSearchStore } from "../../src/stores/search";

// テスト用データ
const mockResult: SearchResult = {
  groups: [
    {
      filePath: "/workspace/main.rs",
      relativePath: "main.rs",
      matches: [
        {
          lineNumber: 1,
          lineContent: "fn main() {}",
          matchRanges: [[0, 2]],
        },
      ],
    },
  ],
  totalMatches: 1,
  elapsedMs: 10,
};

const mockHistory: HistoryEntry[] = [
  {
    id: 1,
    workspaceId: "ws1",
    query: "fn main",
    isRegex: false,
    caseSensitive: false,
    wholeWord: false,
    includeGlob: null,
    excludeGlob: null,
    resultCount: 1,
    searchedAt: "2024-01-01T00:00:00",
  },
];

const mockStatus: IndexStatus = {
  state: "ready",
  documentCount: 100,
  lastBuiltAt: "2024-01-01T00:00:00Z",
  errorMessage: null,
};

// ストアをリセットするヘルパー
function resetStore() {
  useSearchStore.setState({
    query: "",
    options: {
      caseSensitive: false,
      wholeWord: false,
      isRegex: false,
      includeGlob: null,
      excludeGlob: null,
      maxResults: null,
    },
    result: null,
    isSearching: false,
    error: null,
    history: [],
    indexStatus: {
      state: "idle",
      documentCount: 0,
      lastBuiltAt: null,
      errorMessage: null,
    },
    isBuilding: false,
    collapsedGroups: new Set<string>(),
  });
}

describe("useSearchStore", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // ===== setQuery =====

  it("setQuery でクエリを更新できること", () => {
    useSearchStore.getState().setQuery("hello");
    expect(useSearchStore.getState().query).toBe("hello");
  });

  // ===== setOptions =====

  it("setOptions で部分的にオプションを更新できること", () => {
    useSearchStore.getState().setOptions({ caseSensitive: true });
    const opts = useSearchStore.getState().options;
    expect(opts.caseSensitive).toBe(true);
    expect(opts.wholeWord).toBe(false); // 他はそのまま
  });

  it("setOptions で複数オプションを同時に更新できること", () => {
    useSearchStore.getState().setOptions({ isRegex: true, wholeWord: true });
    const opts = useSearchStore.getState().options;
    expect(opts.isRegex).toBe(true);
    expect(opts.wholeWord).toBe(true);
  });

  // ===== executeSearch =====

  it("executeSearch で検索結果が設定されること", async () => {
    vi.mocked(commands.searchFulltext).mockResolvedValue(mockResult);
    useSearchStore.getState().setQuery("fn");
    await useSearchStore.getState().executeSearch();

    const state = useSearchStore.getState();
    expect(state.result).toEqual(mockResult);
    expect(state.isSearching).toBe(false);
    expect(state.error).toBeNull();
  });

  it("executeSearch でクエリが空の場合は検索しないこと", async () => {
    useSearchStore.getState().setQuery("");
    await useSearchStore.getState().executeSearch();

    expect(commands.searchFulltext).not.toHaveBeenCalled();
    expect(useSearchStore.getState().result).toBeNull();
  });

  it("executeSearch でエラー発生時にエラーメッセージが設定されること", async () => {
    vi.mocked(commands.searchFulltext).mockRejectedValue({
      code: "INDEX_ERROR",
      message: "インデックスが未構築です",
    });
    useSearchStore.getState().setQuery("test");
    await useSearchStore.getState().executeSearch();

    const state = useSearchStore.getState();
    expect(state.error).toBe("インデックスが未構築です");
    expect(state.result).toBeNull();
    expect(state.isSearching).toBe(false);
  });

  // ===== clearResult =====

  it("clearResult でクエリと結果がリセットされること", async () => {
    vi.mocked(commands.searchFulltext).mockResolvedValue(mockResult);
    useSearchStore.getState().setQuery("fn");
    await useSearchStore.getState().executeSearch();

    useSearchStore.getState().clearResult();
    const state = useSearchStore.getState();
    expect(state.result).toBeNull();
    expect(state.query).toBe("");
    expect(state.error).toBeNull();
  });

  // ===== loadHistory =====

  it("loadHistory で検索履歴が読み込まれること", async () => {
    vi.mocked(commands.getSearchHistory).mockResolvedValue(mockHistory);
    await useSearchStore.getState().loadHistory("ws1");

    expect(useSearchStore.getState().history).toEqual(mockHistory);
  });

  it("loadHistory が失敗してもエラーにならないこと", async () => {
    vi.mocked(commands.getSearchHistory).mockRejectedValue(
      new Error("DB error")
    );
    await expect(
      useSearchStore.getState().loadHistory("ws1")
    ).resolves.not.toThrow();
  });

  // ===== removeHistory =====

  it("removeHistory で指定IDの履歴が削除されること", () => {
    useSearchStore.setState({ history: mockHistory });
    useSearchStore.getState().removeHistory(1);
    expect(useSearchStore.getState().history).toHaveLength(0);
  });

  // ===== clearHistory =====

  it("clearHistory で全履歴がクリアされること", async () => {
    vi.mocked(commands.clearSearchHistory).mockResolvedValue();
    useSearchStore.setState({ history: mockHistory });
    await useSearchStore.getState().clearHistory("ws1");

    expect(commands.clearSearchHistory).toHaveBeenCalledWith("ws1");
    expect(useSearchStore.getState().history).toHaveLength(0);
  });

  // ===== loadIndexStatus =====

  it("loadIndexStatus でインデックス状態が更新されること", async () => {
    vi.mocked(commands.getIndexStatus).mockResolvedValue(mockStatus);
    await useSearchStore.getState().loadIndexStatus();

    expect(useSearchStore.getState().indexStatus).toEqual(mockStatus);
  });

  // ===== buildWorkspaceIndex =====

  it("buildWorkspaceIndex でインデックス構築後にステータスが更新されること", async () => {
    vi.mocked(commands.buildIndex).mockResolvedValue(200);
    vi.mocked(commands.getIndexStatus).mockResolvedValue(mockStatus);

    await useSearchStore.getState().buildWorkspaceIndex("/workspace", "ws1");

    const state = useSearchStore.getState();
    expect(state.isBuilding).toBe(false);
    expect(state.indexStatus).toEqual(mockStatus);
  });

  it("buildWorkspaceIndex でエラー発生時にステータスがエラーになること", async () => {
    vi.mocked(commands.buildIndex).mockRejectedValue({
      code: "IO_ERROR",
      message: "ファイルが読めません",
    });

    await useSearchStore.getState().buildWorkspaceIndex("/workspace", "ws1");

    const state = useSearchStore.getState();
    expect(state.isBuilding).toBe(false);
    expect(state.indexStatus.state).toBe("error");
    expect(state.indexStatus.errorMessage).toContain("ファイルが読めません");
  });

  // ===== toggleGroupCollapse =====

  it("toggleGroupCollapse でグループの折りたたみ状態がトグルされること", () => {
    // 最初は折りたたまれていない
    expect(useSearchStore.getState().collapsedGroups.has("/workspace/a.ts")).toBe(false);

    // 1回目: 折りたたむ
    useSearchStore.getState().toggleGroupCollapse("/workspace/a.ts");
    expect(useSearchStore.getState().collapsedGroups.has("/workspace/a.ts")).toBe(true);

    // 2回目: 展開する
    useSearchStore.getState().toggleGroupCollapse("/workspace/a.ts");
    expect(useSearchStore.getState().collapsedGroups.has("/workspace/a.ts")).toBe(false);
  });

  it("toggleGroupCollapse で複数グループを独立してトグルできること", () => {
    useSearchStore.getState().toggleGroupCollapse("/workspace/a.ts");
    useSearchStore.getState().toggleGroupCollapse("/workspace/b.ts");

    const { collapsedGroups } = useSearchStore.getState();
    expect(collapsedGroups.has("/workspace/a.ts")).toBe(true);
    expect(collapsedGroups.has("/workspace/b.ts")).toBe(true);

    // a.ts のみ展開
    useSearchStore.getState().toggleGroupCollapse("/workspace/a.ts");
    expect(useSearchStore.getState().collapsedGroups.has("/workspace/a.ts")).toBe(false);
    expect(useSearchStore.getState().collapsedGroups.has("/workspace/b.ts")).toBe(true);
  });
});
