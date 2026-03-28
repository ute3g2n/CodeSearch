// 検索ストア（Zustand）
// 検索オプション・結果・履歴・インデックス状態を管理する
import { create } from "zustand";
import type {
  HistoryEntry,
  IndexStatus,
  SearchOptions,
  SearchResult,
} from "../ipc/types";
import {
  buildIndex,
  clearSearchHistory,
  getIndexStatus,
  getSearchHistory,
  searchFulltext,
} from "../ipc/commands";

// 検索ストアの状態
interface SearchState {
  // 現在の検索クエリ
  query: string;
  // 検索オプション
  options: SearchOptions;
  // 検索結果
  result: SearchResult | null;
  // 検索中フラグ
  isSearching: boolean;
  // 検索エラーメッセージ
  error: string | null;
  // 検索履歴
  history: HistoryEntry[];
  // インデックス状態
  indexStatus: IndexStatus;
  // インデックス構築中フラグ
  isBuilding: boolean;
  // 折りたたまれているグループの filePath セット
  collapsedGroups: Set<string>;

  // アクション
  setQuery: (query: string) => void;
  toggleGroupCollapse: (filePath: string) => void;
  setOptions: (options: Partial<SearchOptions>) => void;
  executeSearch: () => Promise<void>;
  clearResult: () => void;
  loadHistory: (workspaceId: string) => Promise<void>;
  removeHistory: (id: number) => void;
  clearHistory: (workspaceId: string) => Promise<void>;
  loadIndexStatus: () => Promise<void>;
  buildWorkspaceIndex: (
    workspaceRoot: string,
    workspaceId: string
  ) => Promise<void>;
}

// SearchOptions のデフォルト値
const DEFAULT_OPTIONS: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  isRegex: false,
  includeGlob: null,
  excludeGlob: null,
  maxResults: null,
};

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  options: { ...DEFAULT_OPTIONS },
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

  setQuery: (query) => set({ query }),

  toggleGroupCollapse: (filePath) =>
    set((s) => {
      const next = new Set(s.collapsedGroups);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return { collapsedGroups: next };
    }),

  setOptions: (options) =>
    set((s) => ({ options: { ...s.options, ...options } })),

  executeSearch: async () => {
    const { query, options } = get();
    if (!query.trim()) {
      set({ result: null, error: null });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const result = await searchFulltext(query, options);
      set({ result, isSearching: false });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "検索に失敗しました";
      set({ isSearching: false, error: msg, result: null });
    }
  },

  clearResult: () => set({ result: null, error: null, query: "" }),

  loadHistory: async (workspaceId) => {
    try {
      const history = await getSearchHistory(workspaceId, 50);
      set({ history });
    } catch {
      // 履歴取得失敗は無視（サイレントフェール）
    }
  },

  removeHistory: (id) =>
    set((s) => ({ history: s.history.filter((h) => h.id !== id) })),

  clearHistory: async (workspaceId) => {
    await clearSearchHistory(workspaceId);
    set({ history: [] });
  },

  loadIndexStatus: async () => {
    try {
      const indexStatus = await getIndexStatus();
      set({ indexStatus });
    } catch {
      // 無視
    }
  },

  buildWorkspaceIndex: async (workspaceRoot, workspaceId) => {
    set({ isBuilding: true });
    try {
      await buildIndex(workspaceRoot, workspaceId);
      const indexStatus = await getIndexStatus();
      set({ isBuilding: false, indexStatus });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "インデックス構築に失敗しました";
      set({
        isBuilding: false,
        indexStatus: {
          state: "error",
          documentCount: 0,
          lastBuiltAt: null,
          errorMessage: msg,
        },
      });
    }
  },
}));
